import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import ofetch from '@/utils/ofetch';

import { getArticleDetail } from './utils';

export const route: Route = {
    path: '/group/:sort?',
    categories: ['design'],
    example: '/uisdc/group/latest',
    parameters: { sort: '排序方式: latest(最新) 或 hot(最热)，默认 latest' },
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
            source: ['uisdc.com/group'],
            target: '/group/latest',
        },
    ],
    name: '频道',
    maintainers: ['YangTao'],
    handler,
};

async function handler(ctx) {
    const sort = ctx.req.param('sort') || 'latest';
    const isHot = sort === 'hot';
    const baseUrl = isHot ? 'https://www.uisdc.com/group?od=hot' : 'https://www.uisdc.com/group';

    const response = await ofetch(baseUrl);
    const $ = load(response);

    const list = $('.g-item')
        .toArray()
        .map((el) => {
            const $el = $(el);
            const titleEl = $el.find('h2.g-title a');
            const title = titleEl.attr('title') || titleEl.text().trim();
            const link = titleEl.attr('href') || '';
            const img = $el.find('.g-image img').attr('src') || '';
            const authorEl = $el.find('.g-author .u-name');
            const author = authorEl.text().trim() || undefined;
            const tagEl = $el.find('.g-tag a.tag');
            const category = tagEl.text().trim() || undefined;

            return { title, link, img, author, category };
        })
        .filter((item) => item.link);

    const items: DataItem[] = await Promise.all(
        list.map(async (item) => {
            const detail = await getArticleDetail(item.link);
            return {
                title: item.title,
                link: item.link,
                description: item.img ? `<img src="${item.img}"><br>${detail.description}` : detail.description,
                pubDate: detail.pubDate,
                author: detail.author || item.author,
                category: item.category ? [item.category] : undefined,
            };
        })
    );

    return {
        title: isHot ? '优设9图 - 热门' : '优设9图 - 最新',
        link: baseUrl,
        description: isHot ? '优设9图频道最热知识卡片' : '优设9图频道最新知识卡片',
        item: items,
    };
}
