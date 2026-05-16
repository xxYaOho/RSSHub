import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import ofetch from '@/utils/ofetch';

import { getArticleDetail } from './utils';

export const route: Route = {
    path: '/archives/:tag?',
    categories: ['design'],
    example: '/uisdc/archives',
    parameters: { tag: '标签 slug，可选。如 aigc, ui设计。留空获取全部分类' },
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
            source: ['uisdc.com/archives'],
            target: '/archives',
        },
    ],
    name: '设计文章',
    maintainers: ['YangTao'],
    handler,
};

async function handler(ctx) {
    const tag = ctx.req.param('tag');
    const baseUrl = tag ? `https://www.uisdc.com/tag/${tag}` : 'https://www.uisdc.com/archives';

    const response = await ofetch(baseUrl);
    const $ = load(response);

    const list = $('.post-item')
        .toArray()
        .map((el) => {
            const $el = $(el);
            const a = $el.find('a').first();
            const title = $el.find('h4').text().trim();
            const link = a.attr('href') || '';
            const thumb = $el.find('.thumb').attr('style') || '';
            const imgMatch = thumb.match(/url\(([^)]+)\)/);

            return { title, link, image: imgMatch ? imgMatch[1] : undefined };
        })
        .filter((item) => item.link);

    const items: DataItem[] = await Promise.all(
        list.map(async (item) => {
            const detail = await getArticleDetail(item.link);
            return {
                title: item.title,
                link: item.link,
                description: item.image ? `<img src="${item.image}"><br>${detail.description}` : detail.description,
                pubDate: detail.pubDate,
                author: detail.author,
            };
        })
    );

    return {
        title: tag ? `优设网 - ${tag}` : '优设网 - 设计文章',
        link: baseUrl,
        description: tag ? `优设网标签「${tag}」下的设计文章` : '优设网最新设计文章',
        item: items,
    };
}
