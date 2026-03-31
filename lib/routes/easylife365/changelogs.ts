import { load } from 'cheerio';

import got from '@/utils/got';

function parseDateFromLink(link: string) {
    const match = link.match(/\/changelogs\/(\d{4})\/(\d{2})\/(\d{2})\//);
    if (!match) {
        return;
    }

    const [, yyyy, mm, dd] = match;
    return new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`).toUTCString();
}

function cleanDescription(text: string) {
    return text
        .replaceAll(/\s+/g, ' ')
        .replace(/^←\s*Back to Changelog/, '')
        .replace(/Have questions\? Reach out to us for more information\.?Contact Us$/i, '')
        .trim();
}

function getProductFromLink(link: string) {
    const match = link.match(/\/changelogs\/\d{4}\/\d{2}\/\d{2}\/([^/]+)\//);
    if (!match) {
        return '';
    }

    const productMap: Record<string, string> = {
        collab: 'Collaboration',
        identity: 'Identity',
        mail: 'Mail',
        meet: 'Meet',
        tipster: 'Tipster',
    };

    return productMap[match[1]] ?? match[1];
}

export const route = {
    path: '/changelogs',
    name: 'Changelogs',
    categories: ['program-update'],
    example: '/easylife365/changelogs',
    maintainers: ['dein-github-name'],
    handler: async () => {
        const rootUrl = 'https://docs.easylife365.cloud';
        const currentUrl = `${rootUrl}/changelogs`;

        const response = await got(currentUrl);
        const $ = load(response.data);

        const links = [
            ...new Set(
                $('a[href*="/changelogs/"]')
                    .toArray()
                    .map((el) => $(el).attr('href'))
                    .filter((href): href is string => typeof href === 'string' && href.length > 0)
                    .map((href) => new URL(href, rootUrl).toString())
            ),
        ];

        const item = await Promise.all(
            links.map(async (link) => {
                const detailResponse = await got(link);
                const detail$ = load(detailResponse.data);

                const rawTitle = detail$('main h1').first().text().trim() || detail$('h1').first().text().trim() || detail$('title').first().text().trim() || link.split('/').at(-1) || 'Untitled';

                const product = getProductFromLink(link);
                const title = product ? `${product}: ${rawTitle}` : rawTitle;

                const rawDescription = detail$('main').first().text() || detail$('article').first().text() || '';

                return {
                    title,
                    link,
                    description: cleanDescription(rawDescription),
                    pubDate: parseDateFromLink(link),
                };
            })
        );

        return {
            title: 'EasyLife 365 Changelogs',
            link: currentUrl,
            item,
        };
    },
};
