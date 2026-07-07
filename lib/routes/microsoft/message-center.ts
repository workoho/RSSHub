import type { DataItem, Route } from '@/types';
import { ViewType } from '@/types';
import got from '@/utils/got';
import { parseDate } from '@/utils/parse-date';

interface MessageCenterDetail {
    Name: string;
    Value: string;
}

interface MessageCenterMessage {
    Body?: {
        Content?: string;
    };
    Category?: string;
    Details?: MessageCenterDetail[];
    EndDateTime?: string;
    Id: string;
    LastModifiedDateTime?: string;
    Services?: string[];
    Severity?: string;
    StartDateTime?: string;
    Tags?: string[];
    Title: string;
}

const rootUrl = 'https://mc.merill.net';
const dataUrl = 'https://raw.githubusercontent.com/merill/mc/main/%40data/messages.json';
const defaultLimit = 20;
const categoryLabels: Record<string, string> = {
    planForChange: 'Plan for change',
    stayInformed: 'Stay informed',
};

export const route: Route = {
    path: '/message-center',
    name: 'Message Center Archive',
    url: 'mc.merill.net',
    categories: ['program-update'],
    example: '/microsoft/message-center',
    description: 'Microsoft 365 Message Center archive entries from mc.merill.net.',
    features: {
        requireConfig: false,
        requirePuppeteer: false,
        antiCrawler: false,
        supportRadar: true,
        supportBT: false,
        supportPodcast: false,
        supportScihub: false,
    },
    radar: [
        {
            source: ['mc.merill.net', 'mc.merill.net/message/:id'],
            target: '/message-center',
        },
    ],
    view: ViewType.Articles,
    maintainers: [],
    handler,
};

async function handler(ctx) {
    const limit = Number.parseInt(ctx.req.query('limit') ?? String(defaultLimit), 10);
    const pageSize = Number.isNaN(limit) || limit <= 0 ? defaultLimit : limit;
    const { data: messages }: { data: MessageCenterMessage[] } = await got(dataUrl);

    if (!Array.isArray(messages)) {
        throw new Error('Failed to fetch Microsoft 365 Message Center archive data.');
    }

    const item = messages
        .slice()
        .sort((a, b) => getTimestamp(b) - getTimestamp(a))
        .slice(0, pageSize)
        .map((message): DataItem => {
            const link = `${rootUrl}/message/${message.Id}`;
            const description = message.Body?.Content || getDetailValue(message, 'Summary') || '';
            const endDate = message.EndDateTime ? parseDate(message.EndDateTime) : undefined;
            const messageCenterCategory = getMessageCenterCategory(message.Category);
            const pubDate = message.StartDateTime ? parseDate(message.StartDateTime) : undefined;
            const updated = message.LastModifiedDateTime ? parseDate(message.LastModifiedDateTime) : undefined;

            return {
                title: message.Title,
                link,
                guid: message.Id,
                description,
                pubDate,
                updated,
                category: getCategories(message, messageCenterCategory),
                content: getContent(description, messageCenterCategory, message.Severity, endDate),
                _extra: messageCenterCategory ? { messageCenterCategory } : undefined,
            };
        });

    return {
        title: 'Microsoft 365 Message Center Archive',
        description: 'Archive of Microsoft 365 Message Center posts.',
        link: rootUrl,
        item,
    };
}

function getTimestamp(message: MessageCenterMessage) {
    const date = message.LastModifiedDateTime || message.StartDateTime;

    return date ? Date.parse(date) || 0 : 0;
}

function getCategories(message: MessageCenterMessage, messageCenterCategory?: string) {
    const categories = [
        messageCenterCategory,
        message.Severity,
        ...(message.Services ?? []),
        ...(message.Tags ?? []),
    ].filter((category): category is string => Boolean(category));

    return categories.length ? [...new Set(categories)] : undefined;
}

function getContent(description: string, messageCenterCategory?: string, severity?: string, endDate?: Date) {
    const endDateValue = endDate && !Number.isNaN(endDate.getTime()) ? endDate.toISOString() : undefined;
    const metadata = [
        messageCenterCategory ? `MessageCenterCategory: ${messageCenterCategory}` : undefined,
        severity ? `Severity: ${severity}` : undefined,
        endDateValue ? `EndDateTime: ${endDateValue}` : undefined,
    ].filter((value): value is string => Boolean(value));

    if (!metadata.length) {
        return {
            html: description,
            text: description,
        };
    }

    const metadataText = metadata.join('\n');
    const metadataHtml = metadata.map((value) => `<li>${escapeHtml(value)}</li>`).join('');

    return {
        html: `<ul>${metadataHtml}</ul>${description}`,
        text: `${metadataText}\n\n${description}`,
    };
}

function getDetailValue(message: MessageCenterMessage, name: string) {
    return message.Details?.find((detail) => detail.Name === name)?.Value;
}

function getMessageCenterCategory(category?: string) {
    return category ? categoryLabels[category] ?? category : undefined;
}

function escapeHtml(value: string) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
