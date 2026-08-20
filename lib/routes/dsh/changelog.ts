import { load } from 'cheerio';

import type { Data, DataItem, Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

const repoUrl = 'https://github.com/deepseek-ai/deepseek-harness';

const handler = async (): Promise<Data> => {
    // GitHub serves a public Atom feed for releases; entry content is the release notes as HTML
    const response = await ofetch(`${repoUrl}/releases.atom`, { parseResponse: (txt) => txt });
    const $ = load(response, { xml: true });

    const items: DataItem[] = $('entry')
        .toArray()
        .map((el): DataItem => {
            const $entry = $(el);
            return {
                title: $entry.find('title').text().trim(),
                description: $entry.find('content').text(),
                link: $entry.find('link').attr('href'),
                pubDate: parseDate($entry.find('updated').text()),
            };
        });

    return {
        title: 'DeepSeek Harness Releases',
        description: 'deepseek-ai/deepseek-harness release notes',
        link: `${repoUrl}/releases`,
        item: items,
    };
};

export const route: Route = {
    path: '/changelog',
    name: 'Changelog',
    url: 'github.com/deepseek-ai/deepseek-harness/releases',
    maintainers: ['xxYaOho'],
    handler,
    example: '/dsh/changelog',
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
            source: ['github.com/deepseek-ai/deepseek-harness/releases'],
            target: '/changelog',
        },
    ],
};
