import { load } from 'cheerio';

import type { DataItem, Route } from '@/types';
import cache from '@/utils/cache';
import logger from '@/utils/logger';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

interface ZhihuDailyStory {
    id: number;
    title: string;
    url: string;
    body?: string;
    image?: string;
    publish_time?: number;
    author?: {
        name: string;
    };
}

function convertRelativeToAbsolute(html: string, baseUrl: string): string {
    const $ = load(html);

    $('img').each((_, elem) => {
        const src = $(elem).attr('src');
        if (src && !src.startsWith('http') && !src.startsWith('//')) {
            $(elem).attr('src', new URL(src, baseUrl).href);
        }
    });

    $('a').each((_, elem) => {
        const href = $(elem).attr('href');
        if (href && !href.startsWith('http') && !href.startsWith('//')) {
            $(elem).attr('href', new URL(href, baseUrl).href);
        }
    });

    return $.html();
}

export const route: Route = {
    path: '/daily',
    categories: ['social-media'],
    example: '/zhihu/daily',
    parameters: {},
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: true,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['daily.zhihu.com/*'],
        },
    ],
    name: '知乎日报',
    maintainers: ['DHPO', 'pseudoyu'],
    handler,
    url: 'daily.zhihu.com/*',
};

async function handler() {
    const response = await ofetch('https://daily.zhihu.com/');

    const $ = load(response);

    const items: DataItem[] = (
        await Promise.all(
            $('.box')
                .toArray()
                .map(async (item) => {
                    const item$ = $(item);
                    const linkElem = item$.find('.link-button');
                    const storyUrl = 'https://daily.zhihu.com/api/4' + linkElem.attr('href');

                    try {
                        const storyJson = await cache.tryGet(storyUrl, async () => {
                            const res = await ofetch<ZhihuDailyStory>(storyUrl);
                            return res;
                        });

                        const processedContent = convertRelativeToAbsolute(storyJson.body ?? '', storyJson.url ?? storyUrl);

                        const author = storyJson.author?.name;
                        const authorFromBody =
                            author ??
                            (() => {
                                const $body = load(storyJson.body ?? '');
                                const authorElem = $body('.author').first();
                                return authorElem.length > 0 ? authorElem.text().replace(/，$/, '').trim() : undefined;
                            })();

                        return {
                            title: storyJson.title,
                            content: {
                                html: processedContent,
                                text: processedContent,
                            },
                            link: storyJson.url,
                            image: storyJson.image,
                            author: authorFromBody,
                            pubDate: storyJson.publish_time ? parseDate(storyJson.publish_time, 'X') : undefined,
                        } as DataItem;
                    } catch (error) {
                        logger.debug(`Failed to fetch story detail: ${storyUrl} - ${error instanceof Error ? error.message : String(error)}`);
                        return null;
                    }
                })
        )
    ).filter((item): item is DataItem => item !== null);

    return {
        title: '知乎日报',
        link: 'https://daily.zhihu.com',
        description: '每天3次，每次7分钟',
        image: 'http://static.daily.zhihu.com/img/new_home_v3/mobile_top_logo.png',
        item: items,
    };
}
