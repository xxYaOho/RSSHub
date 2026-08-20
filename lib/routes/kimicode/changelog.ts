import type { CheerioAPI } from 'cheerio';
import { load } from 'cheerio';
import type { Context } from 'hono';

import type { Data, DataItem, Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

const languageMap: Record<string, string> = {
    zh: 'Kimi Code 更新日志',
    en: 'Kimi Code Changelog',
};

// Version heading id, e.g. _0-37-2-2026-08-19 (identical across languages)
const versionIdPattern = /^_(?:\d+-)+\d{4}-\d{2}-\d{2}$/;

const handler = async (ctx: Context): Promise<Data> => {
    const language = ctx.req.param('language') ?? 'zh';
    const feedTitle = languageMap[language];
    if (!feedTitle) {
        throw new Error(`Invalid language: ${language}. Available languages: ${Object.keys(languageMap).join(', ')}`);
    }

    const targetUrl = `https://moonshotai.github.io/kimi-code/${language}/release-notes/changelog.html`;
    const response = await ofetch(targetUrl);
    const $: CheerioAPI = load(response);

    const items: DataItem[] = $('h2[id]')
        .toArray()
        .filter((el) => versionIdPattern.test($(el).attr('id') ?? ''))
        .map((el): DataItem => {
            const $h2 = $(el);
            const id = $h2.attr('id') as string;
            const segments = id.slice(1).split('-');
            const date = segments.slice(-3).join('-');
            const version = segments.slice(0, -3).join('.');
            const description = $h2
                .nextUntil('h2')
                .toArray()
                .map((sibling) => $(sibling).prop('outerHTML'))
                .join('');

            return {
                title: version,
                description,
                link: `${targetUrl}#${id}`,
                pubDate: parseDate(date),
            };
        });

    return {
        title: feedTitle,
        description: feedTitle,
        link: targetUrl,
        item: items,
        language: language === 'zh' ? 'zh-CN' : 'en',
    };
};

export const route: Route = {
    path: '/changelog/:language?',
    name: 'Changelog',
    url: 'moonshotai.github.io/kimi-code',
    maintainers: ['xxYaOho'],
    handler,
    example: '/kimicode/changelog',
    parameters: {
        language: 'Language, `zh` by default. Available: `zh`, `en`',
    },
    categories: ['program-update'],
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportRadar: true,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['moonshotai.github.io/kimi-code/zh/release-notes/changelog.html'],
            target: '/changelog/zh',
        },
        {
            source: ['moonshotai.github.io/kimi-code/en/release-notes/changelog.html'],
            target: '/changelog/en',
        },
    ],
};
