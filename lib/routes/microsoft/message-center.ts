import { load } from 'cheerio';

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
    Source?: string;
    StartDateTime?: string;
    Tags?: string[];
    Title: string;
}

interface MessageCenterImage {
    alt?: string;
    url: string;
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
        .filter(isMessageCenterMessage)
        .slice()
        .sort((a, b) => getTimestamp(b) - getTimestamp(a))
        .slice(0, pageSize)
        .map((message): DataItem => {
            const link = `${rootUrl}/message/${message.Id}`;
            const description = message.Body?.Content || getDetailValue(message, 'Summary') || '';
            const endDate = message.EndDateTime ? parseDate(message.EndDateTime) : undefined;
            const images = getImages(description);
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
                image: images[0]?.url,
                attachments: getImageAttachments(images),
                category: getCategories(message, messageCenterCategory),
                content: getContent(description, messageCenterCategory, message.Severity, endDate),
                _extra: getExtra(messageCenterCategory, message.Severity, images),
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

function getImages(description: string) {
    const $ = load(description);
    const images: MessageCenterImage[] = [];
    const imageUrls = new Set<string>();

    $('img').each((_, htmlImage) => {
        const src = $(htmlImage).attr('src');
        const url = src ? getAbsoluteUrl(src) : undefined;

        if (!url || imageUrls.has(url)) {
            return;
        }

        imageUrls.add(url);
        images.push({
            alt: $(htmlImage).attr('alt') || undefined,
            url,
        });
    });

    return images;
}

function getImageAttachments(images: MessageCenterImage[]) {
    return images.length
        ? images.map((image) => ({
              url: image.url,
              mime_type: getImageMimeType(image.url),
              title: image.alt,
          }))
        : undefined;
}

function getImageMimeType(url: string) {
    const pathname = getPathname(url);

    if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) {
        return 'image/jpeg';
    }

    if (pathname.endsWith('.gif')) {
        return 'image/gif';
    }

    if (pathname.endsWith('.webp')) {
        return 'image/webp';
    }

    if (pathname.endsWith('.svg')) {
        return 'image/svg+xml';
    }

    return 'image/png';
}

function getPathname(url: string) {
    try {
        return new URL(url).pathname.toLowerCase();
    } catch {
        return url.toLowerCase();
    }
}

function getAbsoluteUrl(url: string) {
    try {
        return new URL(url, rootUrl).href;
    } catch {
        return undefined;
    }
}

function getExtra(messageCenterCategory?: string, severity?: string, images: MessageCenterImage[] = []) {
    const extra: Record<string, MessageCenterImage[] | string> = {};

    if (messageCenterCategory) {
        extra.messageCenterCategory = messageCenterCategory;
    }

    if (severity) {
        extra.severity = severity;
    }

    if (images.length) {
        extra.images = images;
    }

    return Object.keys(extra).length ? extra : undefined;
}

function isMessageCenterMessage(message: MessageCenterMessage) {
    return message.Source === 'messageCenter';
}

function escapeHtml(value: string) {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
}
