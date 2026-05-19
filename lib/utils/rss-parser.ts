import Parser from 'rss-parser';

import { config } from '@/config';

const parser = new Parser({
    customFields: {
        item: ['magnet', 'content:encoded'],
    },
    headers: {
        'User-Agent': config.ua,
    },
});

export default parser;
