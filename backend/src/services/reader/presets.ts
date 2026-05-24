import type { ReaderFeed } from './types';

function createPresetFeed(id: string, name: string, url: string, category: ReaderFeed['category']): ReaderFeed {
  return {
    id,
    name,
    url,
    category,
    updateFrequency: 60,
    enabled: true,
    source: 'preset',
    lastFetchedAt: null,
    createdAt: '2026-04-01T00:00:00.000Z'
  };
}

export const READER_PRESET_FEEDS: ReaderFeed[] = [
  createPresetFeed('preset-openai-blog', 'OpenAI Blog', 'https://openai.com/news/rss.xml', 'AI'),
  createPresetFeed('preset-deepmind-blog', 'Google DeepMind Blog', 'https://deepmind.google/blog/rss.xml', 'AI'),
  createPresetFeed('preset-google-ai-blog', 'Google AI Blog', 'https://blog.google/technology/ai/rss/', 'AI'),
  createPresetFeed('preset-qbitai', 'Qubit', 'https://www.qbitai.com/feed', 'AI'),
  createPresetFeed('preset-huggingface-blog', 'Hugging Face Blog', 'https://huggingface.co/blog/feed.xml', 'AI'),
  createPresetFeed('preset-techcrunch-ai', 'TechCrunch', 'https://techcrunch.com/feed/', 'ciência e tecnologia'),
  createPresetFeed('preset-the-verge', 'The Verge', 'https://www.theverge.com/rss/index.xml', 'ciência e tecnologia'),
  createPresetFeed('preset-ifanr', 'Estilo de amor', 'https://www.ifanr.com/feed', 'ciência e tecnologia'),
  createPresetFeed('preset-ithome', 'ITlar', 'https://www.ithome.com/rss/', 'ciência e tecnologia'),
  createPresetFeed('preset-sspai', 'minoria', 'https://sspai.com/feed', 'ciência e tecnologia'),
  createPresetFeed('preset-marketwatch-topstories', 'MarketWatch Top Stories', 'https://feeds.content.dowjones.io/public/rss/mw_topstories', 'Financiar'),
  createPresetFeed('preset-36kr', '36criptônio', 'https://36kr.com/feed', 'Financiar'),
  createPresetFeed('preset-ftchinese', 'FTSite chinês', 'https://www.ftchinese.com/rss/feed', 'Financiar'),
  createPresetFeed('preset-bloomberg-markets', 'Bloomberg Markets', 'https://feeds.bloomberg.com/markets/news.rss', 'Financiar'),
  createPresetFeed('preset-bbc-news', 'BBC News', 'https://feeds.bbci.co.uk/news/rss.xml', 'notícias'),
  createPresetFeed('preset-nytimes-cn', 'Site chinês do New York Times', 'https://cn.nytimes.com/rss/', 'notícias'),
  createPresetFeed('preset-rfi-cn', 'RFI chinês', 'https://www.rfi.fr/cn/%E4%B8%AD%E5%9B%BD/rss', 'notícias'),
  createPresetFeed('preset-nytimes-world', 'NYTimes World', 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', 'notícias'),
  createPresetFeed('preset-ign', 'IGN', 'https://feeds.ign.com/ign/games-all', 'jogo'),
  createPresetFeed('preset-youxichaguan', 'casa de chá de jogo', 'https://youxichaguan.com/feed', 'jogo'),
  createPresetFeed('preset-youxituoluo', 'Topo do jogo', 'https://www.youxituoluo.com/feed', 'jogo')
];
