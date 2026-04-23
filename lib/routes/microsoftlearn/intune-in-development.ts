import { load } from 'cheerio';

import type { Route } from '@/types';
import got from '@/utils/got';

export const route: Route = {
    path: '/intune/in-development',
    name: 'In development for Microsoft Intune',
    categories: ['program-update'],
    example: '/microsoftlearn/intune/in-development',
    maintainers: [],
    handler: async () => {
        const currentUrl = 'https://learn.microsoft.com/en-us/intune/whats-new/in-development';

        const response = await got(currentUrl);
        const $ = load(response.data);

        const items: Array<{ title: string; link: string; description: string }> = [];

        let currentSection = '';

        $('h2, h3').each((_, el) => {
            const tagName = el.tagName?.toLowerCase();
            const text = $(el).text().trim();

            if (tagName === 'h2') {
                // Skip non-content sections
                const skip = ['see also', 'feedback', 'additional resources', 'notices'].some((s) => text.toLowerCase().startsWith(s));
                currentSection = skip ? '' : text;
                return;
            }

            if (tagName !== 'h3' || !currentSection) {
                return;
            }

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

            const anchor = $(el).attr('id');
            const link = anchor ? `${currentUrl}#${anchor}` : currentUrl;

            items.push({
                title: `${currentSection}: ${text}`,
                link,
                description: blocks.join('\n\n'),
            });
        });

        return {
            title: 'In development for Microsoft Intune',
            link: currentUrl,
            item: items,
        };
    },
};
