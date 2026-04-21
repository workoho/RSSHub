import { load } from 'cheerio';

import type { Route } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

export const route: Route = {
    path: '/intune/whats-new',
    name: "What's new in Microsoft Intune",
    categories: ['program-update'],
    example: '/microsoftlearn/intune/whats-new',
    maintainers: [],
    handler: async () => {
        const currentUrl = 'https://learn.microsoft.com/en-us/intune/whats-new/';

        const response = await got(currentUrl);
        const $ = load(response.data);

        const item: Array<{
            title: string;
            link: string;
            description: string;
            guid: string;
            pubDate?: Date;
        }> = [];

        let currentWeek = '';
        let currentSection = '';

        $('h2, h3, h4').each((_, el) => {
            const tagName = el.tagName?.toLowerCase();
            const text = $(el).text().trim();

            if (tagName === 'h2') {
                // Only track "Week of ..." headings; reset on other h2 sections
                const match = text.match(/Week of ([A-Za-z]+ \d{1,2}, \d{4})/);
                currentWeek = match ? match[1] : '';
                currentSection = '';
                return;
            }

            if (tagName === 'h3') {
                currentSection = text;
                return;
            }

            if (tagName !== 'h4') {
                return;
            }

            // Only process feature items within a dated week
            if (!currentWeek) {
                return;
            }

            const blocks: string[] = [];
            let next = $(el).next();

            while (next.length) {
                const nextTag = next.get(0)?.tagName?.toLowerCase();

                if (nextTag === 'h2' || nextTag === 'h3' || nextTag === 'h4') {
                    break;
                }

                const blockText = next.text().replaceAll(/\s+/g, ' ').trim();
                if (blockText) {
                    blocks.push(blockText);
                }

                next = next.next();
            }

            const sectionTitle = currentSection ? `${currentSection}: ${text}` : text;
            const description = blocks.join('\n\n');
            const slug = `${encodeURIComponent(currentWeek.toLowerCase())}-${encodeURIComponent(sectionTitle.toLowerCase())}`;

            item.push({
                title: sectionTitle,
                link: currentUrl,
                description,
                guid: `${currentUrl}#${slug}`,
                pubDate: parseDate(currentWeek, 'MMMM D, YYYY'),
            });
        });

        return {
            title: "What's new in Microsoft Intune",
            link: currentUrl,
            item,
        };
    },
};
