import { load } from 'cheerio';

import type { Route } from '@/types';
import ofetch from '@/utils/ofetch';
import { parseDate } from '@/utils/parse-date';

const baseUrl = 'https://help.flexopus.com';
const apiKey = 'c1841f6cc3813bc6405fcf7353';

export const route: Route = {
    path: '/changelog',
    categories: ['program-update'],
    example: '/flexopus/changelog',
    parameters: {},
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
            source: ['help.flexopus.com/en/changelog/'],
            target: '/changelog',
        },
    ],
    name: 'Changelog',
    maintainers: ['Gl4dr3x'],
    handler,
    url: 'help.flexopus.com/en/changelog',
};

async function handler() {
    const data = await ofetch(`${baseUrl}/en/ghost/api/content/posts/`, {
        query: {
            key: apiKey,
            filter: 'tag:hash-changelog',
            limit: 15,
        },
    });

    const items = data.posts.map((post) => {
        const $ = load(post.html || '');
        $('[referrerpolicy]').removeAttr('referrerpolicy');
        $('.kg-callout-card-accent').remove();
        const content = $('body').html() || '';
        const description = post.feature_image ? `<figure><img src="${post.feature_image}" alt=""></figure>${content}` : content;

        return {
            title: post.title,
            description,
            link: post.url,
            pubDate: parseDate(post.published_at),
            guid: post.id,
        };
    });

    return {
        title: 'Flexopus Changelog',
        link: `${baseUrl}/en/changelog/`,
        item: items,
        language: 'en' as const,
    };
}
