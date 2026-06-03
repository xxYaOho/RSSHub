import { isIP } from 'node:net';

import { config } from '@/config';
import type { Data, DataItem, Route } from '@/types';
import parser from '@/utils/rss-parser';

const blockedHosts = new Set(['localhost', '0.0.0.0']);
const blockedIPv6Prefixes = ['::1', 'fe80:', 'fc00:', 'fd'];

function isPrivateIP(hostname: string): boolean {
    if (blockedHosts.has(hostname)) {
        return true;
    }
    const ipVersion = isIP(hostname);
    if (ipVersion === 4) {
        const parts = hostname.split('.').map(Number);
        if (parts[0] === 127 || parts[0] === 10) {
            return true;
        }
        if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
            return true;
        }
        if (parts[0] === 192 && parts[1] === 168) {
            return true;
        }
        if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) {
            return true;
        }
    } else if (ipVersion === 6) {
        const lower = hostname.toLowerCase();
        for (const prefix of blockedIPv6Prefixes) {
            if (lower.startsWith(prefix)) {
                return true;
            }
        }
    }
    return false;
}

export const route: Route = {
    path: '/rss',
    categories: ['other'],
    example: '/proxy/rss?url=https://www.seangoedecke.com/rss.xml',
    parameters: {
        url: 'External RSS/Atom feed URL',
    },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    name: 'RSS Proxy',
    maintainers: ['xxYaOho'],
    handler,
};

async function handler(ctx): Promise<Data> {
    let rawUrl = ctx.req.query('url');
    if (!rawUrl) {
        throw new Error('Missing required query parameter: url');
    }

    // Decode if the URL is percent-encoded
    try {
        rawUrl = decodeURIComponent(rawUrl);
    } catch {
        // use as-is
    }

    const parsed = new URL(rawUrl);

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('Only http and https URLs are allowed');
    }

    if (isPrivateIP(parsed.hostname)) {
        throw new Error('Proxying to private IP addresses is not allowed');
    }

    if (!config.feature.allow_user_supply_unsafe_domain) {
        // Additional safety: could add domain allowlist here
    }

    const feed = await parser.parseURL(rawUrl);

    const items: DataItem[] = (feed.items || []).map((item) => ({
        title: item.title || '',
        description: item['content:encoded'] || item.content || item.contentSnippet || item.summary || '',
        link: item.link,
        pubDate: item.pubDate || item.isoDate,
        author: item.author || item.creator,
        category: item.categories,
        guid: item.guid,
        enclosure_url: item.enclosure?.url,
        enclosure_type: item.enclosure?.type,
    }));

    return {
        title: feed.title || 'RSS Proxy',
        link: feed.link || parsed.origin,
        description: feed.description || `Proxied feed from ${rawUrl}`,
        language: feed.language || 'en',
        image: feed.image?.url,
        item: items,
    };
}
