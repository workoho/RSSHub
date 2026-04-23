import type { Data, DataItem, Route } from '@/types';
import { parseDate } from '@/utils/parse-date';
import parser from '@/utils/rss-parser';

export const route: Route = {
    path: '/intune/blog',
    name: 'Microsoft Intune Blog',
    categories: ['program-update'],
    example: '/microsoftlearn/intune/blog',
    maintainers: [],
    radar: [
        {
            source: ['techcommunity.microsoft.com/category/microsoftintune/blog/microsoftintuneblog'],
            target: '/intune/blog',
        },
    ],
    handler,
};

async function handler(): Promise<Data> {
    const feedUrl = 'https://techcommunity.microsoft.com/t5/s/gxcuf89792/rss/board?board.id=microsoftintuneblog';

    const feed = await parser.parseURL(feedUrl);

    const items: DataItem[] = feed.items.map((item) => ({
        title: item.title ?? '',
        link: item.link,
        description: item.content ?? item.contentSnippet ?? '',
        pubDate: item.pubDate ? parseDate(item.pubDate) : undefined,
        author: item.creator,
    }));

    return {
        title: feed.title ?? 'Microsoft Intune Blog',
        link: 'https://techcommunity.microsoft.com/category/microsoftintune/blog/microsoftintuneblog',
        item: items,
    };
}
