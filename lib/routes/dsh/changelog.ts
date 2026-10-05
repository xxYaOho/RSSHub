import { load } from 'cheerio';

import type { Data, DataItem, Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

const repoUrl = 'https://github.com/deepseek-ai/deepseek-harness';

// GitHub occasionally keeps a stale entry in releases.atom for a release that was deleted
// or unpublished; its <content> is just the merge commit subject written by release automation
// (e.g. "Merge pull request #1234 from ..."), and the linked tag page 404s. Drop those.
const commitSubjectPattern = /^Merge (?:pull request|branch|remote-tracking branch)\b/;

const isCommitSubjectBody = (html: string): boolean => commitSubjectPattern.test(html.replaceAll(/<[^>]+>/g, '').trim());

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
        })
        .filter((item) => !isCommitSubjectBody(item.description ?? ''));

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
    // No radar rules on purpose: the source page lives on github.com, a domain already
    // claimed by the upstream `github` namespace. Registering a radar source here would
    // make this fork namespace own github.com's domain metadata (`_name`) and break
    // lib/api/radar/rules/one.test.ts.
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportRadar: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
};
