/**
 * 本 fork 自开发内容清单，供 /dashboard 页面使用。
 * 与 docs/simple-wiki/wiki/custom-routes.md 保持同步：新增自研路由时两处各加一行。
 */

/** 自研命名空间（lib/routes 下本 fork 新增的目录） */
export const selfDevelopedNamespaces: string[] = ['bangumi.online', 'chatgpt', 'claude', 'humanlayer', 'kimicode', 'mwm', 'proxy', 'runyeah', 'uisdc'];

/** 对上游路由的本地修改（路由与上游一致，只标注改动点） */
export const locallyModifiedNamespaces: Array<{ namespace: string; note: string }> = [
    {
        namespace: 'sspai',
        note: '图片 <img> 的 CDN URL 改写为 /sspai/image-proxy 代理，绕过防盗链并压缩为 800px WebP；修复 tag.ts 的 description 未初始化；cdn.sspai.com → cdnfile.sspai.com。',
    },
];
