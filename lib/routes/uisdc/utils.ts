import { load } from 'cheerio';

import cache from '@/utils/cache';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

export interface ArticleDetail {
    description: string;
    pubDate?: Date;
    author?: string;
}

async function fetchDetail(link: string): Promise<ArticleDetail> {
    const response = await ofetch(link);
    const $ = load(response);

    const description = $('.entry-content').html() || $('.article-content').html() || $('.post-content').html() || '';

    const jsonLd = $('script[type="application/ld+json"]').text();
    let pubDate: Date | undefined;
    if (jsonLd) {
        try {
            const parsed = JSON.parse(jsonLd);
            if (parsed.datePublished) {
                pubDate = parseDate(parsed.datePublished);
            }
        } catch {
            // ignore parse error
        }
    }
    if (!pubDate) {
        const metaDate = $('meta[property="article:published_time"]').attr('content');
        if (metaDate) {
            pubDate = parseDate(metaDate);
        }
    }

    const author = $('meta[name="author"]').attr('content') || $('a[rel="author"]').first().text().trim() || undefined;

    return { description, pubDate, author };
}

export function getArticleDetail(link: string): Promise<ArticleDetail> {
    return cache.tryGet(`uisdc:${link}`, () => fetchDetail(link));
}
