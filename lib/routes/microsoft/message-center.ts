import type { DataItem, Route } from '@/types';
import { ViewType } from '@/types';
import ofetch from '@/utils/ofetch';
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
    Id: string;
    LastModifiedDateTime?: string;
    Services?: string[];
    StartDateTime?: string;
    Tags?: string[];
    Title: string;
}

const rootUrl = 'https://mc.merill.net';
const dataUrl = 'https://raw.githubusercontent.com/merill/mc/main/%40data/messages.json';
const defaultLimit = 20;

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
    const messages = await ofetch<MessageCenterMessage[]>(dataUrl);

    const item = messages
        .toSorted((a, b) => getTimestamp(b) - getTimestamp(a))
        .slice(0, pageSize)
        .map((message): DataItem => {
            const link = `${rootUrl}/message/${message.Id}`;
            const pubDate = message.StartDateTime ? parseDate(message.StartDateTime) : undefined;
            const updated = message.LastModifiedDateTime ? parseDate(message.LastModifiedDateTime) : undefined;

            return {
                title: message.Title,
                link,
                guid: message.Id,
                description: message.Body?.Content || getDetailValue(message, 'Summary') || '',
                pubDate,
                updated,
                category: getCategories(message),
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

function getCategories(message: MessageCenterMessage) {
    const categories = [
        message.Category,
        ...(message.Services ?? []),
        ...(message.Tags ?? []),
    ].filter((category): category is string => Boolean(category));

    return categories.length ? [...new Set(categories)] : undefined;
}

function getDetailValue(message: MessageCenterMessage, name: string) {
    return message.Details?.find((detail) => detail.Name === name)?.Value;
}
