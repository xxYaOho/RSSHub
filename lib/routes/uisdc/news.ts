import type { DataItem, Route } from '@/types';
import ofetch from '@/utils/ofetch';

import { convertWikiLinks } from './utils';

export const route: Route = {
    path: '/news',
    categories: ['design'],
    example: '/uisdc/news',
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [{ source: ['uisdc.com/news'] }],
    name: '每日要闻',
    maintainers: ['YangTao'],
    handler,
};

interface DubaoItem {
    title: string;
    url: string;
    content: string;
    images: string;
}

interface DubaoDay {
    id: number;
    time: number;
    dubao: DubaoItem[];
}

async function handler() {
    const response = await ofetch('https://www.uisdc.com/news');
    const match = response.match(/var uisdc_news = "(.+?)";/s);
    if (!match) {
        return { title: '优设读报', link: 'https://www.uisdc.com/news', item: [] };
    }

    const decoded = JSON.parse(`"${match[1]}"`);
    const days: DubaoDay[] = JSON.parse(decoded);

    const items: DataItem[] = [];
    for (const day of days) {
        const pubDate = new Date(day.time * 1000);
        for (const item of day.dubao) {
            const img = item.images?.split('|').find(Boolean) || '';
            const description = img ? `<img src="${img}"><br>${convertWikiLinks(item.content)}` : convertWikiLinks(item.content);

            items.push({
                title: item.title,
                description,
                link: item.url || 'https://www.uisdc.com/news',
                pubDate,
                guid: `uisdc-news-${day.id}-${item.title}`,
            });
        }
    }

    return {
        title: '优设读报',
        link: 'https://www.uisdc.com/news',
        description: 'AIGC趋势和设计行业资讯一站知晓',
        item: items,
    };
}
