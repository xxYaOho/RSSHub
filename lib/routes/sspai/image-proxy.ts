import type { Route } from '@/types';
import cache from '@/utils/cache';

export const route: Route = {
    path: '/image-proxy',
    categories: ['new-media'],
    example: '/sspai/image-proxy?url=https%3A%2F%2Fcdnfile.sspai.com%2Fimage.png',
    parameters: { url: 'cdnfile.sspai.com 图片完整 URL' },
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [],
    name: '少数派图片代理',
    maintainers: ['xxYaOho'],
    handler,
};

function contentTypeFromUrl(url: string): string {
    if (url.includes('/format/webp')) {
        return 'image/webp';
    }
    const ext = url.split('.').pop()?.split('?')[0]?.toLowerCase();
    switch (ext) {
        case 'png':
            return 'image/png';
        case 'jpg':
        case 'jpeg':
            return 'image/jpeg';
        case 'webp':
            return 'image/webp';
        case 'gif':
            return 'image/gif';
        case 'svg':
            return 'image/svg+xml';
        default:
            return 'image/jpeg';
    }
}

function optimizeImageUrl(imageUrl: string): string {
    const u = new URL(imageUrl);
    if (u.search && u.search.includes('imageView2')) {
        u.search = u.search
            .replace(/\/w\/\d+/, '/w/800')
            .replace(/\/q\/\d+/, '/q/80')
            .replace(/\/format\/\w+/, '');
        if (!u.search.endsWith('/format/webp')) {
            u.search += '/format/webp';
        }
    } else {
        u.search = 'imageView2/2/w/800/q/80/interlace/1/ignore-error/1/format/webp';
    }
    return u.toString();
}

async function handler(ctx) {
    const imageUrl = ctx.req.query('url');
    if (!imageUrl) {
        return new Response('Missing url parameter', { status: 400 });
    }

    let url: URL;
    try {
        url = new URL(imageUrl);
    } catch {
        return new Response('Invalid URL', { status: 400 });
    }

    if (url.hostname !== 'cdnfile.sspai.com') {
        return new Response('Invalid image host', { status: 403 });
    }

    const upstreamUrl = optimizeImageUrl(imageUrl);
    const key = `sspai-image-proxy:${imageUrl}`;
    const result = await cache.tryGet(key, async () => {
        const response = await fetch(upstreamUrl, {
            headers: {
                Referer: 'https://sspai.com/',
                Accept: 'image/webp,image/*',
            },
        });
        if (!response.ok) {
            throw new Error(`Upstream returned ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer).toString('base64');
    });

    if (!result) {
        return new Response('Image not found', { status: 404 });
    }

    return new Response(Buffer.from(result, 'base64'), {
        headers: {
            'Content-Type': contentTypeFromUrl(upstreamUrl),
            'Cache-Control': 'public, max-age=86400',
        },
    });
}
