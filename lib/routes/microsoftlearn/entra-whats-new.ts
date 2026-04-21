import { load } from 'cheerio';

import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

export const route = {
    path: '/entra/whats-new',
    name: 'Microsoft Entra releases and announcements',
    categories: ['new-media', 'program-update'],
    example: '/microsoftlearn/entra/whats-new',
    maintainers: ['dein-github-name'],
    handler: async () => {
        const currentUrl = 'https://learn.microsoft.com/en-us/entra/fundamentals/whats-new';

        const response = await got(currentUrl);
        const $ = load(response.data);

        const item: Array<{
            title: string;
            link: string;
            description: string;
            guid: string;
            pubDate?: Date;
        }> = [];

        let currentMonth = '';

        $('h2, h3').each((_, el) => {
            const tagName = el.tagName?.toLowerCase();
            const text = $(el).text().trim();

            if (tagName === 'h2') {
                currentMonth = text;
                return;
            }

            if (tagName !== 'h3') {
                return;
            }

            const title = text;
            const blocks: string[] = [];
            let next = $(el).next();

            while (next.length) {
                const nextTag = next.get(0)?.tagName?.toLowerCase();

                if (nextTag === 'h2' || nextTag === 'h3') {
                    break;
                }

                const blockText = next.text().replaceAll(/\s+/g, ' ').trim();
                if (blockText) {
                    blocks.push(blockText);
                }

                next = next.next();
            }

            const fullTitle = currentMonth ? `${currentMonth}: ${title}` : title;
            const description = blocks.join('\n\n');
            const slug = encodeURIComponent(fullTitle.toLowerCase());

            item.push({
                title: fullTitle,
                link: currentUrl,
                description,
                guid: `${currentUrl}#${slug}`,
                pubDate: currentMonth ? parseDate(currentMonth, ['MMMM YYYY', 'MMMM, YYYY']) : undefined,
            });
        });

        return {
            title: 'Microsoft Entra releases and announcements',
            link: currentUrl,
            item,
        };
    },
};
