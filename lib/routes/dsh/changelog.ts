import { load } from 'cheerio';

import type { Data, DataItem, Route } from '@/types';
import logger from '@/utils/logger';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

const repo = 'deepseek-ai/deepseek-harness';
const repoUrl = `https://github.com/${repo}`;
const releasesApi = `https://api.github.com/repos/${repo}/releases?per_page=100`;
const tagPathMarker = '/releases/tag/';

// releases.atom carries an entry for every tag that has no published release yet (title = tag name,
// content = tag message, e.g. torvalds/linux with 0 releases and 10 tag entries), on top of the
// entries of published releases. The release automation of this repo pushes the tag together with a
// draft release and only publishes it - with the real notes - 10 minutes to 2 hours later, so inside
// that window the feed announces a "release" whose body is just the tag message
// ("release(dsh): 0.2.1-alpha.2") or, for lightweight tags, the merge subject of the release PR
// ("Merge pull request #1234 from ..."). Once such an entry reaches a feed reader it stays there,
// because its guid is the (unchanged) release URL. The public releases API lists published releases
// only, so cross-check every entry against it.
const commitSubjectPattern = /^Merge (?:pull request|branch|remote-tracking branch)\b/;
const automationPlaceholderPattern = /^release\([^)]+\):\s*\S+$/;

const isPlaceholderBody = (html: string): boolean => {
    const text = html.replaceAll(/<[^>]+>/g, '').trim();
    return commitSubjectPattern.test(text) || automationPlaceholderPattern.test(text);
};

const tagOf = (link: string): string => (link.includes(tagPathMarker) ? (link.split(tagPathMarker, 2)[1]?.split(/[?#]/, 1)[0] ?? '') : '');

const fetchPublishedTags = async (): Promise<undefined | Set<string>> => {
    try {
        const releases = await ofetch<Array<{ tag_name: string }>>(releasesApi);
        return new Set(releases.map((release) => release.tag_name));
    } catch (error) {
        // Fall back to the body filter instead of swallowing every entry.
        logger.warn(`dsh/changelog: failed to list published releases: ${(error as Error).message}`);
        return undefined;
    }
};

const handler = async (): Promise<Data> => {
    // GitHub serves a public Atom feed for releases; entry content is the release notes as HTML
    const [response, publishedTags] = await Promise.all([ofetch(`${repoUrl}/releases.atom`, { parseResponse: (txt) => txt }), fetchPublishedTags()]);
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
        .filter((item) => !isPlaceholderBody(item.description ?? '') && (!publishedTags || publishedTags.has(tagOf(item.link ?? ''))));

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
