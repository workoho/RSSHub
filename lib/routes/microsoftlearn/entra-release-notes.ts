import type { Route } from '@/types';
import parser from '@/utils/rss-parser';

export const route: Route = {
    path: '/entra/release-notes',
    name: 'Microsoft Entra Release Notes',
    categories: ['program-update'],
    example: '/microsoftlearn/entra/release-notes',
    maintainers: [],
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['learn.microsoft.com/en-us/entra/fundamentals/whats-new'],
            target: '/entra/release-notes',
        },
    ],
    handler: async () => {
        const feedUrl = 'https://learn.microsoft.com/api/search/rss?search=%22Release+notes+-+Azure+Active+Directory%22&locale=en-us';
        const feed = await parser.parseURL(feedUrl);

        return {
            title: feed.title ?? 'Microsoft Entra Release Notes',
            link: 'https://learn.microsoft.com/en-us/entra/fundamentals/whats-new',
            item: feed.items.map((item) => ({
                title: item.title ?? '',
                link: item.link ?? '',
                description: item.contentSnippet ?? item.content ?? '',
                pubDate: item.pubDate ? new Date(item.pubDate) : undefined,
                guid: item.guid ?? item.link ?? '',
            })),
        };
    },
};
