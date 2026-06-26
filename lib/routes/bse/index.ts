import { config } from '@/config';
import InvalidParameterError from '@/errors/types/invalid-parameter';
import type { DataItem, Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';
import timezone from '@/utils/timezone';

const nodes = {
    important_news: {
        id: 1289,
        title: '本所要闻',
        url: '/news/important_news.html',
        type: '/info/listse',
    },
    news_list: {
        id: 2676,
        title: '业务通知',
        url: '/news/news_list.html',
        type: '/info/listse',
    },
    public_opinion: {
        id: 1307,
        title: '公开征求意见',
        url: '/rule/public_opinion.html',
        type: '/info/listse',
    },
    fxrz_list: {
        id: 1302,
        title: '发行融资',
        url: '/business/fxrz_list.html',
        type: '/info/listse',
    },
    cxjg_list: {
        id: 1303,
        title: '持续监管',
        url: '/business/cxjg_list.html',
        type: '/info/listse',
    },
    jygl_list: {
        id: 1304,
        title: '交易管理',
        url: '/business/jygl_list.html',
        type: '/info/listse',
    },
    scgl_list: {
        id: 1306,
        title: '市场管理',
        url: '/business/scgl_list.html',
        type: '/info/listse',
    },
};

export const route: Route = {
    path: '/:category?/:keyword?',
    categories: ['finance'],
    example: '/bse',
    parameters: { category: '分类，见下表，默认为本所要闻', keyword: '关键字，默认为空' },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['bse.cn/'],
        },
    ],
    name: '栏目',
    maintainers: ['nczitzk'],
    handler,
    url: 'bse.cn/',
    description: `| 本所要闻        | 业务通知   | 公开征求意见    | 发行融资   |
| --------------- | ---------- | --------------- | ---------- |
| important\\_news | news\\_list | public\\_opinion | fxrz\\_list |

| 持续监管   | 交易管理   | 市场管理   |
| ---------- | ---------- | ---------- |
| cxjg\\_list | jygl\\_list | scgl\\_list |`,
};

async function handler(ctx) {
    const category = ctx.req.param('category') ?? 'important_news';
    const keyword = ctx.req.param('keyword') ?? '';

    const node = nodes[category];
    if (!node) {
        throw new InvalidParameterError(`Invalid category: ${category}`);
    }

    const type = node.type;
    const rootUrl = 'https://www.bse.cn';
    const currentUrl = `${rootUrl}${type}.do`;

    const response = await got({
        method: 'post',
        url: currentUrl,
        headers: {
            'User-Agent': config.trueUA,
            Referer: `${rootUrl}${node.url}`,
            'X-Requested-With': 'XMLHttpRequest',
        },
        form: {
            page: 0,
            pageSize: ctx.req.query('limit') ? Number.parseInt(ctx.req.query('limit')) : 50,
            keywords: keyword,
            'nodeIds[]': node.id,
        },
    });

    const data = JSON.parse(response.data.match(/null\(\[(\{.*\})\]\)/)[1]);

    const items: DataItem[] = data.data.content.map((item) => ({
        title: item.title,
        category: item.tags,
        description: item.text,
        link: `${rootUrl}${item.htmlUrl}`,
        pubDate: timezone(parseDate(item.publishDate), 8),
    }));

    return {
        title: `${node.title} - 北京证券交易所`,
        link: `${rootUrl}${node.url}`,
        item: items,
        allowEmpty: true,
    };
}
