import type { CheerioAPI } from 'cheerio';
import { load } from 'cheerio';
import type { Context } from 'hono';

import type { Data, DataItem, Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

const typeMap: Record<string, string> = {
    all: 'All updates',
    general: 'General',
    'codex-app': 'ChatGPT desktop app',
    'codex-mobile': 'Remote',
    'codex-cli': 'Codex CLI',
};

const handler = async (ctx: Context): Promise<Data> => {
    const type = ctx.req.param('type') ?? 'all';
    const typeName = typeMap[type];
    if (!typeName) {
        throw new Error(`Invalid type: ${type}. Available types: ${Object.keys(typeMap).join(', ')}`);
    }

    const targetUrl = 'https://learn.chatgpt.com/docs/changelog';
    const response = await ofetch(targetUrl);
    const $: CheerioAPI = load(response);

    const items: DataItem[] = $('li[data-codex-topics]')
        .toArray()
        .filter((el) => type === 'all' || ($(el).attr('data-codex-topics') ?? '').split(',').includes(type))
        .map((el): DataItem => {
            const $entry = $(el);
            const anchor = $entry.attr('id');
            // The first h3 is the entry title; h3 elements inside article are section headings
            const title = $entry.find('h3').first().text().replaceAll(/\s+/g, ' ').trim();
            const dateText = $entry.find('time').first().text().trim();
            const description = $entry.find('article').first().html() ?? '';

            return {
                title,
                description,
                link: anchor ? `${targetUrl}#${anchor}` : targetUrl,
                pubDate: dateText ? parseDate(dateText) : undefined,
            };
        });

    return {
        title: `ChatGPT & Codex Changelog - ${typeName}`,
        description: 'Latest updates to ChatGPT and Codex',
        link: targetUrl,
        item: items,
    };
};

export const route: Route = {
    path: '/changelog/:type?',
    name: 'Changelog',
    url: 'learn.chatgpt.com',
    maintainers: ['xxYaOho'],
    handler,
    example: '/chatgpt/changelog',
    parameters: {
        type: 'Update type, `all` by default. Available: `all`, `general`, `codex-app` (ChatGPT desktop app), `codex-mobile` (Remote), `codex-cli` (Codex CLI)',
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
            source: ['learn.chatgpt.com/docs/changelog'],
            target: '/changelog',
        },
    ],
};
