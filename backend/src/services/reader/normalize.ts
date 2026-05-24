import crypto from 'crypto';

import type { ReaderArticle, ReaderCategory, ReaderFeed } from './types';

function normalizeAuthor(author: unknown, fallback: string): string {
  if (typeof author === 'string') {
    return author.trim() || fallback;
  }

  if (Array.isArray(author)) {
    const text: string = author.map((item) => normalizeAuthor(item, '')).filter(Boolean).join(' / ');
    return text || fallback;
  }

  if (author && typeof author === 'object') {
    const record = author as Record<string, unknown>;
    const flattened: string = Object.values(record)
      .map((item) => normalizeAuthor(item, ''))
      .filter(Boolean)
      .join(' / ');
    return flattened || fallback;
  }

  return fallback;
}

function normalizeText(content: string | undefined) {
  return (content || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferCategory(title: string, content: string, fallback: ReaderCategory = 'Sem categoria'): ReaderCategory {
  const text = `${title} ${content}`.toLowerCase();
  if (/(openai|anthropic|gemini|gpt|claude|llm|Modelo|ai|modelo grande|agente)/.test(text)) return 'AI';
  if (/(iphone|android|chip|tech|ciência e tecnologia|programas|hardware|tesla|maçã|Google|Microsoft)/.test(text)) return 'ciência e tecnologia';
  if (/(mercado de ações|Financiamento|ipo|relatório financeiro|reuters|bloomberg|investir|Ações dos EUA|Ações de Hong Kong|Financiar)/.test(text)) return 'Financiar';
  if (/(notícias|internacionalidade|sociedade|bbc|CFTV|jornal da manhã|surgindo|Agência de Notícias Xinhua)/.test(text)) return 'notícias';
  if (/(game|jogo|nintendo|switch|ps5|xbox|steam|indie|Núcleo da máquina)/.test(text)) return 'jogo';
  return fallback;
}

function inferImportance(title: string, content: string): 1 | 2 | 3 | 4 | 5 {
  const text = `${title} ${content}`.toLowerCase();
  if (/(liberar|Financiamento|Fique on-line|Pesado|breaking|principal|sair da cama|Código aberto)/.test(text)) return 5;
  if (/(renovar|plano|rumor|teste|Visualização)/.test(text)) return 4;
  return 3;
}

function buildSummary(title: string, contentText: string): string[] {
  const parts = contentText.split(/[。！？!?.]/).map((part) => part.trim()).filter(Boolean);
  const summary = parts.slice(0, 3);
  if (summary.length > 0) {
    return summary;
  }
  return [title, contentText.slice(0, 60) || 'Ainda não há resumo'];
}

function buildKeywords(title: string, contentText: string, category: ReaderCategory): string[] {
  const keywordPool = new Set<string>();
  const source = `${title} ${contentText}`;
  const matches = source.match(/[A-Za-z0-9\-+#]{3,}|[\u4e00-\u9fa5]{2,6}/g) || [];
  for (const item of matches) {
    const normalized = item.trim();
    if (normalized.length < 2) {
      continue;
    }
    keywordPool.add(normalized);
    if (keywordPool.size >= 4) {
      break;
    }
  }

  if (keywordPool.size === 0) {
    keywordPool.add(category);
  }

  return [...keywordPool].slice(0, 5);
}

function createArticleId(seed: string) {
  return crypto.createHash('sha1').update(seed).digest('hex').slice(0, 16);
}

export function createDedupeKey(title: string, url: string) {
  return crypto.createHash('sha1').update(`${title}|${url}`).digest('hex');
}

export function normalizeRssArticle(feed: ReaderFeed, item: {
  title?: string;
  link?: string;
  pubDate?: string;
  isoDate?: string;
  creator?: string;
  author?: string;
  content?: string;
  description?: string;
  ['content:encoded']?: string;
  enclosure?: { url?: string };
  guid?: string;
}): ReaderArticle {
  const title = (item.title || 'Informações sem título').trim();
  const url = item.link || '';
  const contentHtml = item['content:encoded'] || item.content || item.description || '';
  const contentText = normalizeText(contentHtml);
  const category = inferCategory(title, contentText, feed.category);
  const dedupeKey = createDedupeKey(title, url || title);
  const publishedAt = item.isoDate || item.pubDate || new Date().toISOString();

  return {
    id: createArticleId(item.guid || `${feed.id}|${dedupeKey}`),
    feedId: feed.id,
    sourceType: 'rss',
    title,
    url,
    author: normalizeAuthor(item.creator || item.author, feed.name),
    publishedAt,
    fetchedAt: new Date().toISOString(),
    category,
    importance: inferImportance(title, contentText),
    summary: buildSummary(title, contentText),
    keywords: buildKeywords(title, contentText, category),
    contentText,
    contentHtml,
    imageUrl: item.enclosure?.url || '',
    readTime: Math.max(1, Math.ceil(contentText.length / 280)),
    isRead: false,
    savedAt: null,
    dedupeKey,
    originPath: null,
    translatedText: null,
    translatedAt: null,
    aiSummary: null,
    aiSummarizedAt: null,
  };
}
