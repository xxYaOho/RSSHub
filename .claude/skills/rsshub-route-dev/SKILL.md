---
name: rsshub-route-dev
description: >
    RSSHub 订阅源路由开发 SOP。当用户要求开发新的 RSS 订阅源、修复过期路由、为某个网站添加 RSS 支持时触发。覆盖从站点调研、数据源选择、代码实现到本地测试的完整流程。也用于探索目标网站的数据结构以评估开发可行性。
---

# RSSHub Route Development

为 RSSHub 开发新的订阅源路由,或将现有路由从过期的 HTML 抓取迁移到可用的数据源。

## 核心原则

**数据源优先级**: 内嵌 JSON > REST API > 静态 HTML > JS 动态渲染

每多一层复杂度,维护成本翻倍。优先找最简单可靠的数据源。

## Phase 1: 调研目标站点

### 1.1 检查 REST API

对 WordPress 站点,先试 `/wp-json/wp/v2/posts`:

```bash
curl -s -o /dev/null -w "%{http_code}" https://目标站点/wp-json/wp/v2/posts?per_page=3&_embed=1
```

如果 200,直接走 API。参考 `lib/routes/wordpress/` 或 `lib/routes/landiannews/`。

### 1.2 检查内嵌 JSON

用 WebFetch 或 Playwright 查看页面源码,搜索:

- `var xxx = "` — WordPress 主题常用 `JSON.stringify` + `json_encode` 双层编码在 `<script>` 中嵌入数据
- `window.__INITIAL_STATE__` — SPA 框架
- `<script type="application/json">` — JSON 数据块
- `script[type="application/ld+json"]` — 结构化数据 (日期、作者)

### 1.3 用 Playwright 确认真实 DOM

静态 HTML 缺失内容时 (如 cheero 选中元素数为 0):

```js
// browser_evaluate: 查看原始 HTML 中是否有关键 class
document.querySelector('.target-class').length;
```

如果 Playwright 能看到但 `ofetch` + `cheerio` 看不到 → JS 动态渲染 → 考虑 `requirePuppeteer: true`。

### 1.4 检查 RSS Feed

```bash
curl -s https://目标站点/feed | head -20
curl -s https://目标站点/rss | head -20
```

部分 WordPress 站点的 `/feed/` 可用,但注意部分站点会重定向到普通页面。

## Phase 2: 选择数据提取策略

### 策略 A: 内嵌 JSON (最优)

适用于 `<script>var xxx = "[{...}]"</script>` 模式。用正则提取后双层 `JSON.parse` 解码:

```ts
const response = await ofetch(url);
const match = response.match(/var dataName = "(.+?)";/s);
if (match) {
    const decoded = JSON.parse(`"${match[1]}"`); // 第一层: 解 JS string escape
    const data = JSON.parse(decoded); // 第二层: 解 JSON
}
```

### 策略 B: REST API

用 `ofetch` 直接调 API。需要 `_embed` 参数获取关联数据:

```ts
const apiUrl = `${rootUrl}/wp-json/wp/v2/posts?_embed=wp:term,author&per_page=20`;
const posts = await ofetch(apiUrl);
// posts[0].title.rendered, posts[0].content.rendered, posts[0].date_gmt
// posts[0]._embedded.author, posts[0]._embedded['wp:term']
```

Taxonomy 过滤需要两步: slug→ID 查询,再用 ID 过滤:

```ts
const { id } = (await ofetch(`${rootUrl}/wp-json/wp/v2/tags?slug=${tag}`))[0];
const posts = await ofetch(`${rootUrl}/wp-json/wp/v2/posts?tags=${id}&_embed`);
```

### 策略 C: 静态 HTML + cheerio

列表页提取 title/link,详情页补全 date/description:

```ts
const $ = load(await ofetch(listUrl));
const items = $('.item-selector')
    .toArray()
    .map((el) => ({
        title: $(el).find('.title').text().trim(),
        link: $(el).find('a').attr('href'),
    }));
// 详情页补全
const full = await Promise.all(
    items.map((item) =>
        cache.tryGet(`site:${item.link}`, async () => {
            const $$ = load(await ofetch(item.link));
            return {
                ...item,
                description: $$('.entry-content').html(),
                pubDate: parseDate($$('meta[property="article:published_time"]').attr('content')),
            };
        })
    )
);
```

### 策略 D: JS 动态渲染 (最后手段)

需要 `requirePuppeteer: true`,用 Playwright 启动浏览器抓取。参考 `AGENTS.md` 中的 Puppeteer 规范。

## Phase 3: 创建路由文件

### 文件结构

```
lib/routes/<namespace>/
├── namespace.ts    # 网站元信息
├── <route>.ts      # 路由定义 + handler
└── utils.ts        # (可选) 共享工具: 详情页抓取、公共常量等
```

### namespace.ts

```ts
import type { Namespace } from '@/types';
export const namespace: Namespace = {
    name: '网站名',
    url: 'example.com', // 不带 https://
    lang: 'zh-CN',
};
```

### <route>.ts 模板

```ts
import type { Route, DataItem } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';
import cache from '@/utils/cache';
import { load } from 'cheerio';

export const route: Route = {
    path: '/path/:param?',
    categories: ['design'], // 从 lib/types.ts 的 Category 联合类型中选一个
    example: '/namespace/path/example',
    parameters: { param: '参数说明' },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [{ source: ['example.com/path'] }],
    name: '路由名称',
    maintainers: ['YangTao'],
    handler,
};

async function handler(ctx) {
    const param = ctx.req.param('param');
    // ... 数据抓取逻辑 ...
    return {
        title: 'Feed 标题',
        link: '原文链接', // 人类可读页面,不是 API URL
        description: 'Feed 描述',
        item: items,
    };
}
```

### 详情页补全的共享 utils

如果多个路由都需要从详情页提取数据,抽到 `utils.ts`:

```ts
import cache from '@/utils/cache';
import { load } from 'cheerio';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

async function fetchDetail(link: string) {
    const $ = load(await ofetch(link));
    return {
        description: $('.entry-content').html() || '',
        pubDate: parseDate($('meta[property="article:published_time"]').attr('content')),
        author: $('meta[name="author"]').attr('content') || undefined,
    };
}

export const getArticleDetail = (link: string) => cache.tryGet(`ns:${link}`, () => fetchDetail(link));
```

## Phase 4: 本地测试

### 启动服务

```bash
pnpm dev
```

服务在 `http://localhost:1200`,Tailscale 内网在 `http://100.66.149.21:1200`。

### 测试路由

```bash
# 快速测试 HTTP 状态
curl -s --noproxy '*' -o /dev/null -w "%{http_code}" http://localhost:1200/<namespace>/<route>

# 查看 RSS 内容
curl -s --noproxy '*' http://localhost:1200/<namespace>/<route> | head -30
```

**注意 1**: `curl` 受系统代理环境变量影响,卡住时加 `--noproxy '*'`。

**注意 2**: Docker 容器和 dev server 都可能占 1200 端口。用 `lsof -i :1200` 确认谁在监听。Docker 容器不含本地新路由,开发时必须用 dev server。

### 调试技巧

```bash
# 直接通过 Hono app 测试 (不走网络,更快)
echo "
import app from './lib/app.js';
const r = await app.request('http://localhost/<ns>/<route>');
console.log('Status:', r.status);
console.log(await r.text());
" | pnpm tsx -
```

### 测试抓取逻辑

写临时脚本测试 cheerio 选择器,确认能选中元素后再写入路由:

```bash
pnpm tsx -e "
import { load } from 'cheerio';
import ofetch from './lib/utils/ofetch.js';
const \$ = load(await ofetch('https://目标URL'));
console.log('Items:', \$('.target-selector').length);
console.log(\$('.target-selector').first().html()?.substring(0, 200));
"
```

## 常见陷阱

- **cheerio `.next()`**: cheerio v1 中 `.next(selector)` 可能行为不同于 jQuery,过滤条件可能不生效
- **`\"` 转义**: HTML 的 `<script>` 中嵌入 JSON 时常有 `\"` 转义,需双层 `JSON.parse`
- **Docker vs dev server**: 本机 Docker 跑生产模式,不含本地新路由。开发时用 `pnpm dev`
- **代理干扰**: 系统 `http_proxy` 环境变量影响 `curl` 和 `ofetch`,本地测试加 `--noproxy '*'`
- **详情页抓取性能**: 40 个详情页逐个抓取会慢 (首次 7s+),`cache.tryGet()` 缓存后秒级响应
- **Node 版本**: 当前系统 Node 25,项目要求 ^22 或 ^24。`pnpm dev` 会有 warning 但不影响运行
- **`example` 格式**: 以 `/` 开头,是路由路径而非完整 URL
- **`radar[].source` 格式**: 不带 `https://` 前缀
- **不要往 `lib/router.js` 添加路由** — 已废弃,全走 namespace 目录
