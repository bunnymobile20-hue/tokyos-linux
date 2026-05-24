import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownTrayIcon,
  BookmarkIcon,
  BookmarkSlashIcon,
  FolderOpenIcon,
  PlusIcon,
  SparklesIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'

import { ReaderIcon } from '../components/Icons'
import { fetchServerPaths } from '../lib/serverPaths'
import { withBasePath } from '../lib/basePath'
import {
  createReaderFeed,
  clearReaderRuntimeData,
  deleteReaderFeed,
  fetchReaderArticles,
  fetchReaderDailyBrief,
  fetchReaderFeeds,
  fetchReaderOverview,
  markReaderArticleRead,
  pullReaderSubscriptions,
  saveReaderArticle,
  summarizeReaderArticle,
  translateReaderArticle,
} from './Reader/api'
import { formatReaderDate, importanceStars } from './Reader/format'
import type { ReaderArticle, ReaderCategory, ReaderFeed, ReaderOverview, ReaderView } from './Reader/types'

const CATEGORIES: ReaderCategory[] = ['AI', 'ciência e tecnologia', 'Financiar', 'notícias', 'jogo']

type ToastState = { tone: 'success' | 'error' | 'info'; message: string } | null

type FeedDialogState = {
  name: string
  url: string
  category: ReaderCategory
}

export default function ReaderApp() {
  const [overview, setOverview] = useState<ReaderOverview | null>(null)
  const [feeds, setFeeds] = useState<ReaderFeed[]>([])
  const [activeView, setActiveView] = useState<ReaderView>('brief')
  const [activeCategory, setActiveCategory] = useState<ReaderCategory>('AI')
  const [articles, setArticles] = useState<ReaderArticle[]>([])
  const [activeArticle, setActiveArticle] = useState<ReaderArticle | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingArticles, setLoadingArticles] = useState(false)
  const [loadingMoreArticles, setLoadingMoreArticles] = useState(false)
  const [pullingSubscriptions, setPullingSubscriptions] = useState(false)
  const [showFeedDialog, setShowFeedDialog] = useState(false)
  const [feedDialog, setFeedDialog] = useState<FeedDialogState>({ name: '', url: '', category: 'AI' })
  const [deleteFeedId, setDeleteFeedId] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)
  const [readerDir, setReaderDir] = useState('')
  const [translatingArticleId, setTranslatingArticleId] = useState<string | null>(null)
  const [summarizingArticleId, setSummarizingArticleId] = useState<string | null>(null)
  const [articleOffset, setArticleOffset] = useState(0)
  const [hasMoreArticles, setHasMoreArticles] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)

  const PAGE_SIZE = 30

  useEffect(() => {
    void loadOverview()
    void fetchServerPaths().then((paths) => setReaderDir(paths.readerDir)).catch(() => undefined)
  }, [])

  useEffect(() => {
    if (!toast) {
      return
    }
    const timer = window.setTimeout(() => setToast(null), 2500)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    void loadViewArticles(activeView, activeCategory)
  }, [activeView, activeCategory])

  useEffect(() => {
    setArticleOffset(0)
  }, [activeView, activeCategory])

  const currentSection = useMemo(() => {
    return overview?.brief.sections.find((section) => section.category === activeCategory) || null
  }, [overview, activeCategory])

  async function loadOverview() {
    setLoading(true)
    try {
      const [overviewData, feedData] = await Promise.all([fetchReaderOverview(), fetchReaderFeeds()])
      setOverview(overviewData)
      setFeeds(feedData)
      setReaderDir(overviewData.readerDir)
      if (!activeArticle && overviewData.brief.sections[0]?.highlights[0]) {
        setActiveArticle(overviewData.brief.sections[0].highlights[0])
      }
    } catch (error) {
      console.error('Failed to load reader overview', error)
      setToast({ tone: 'error', message: error instanceof Error ? error.message : 'Falha ao carregar o briefing diário' })
    } finally {
      setLoading(false)
    }
  }

  async function loadViewArticles(view: ReaderView, category: ReaderCategory, nextOffset = 0, append = false) {
    if (append) {
      setLoadingMoreArticles(true)
    } else {
      setLoadingArticles(true)
    }
    try {
      if (view === 'brief') {
        const brief = await fetchReaderDailyBrief()
        const dayArticles = await fetchReaderArticles({ date: brief.date, limit: PAGE_SIZE, offset: nextOffset })
        const first = dayArticles[0] || null
        setOverview((current) => (current ? { ...current, brief, categories: brief.sections } : current))
        setArticles((current) => (append ? [...current, ...dayArticles] : dayArticles))
        setHasMoreArticles(nextOffset + dayArticles.length < brief.total)
        setArticleOffset(nextOffset + dayArticles.length)
        setActiveArticle((current) => {
          if (current) {
            const targetPool = append ? [...articles, ...dayArticles] : dayArticles
            const matched = targetPool.find((article) => article.id === current.id)
            return matched || current
          }
          return first
        })
        return
      }

      if (view === 'saved') {
        const nextArticles = await fetchReaderArticles({ saved: true, limit: 50, offset: nextOffset })
        setArticles(nextArticles)
        setHasMoreArticles(false)
        setActiveArticle((current) => nextArticles.find((article) => article.id === current?.id) || nextArticles[0] || null)
        return
      }

      if (view === 'feeds') {
        const nextArticles = await fetchReaderArticles({ limit: 50, offset: nextOffset })
        setArticles(nextArticles)
        setHasMoreArticles(false)
        setActiveArticle((current) => nextArticles.find((article) => article.id === current?.id) || nextArticles[0] || null)
        return
      }

      const nextArticles = await fetchReaderArticles({ category, limit: 50, offset: nextOffset })
      setArticles(nextArticles)
      setHasMoreArticles(false)
      setActiveArticle((current) => nextArticles.find((article) => article.id === current?.id) || nextArticles[0] || null)
    } catch (error) {
      console.error('Failed to load reader articles', error)
      setToast({ tone: 'error', message: error instanceof Error ? error.message : 'Falha ao carregar informações' })
    } finally {
      if (append) {
        setLoadingMoreArticles(false)
      } else {
        setLoadingArticles(false)
      }
    }
  }

  async function loadMoreBriefArticles() {
    if (loadingArticles || loadingMoreArticles || activeView !== 'brief' || !hasMoreArticles || !overview) {
      return
    }

    await loadViewArticles('brief', activeCategory, articleOffset, true)
  }

  async function handlePullSubscriptions() {
    setPullingSubscriptions(true)
    try {
      const result = await pullReaderSubscriptions()
      await loadOverview()
      await loadViewArticles(activeView, activeCategory)
      setToast({ tone: 'success', message: `Retirado RSS subscrição，Novo ${result.importedArticleCount} tira` })
    } catch (error) {
      console.error('Failed to pull reader subscriptions', error)
      setToast({ tone: 'error', message: error instanceof Error ? error.message : 'Falha ao extrair assinatura' })
    } finally {
      setPullingSubscriptions(false)
    }
  }

  async function handleCreateFeed() {
    if (!feedDialog.url.trim()) {
      setToast({ tone: 'error', message: 'RSS O endereço não pode ficar vazio' })
      return
    }

    try {
      await createReaderFeed(feedDialog)
      setShowFeedDialog(false)
      setFeedDialog({ name: '', url: '', category: 'AI' })
      await loadOverview()
      setToast({ tone: 'success', message: 'Feed adicionado' })
    } catch (error) {
      console.error('Failed to create feed', error)
      setToast({ tone: 'error', message: error instanceof Error ? error.message : 'Falha ao adicionar feed' })
    }
  }

  async function handleDeleteFeed() {
    if (!deleteFeedId) {
      return
    }

    try {
      await deleteReaderFeed(deleteFeedId)
      setDeleteFeedId(null)
      await loadOverview()
      setToast({ tone: 'success', message: 'Feed excluído' })
    } catch (error) {
      console.error('Failed to delete feed', error)
      setToast({ tone: 'error', message: error instanceof Error ? error.message : 'Falha ao excluir feed' })
    }
  }

  async function toggleSaved(article: ReaderArticle) {
    try {
      const updated = await saveReaderArticle(article.id, !article.savedAt)
      setActiveArticle(updated)
      setArticles((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      await loadOverview()
      setToast({ tone: 'success', message: updated.savedAt ? 'Já adicionado para ler mais tarde' : 'Mudei para ler mais tarde' })
    } catch (error) {
      console.error('Failed to save article', error)
      setToast({ tone: 'error', message: error instanceof Error ? error.message : 'Falha ao salvar' })
    }
  }

  async function markRead(article: ReaderArticle) {
    if (article.isRead) {
      return
    }

    try {
      const updated = await markReaderArticleRead(article.id, true)
      setActiveArticle(updated)
      setArticles((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setOverview((current) => {
        if (!current) {
          return current
        }
        return {
          ...current,
          stats: {
            ...current.stats,
            unreadArticles: Math.max(0, current.stats.unreadArticles - 1),
          },
          brief: {
            ...current.brief,
            sections: current.brief.sections.map((section) => ({
              ...section,
              unread: section.highlights.some((item) => item.id === updated.id) ? Math.max(0, section.unread - 1) : section.unread,
              highlights: section.highlights.map((item) => (item.id === updated.id ? updated : item)),
              latest: section.latest.map((item) => (item.id === updated.id ? updated : item)),
            })),
          },
        }
      })
    } catch (error) {
      console.error('Failed to mark article read', error)
    }
  }

  async function handleTranslateArticle(article: ReaderArticle) {
    setTranslatingArticleId(article.id)
    try {
      const updated = await translateReaderArticle(article.id)
      setActiveArticle(updated)
      setArticles((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setOverview((current) => {
        if (!current) {
          return current
        }
        return {
          ...current,
          latestArticles: current.latestArticles.map((item) => (item.id === updated.id ? updated : item)),
          savedArticles: current.savedArticles.map((item) => (item.id === updated.id ? updated : item)),
          brief: {
            ...current.brief,
            sections: current.brief.sections.map((section) => ({
              ...section,
              highlights: section.highlights.map((item) => (item.id === updated.id ? updated : item)),
              latest: section.latest.map((item) => (item.id === updated.id ? updated : item)),
            })),
          },
        }
      })
      setToast({ tone: 'success', message: 'Tradução completa do texto concluída' })
    } catch (error) {
      console.error('Failed to translate article', error)
      setToast({ tone: 'error', message: error instanceof Error ? error.message : 'Falha na tradução' })
    } finally {
      setTranslatingArticleId(null)
    }
  }

  async function handleSummarizeArticle(article: ReaderArticle) {
    setSummarizingArticleId(article.id)
    try {
      const updated = await summarizeReaderArticle(article.id)
      setActiveArticle(updated)
      setArticles((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setOverview((current) => {
        if (!current) {
          return current
        }
        return {
          ...current,
          latestArticles: current.latestArticles.map((item) => (item.id === updated.id ? updated : item)),
          savedArticles: current.savedArticles.map((item) => (item.id === updated.id ? updated : item)),
          brief: {
            ...current.brief,
            sections: current.brief.sections.map((section) => ({
              ...section,
              highlights: section.highlights.map((item) => (item.id === updated.id ? updated : item)),
              latest: section.latest.map((item) => (item.id === updated.id ? updated : item)),
            })),
          },
        }
      })
      setToast({ tone: 'success', message: 'AI Resumo atualizado' })
    } catch (error) {
      console.error('Failed to summarize article', error)
      setToast({ tone: 'error', message: error instanceof Error ? error.message : 'AI Falha no resumo' })
    } finally {
      setSummarizingArticleId(null)
    }
  }

  async function handleClearRuntimeData() {
    try {
      await clearReaderRuntimeData()
      setShowClearDialog(false)
      setActiveArticle(null)
      setArticles([])
      setArticleOffset(0)
      setHasMoreArticles(false)
      await loadOverview()
      await loadViewArticles(activeView, activeCategory)
      setToast({ tone: 'success', message: 'Reader Os dados em execução foram limpos，O teste de simulação pode ser iniciado' })
    } catch (error) {
      console.error('Failed to clear reader runtime data', error)
      setToast({ tone: 'error', message: error instanceof Error ? error.message : 'Falha na limpeza' })
    }
  }

  function openReaderDir() {
    const base = withBasePath('/proxy/filebrowser/files')
    const target = readerDir ? `${base}${readerDir}` : withBasePath('/proxy/filebrowser/')
    window.open(target, '_blank', 'noopener,noreferrer')
  }

  function renderSidebarButton(view: ReaderView, label: string, hint?: string) {
    const active = activeView === view
    return (
      <button
        type="button"
        onClick={() => setActiveView(view)}
        className={`w-full rounded-xl px-3 py-2.5 text-left transition-colors ${active ? 'bg-orange-100 text-orange-700 shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
      >
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
      </button>
    )
  }

  return (
    <div className="relative flex h-full bg-[linear-gradient(180deg,#fffefb_0%,#fff8ef_100%)] text-slate-800">
      <div className="w-72 shrink-0 border-r border-orange-100 bg-white/80 backdrop-blur-sm flex flex-col">
        <div className="border-b border-orange-100 bg-white/70 p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center text-base font-bold text-slate-800 break-words">
              <ReaderIcon className="mr-2 h-5 w-5 shrink-0" />
              Leitor Notícias
            </h2>
            <div className="flex items-center gap-1">
              <button type="button" onClick={openReaderDir} className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100" title={`Abrir RSS diretório de trabalho\n${readerDir}`}>
                <FolderOpenIcon className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => void handlePullSubscriptions()} className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-orange-50 hover:text-orange-600" title="Obtenha a assinatura mais recente">
                <ArrowDownTrayIcon className={`h-4 w-4 ${pullingSubscriptions ? 'animate-bounce' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-2 border-b border-orange-100 p-3">
          {renderSidebarButton('brief', 'Resumo de hoje', overview ? `inclui ${overview.brief.total} artigos | Carregado ${articles.length}` : undefined)}
          {renderSidebarButton('category', 'Navegação de campo', currentSection ? `${currentSection.category} · hoje ${currentSection.total} artigos` : 'Navegue por cinco áreas')}
          {renderSidebarButton('saved', 'Leia mais tarde', overview ? `${overview.stats.savedArticles} artigos salvos` : undefined)}
          {renderSidebarButton('feeds', 'Gerenciamento de assinaturas', overview ? `${overview.stats.totalFeeds} feeds` : undefined)}
        </div>

        <div className="border-b border-orange-100 px-3 py-3">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-semibold tracking-wide text-slate-500">Cinco grandes áreas</div>
          </div>
          <div className="grid grid-cols-2 gap-2 overflow-y-auto max-h-[200px] custom-scrollbar">
            {CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => {
                  setActiveCategory(category)
                  setActiveView('category')
                }}
                className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors truncate ${activeCategory === category && activeView === 'category' ? 'border-orange-300 bg-orange-50 text-orange-700' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="text-xs font-semibold tracking-wide text-slate-500">Status de sincronização</div>
            <div className="mt-3 space-y-2 text-xs text-slate-500">
              <div>Executado recentemente：{overview?.syncStatus.lastRunAt ? formatReaderDate(overview.syncStatus.lastRunAt) : 'Nenhum'}</div>
              <div>sucesso recente：{overview?.syncStatus.lastSuccessAt ? formatReaderDate(overview.syncStatus.lastSuccessAt) : 'Nenhum'}</div>
              {overview?.syncStatus.lastError && <div className="rounded-lg bg-red-50 px-3 py-2 text-red-600">{overview.syncStatus.lastError}</div>}
            </div>
            <button type="button" onClick={() => setShowClearDialog(true)} className="mt-4 w-full rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600 transition-colors hover:bg-red-50">limpar Reader Dados de operação</button>
          </div>
        </div>
      </div>

      <div className="w-[360px] shrink-0 border-r border-orange-100 bg-white/70 flex flex-col">
        <div className="border-b border-orange-100 bg-white/70 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-slate-800">
                {activeView === 'brief' && 'Resumo de hoje'}
                {activeView === 'category' && `${activeCategory} campo`}
                {activeView === 'saved' && 'Leia mais tarde'}
                {activeView === 'feeds' && 'Gerenciamento de assinaturas'}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {activeView === 'brief' && `Coleção de hoje: ${overview?.brief.total ?? 0} artigos, Carregados: ${articles.length} artigos`}
                {activeView === 'category' && 'Confira as novidades e tendências da área'}
                {activeView === 'saved' && 'Guarde para mais tarde e concentre-se na leitura'}
                {activeView === 'feeds' && 'fonte padrão + Feed personalizado'}
              </div>
            </div>
            {activeView === 'brief' && (
              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={() => void handlePullSubscriptions()}
                  disabled={pullingSubscriptions}
                  className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-medium text-orange-700 transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {pullingSubscriptions ? 'Puxando...' : 'Obtenha a assinatura mais recente'}
                </button>
              </div>
            )}
          </div>
        </div>

        <div
          className="flex-1 overflow-auto p-3"
          onScroll={(event) => {
            const element = event.currentTarget
            if (element.scrollTop + element.clientHeight >= element.scrollHeight - 120) {
              void loadMoreBriefArticles()
            }
          }}
        >
          {loading || loadingArticles ? (
            <div className="py-12 text-center text-sm text-slate-400">carregando...</div>
          ) : activeView === 'feeds' ? (
            <div className="space-y-3">
              <button type="button" onClick={() => setShowFeedDialog(true)} className="flex w-full items-center justify-center rounded-2xl border border-dashed border-orange-300 bg-orange-50 px-4 py-3 text-sm font-medium text-orange-700 transition-colors hover:bg-orange-100">
                <PlusIcon className="mr-2 h-4 w-4" />
                Criar novo feed
              </button>
              {feeds.map((feed) => (
                <div key={feed.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-800">{feed.name}</div>
                      <div className="mt-1 line-clamp-2 text-xs text-slate-500">{feed.url}</div>
                      <div className="mt-2 text-xs text-slate-400">{feed.category} · {feed.source === 'preset' ? 'fonte padrão' : 'Personalizar'}</div>
                    </div>
                    {feed.source === 'custom' && (
                      <button type="button" onClick={() => setDeleteFeedId(feed.id)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600">
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {articles.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">Não há informações para a visualização atual</div>
              ) : (
                <>
                  {articles.map((article) => (
                    <button
                      key={article.id}
                      type="button"
                      onClick={() => {
                        setActiveArticle(article)
                        void markRead(article)
                      }}
                      className={`block w-full rounded-2xl border px-4 py-3 text-left shadow-sm transition-colors ${activeArticle?.id === article.id ? 'border-orange-300 bg-orange-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}
                    >
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-500">{article.category}</span>
                          <span className="rounded-full bg-sky-100 px-2 py-1 text-[11px] font-medium text-sky-700">RSS</span>
                        </div>
                        <span className="text-[11px] text-amber-600">{importanceStars(article.importance)}</span>
                      </div>
                      <div className={`line-clamp-2 text-sm font-semibold leading-6 break-words ${article.isRead ? 'text-slate-700' : 'text-slate-900'}`}>{article.title}</div>
                      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                        <span>{article.author || 'fonte desconhecida'}</span>
                        <span>{formatReaderDate(article.publishedAt)}</span>
                      </div>
                    </button>
                  ))}
                  {activeView === 'brief' && hasMoreArticles && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-3 text-center text-xs text-slate-400">
                      {loadingMoreArticles ? 'Carregando mais informações de hoje...' : 'Role para baixo para continuar carregando mais informações de hoje'}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0 flex-1 overflow-hidden bg-white/50">
        {activeArticle ? (
          <div className="h-full overflow-auto">
            <div className="mx-auto max-w-4xl px-8 py-8 lg:px-12">
              <div className="mb-6 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-orange-100 px-2 py-1 font-medium text-orange-700">{activeArticle.category}</span>
                <span className="rounded-full bg-sky-100 px-2 py-1 font-medium text-sky-700">RSS subscrição</span>
                <span>{formatReaderDate(activeArticle.publishedAt)}</span>
                <span>{activeArticle.readTime} minuto</span>
                <span>{importanceStars(activeArticle.importance)}</span>
              </div>

              <div className="mb-4 flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <h1 className="text-3xl font-bold leading-tight text-slate-900">{activeArticle.title}</h1>
                  <div className="mt-3 text-sm text-slate-500">{activeArticle.author || 'fonte desconhecida'}</div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void toggleSaved(activeArticle)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50"
                  >
                    {activeArticle.savedAt ? <BookmarkSlashIcon className="mr-2 inline-block h-4 w-4" /> : <BookmarkIcon className="mr-2 inline-block h-4 w-4" />}
                    {activeArticle.savedAt ? 'Cancelar leitura mais tarde' : 'Cadastre-se para ler mais tarde'}
                  </button>
                  {(activeArticle.contentText || activeArticle.summary.length > 0) && (
                    <button
                      type="button"
                      onClick={() => void handleSummarizeArticle(activeArticle)}
                      disabled={summarizingArticleId === activeArticle.id}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <SparklesIcon className="mr-2 inline-block h-4 w-4" />
                      {summarizingArticleId === activeArticle.id ? 'Resumindo...' : activeArticle.aiSummary ? 'de novo AI resumo' : 'AI resumo'}
                    </button>
                  )}
                  {(activeArticle.contentText || activeArticle.summary.length > 0) && (
                    <button
                      type="button"
                      onClick={() => void handleTranslateArticle(activeArticle)}
                      disabled={translatingArticleId === activeArticle.id}
                      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {translatingArticleId === activeArticle.id ? 'Traduzindo...' : activeArticle.translatedText ? 'retraduzir' : 'Tradução de texto completo'}
                    </button>
                  )}
                  <a href={activeArticle.url} target="_blank" rel="noreferrer" className="rounded-xl bg-orange-500 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600">
                    Leia o artigo original
                  </a>
                </div>
              </div>

              <div className="mb-6 rounded-3xl border border-orange-100 bg-[linear-gradient(135deg,#fff8ef_0%,#fffdf8_100%)] p-6 shadow-sm">
                <div className="mb-3 text-sm font-semibold text-orange-700">AI resumo / Resumo do briefing</div>
                <div className="space-y-3 text-sm leading-7 text-slate-700">
                  {(activeArticle.aiSummary && activeArticle.aiSummary.length > 0 ? activeArticle.aiSummary : activeArticle.summary).map((line, index) => (
                    <div key={index} className="flex gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">{index + 1}</span>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {activeArticle.keywords.map((keyword) => (
                    <span key={keyword} className="rounded-full bg-white px-3 py-1 text-xs text-slate-600 shadow-sm">#{keyword}</span>
                  ))}
                </div>
                {!activeArticle.translatedText && (activeArticle.contentText || activeArticle.summary.length > 0) && (
                  <div className="mt-4 rounded-2xl border border-amber-100 bg-white/80 px-4 py-3 text-xs leading-6 text-slate-500">
                    Clique no canto superior direito <span className="font-semibold text-slate-700">Tradução de texto completo</span> Gerar tradução em chinês。Informações em inglês funcionam melhor。
                  </div>
                )}
                {activeArticle.aiSummarizedAt && (
                  <div className="mt-4 text-xs text-slate-400">AI Resumo gerado em {formatReaderDate(activeArticle.aiSummarizedAt)}</div>
                )}
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <div className="mb-4 text-sm font-semibold text-slate-700">Visão geral rápida do texto</div>
                <div className="whitespace-pre-wrap text-[15px] leading-8 text-slate-700">
                  {activeArticle.contentText || 'As informações atuais não fornecem conteúdo de texto，Você pode clicar no canto superior direito para ler o texto original。'}
                </div>
              </div>

              {activeArticle.translatedText && (
                <div className="mt-6 rounded-3xl border border-emerald-100 bg-emerald-50/60 p-6 shadow-sm">
                  <div className="mb-4 flex items-center justify-between gap-4">
                    <div className="text-sm font-semibold text-emerald-800">Tradução de texto completo em chinês</div>
                    <div className="text-xs text-emerald-700/80">
                      {activeArticle.translatedAt ? `gerado em ${formatReaderDate(activeArticle.translatedAt)}` : 'Gerado'}
                    </div>
                  </div>
                  <div className="whitespace-pre-wrap text-[15px] leading-8 text-slate-700">
                    {activeArticle.translatedText}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center p-8 text-slate-400">
            <div className="w-full max-w-3xl rounded-[32px] border border-orange-100 bg-white/85 p-8 shadow-xl backdrop-blur-sm">
              <ReaderIcon className="mb-5 h-16 w-16 opacity-40" />
              <h3 className="text-2xl font-bold text-slate-900">O briefing diário está pronto</h3>
              <p className="mt-3 text-sm leading-7 text-slate-500">
                Agora só resta o briefing diário RSS lógica de alimentação。você pode“Gerenciamento de assinaturas”Manutenção RSS fonte，O sistema irá extrair e gerar regularmente briefings diários。
              </p>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left">
                  <div className="text-sm font-semibold text-slate-800">RSS Alimentar</div>
                  <div className="mt-2 text-xs leading-6 text-slate-500">As fontes padrão são retidas automaticamente，Você também pode adicionar novos manualmente RSS endereço。</div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button type="button" onClick={() => setActiveView('feeds')} className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition-colors hover:bg-slate-100">Gerenciar feeds</button>
                    <button type="button" onClick={() => void handlePullSubscriptions()} className="rounded-xl bg-white px-3 py-2 text-sm text-slate-700 shadow-sm transition-colors hover:bg-slate-100">Obtenha a assinatura mais recente</button>
                  </div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left">
                  <div className="text-sm font-semibold text-slate-800">diretório de trabalho</div>
                  <div className="mt-2 text-xs leading-6 text-slate-500">RSS Configuração、artigo、Os dados de briefing e leitura posterior são salvos localmente Reader diretório de trabalho。</div>
                  <div className="mt-4 rounded-xl bg-white px-3 py-2 text-xs font-mono text-slate-600">{readerDir}</div>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-orange-100 bg-orange-50/70 p-5 text-left">
                <div className="text-sm font-semibold text-orange-800">Sugira próximos passos</div>
                <div className="mt-2 text-sm leading-7 text-orange-900/80">
                  Confirme a lista de feeds primeiro，Clique novamente“Obtenha a assinatura mais recente”。O sistema pressionará RSS Classificação automática de conteúdo、Remova duplicatas e gere o briefing de hoje。
                </div>
                <div className="mt-4">
                  <button type="button" onClick={() => void handlePullSubscriptions()} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600">Obtenha a assinatura mais recente</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className={`absolute right-6 top-6 z-[160] rounded-xl px-4 py-3 shadow-xl text-sm font-medium ${toast.tone === 'success' ? 'bg-emerald-600 text-white' : toast.tone === 'error' ? 'bg-red-600 text-white' : 'bg-slate-900 text-white'}`}>
          {toast.message}
        </div>
      )}

      {showFeedDialog && (
        <div className="absolute inset-0 z-[170] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowFeedDialog(false)}>
          <div className="w-[460px] rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800">Adicionar novo feed</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">Permite adicionar manualmente novos RSS fonte，Depois de salvar, ele participará da subseqüente extração de assinaturas e da geração de briefing diário.。</p>
            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">nome</label>
                <input value={feedDialog.name} onChange={(event) => setFeedDialog({ ...feedDialog, name: event.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 focus:border-orange-300 focus:outline-none" placeholder="Por exemplo：Hacker News" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">RSS endereço</label>
                <input value={feedDialog.url} onChange={(event) => setFeedDialog({ ...feedDialog, url: event.target.value })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 focus:border-orange-300 focus:outline-none" placeholder="https://example.com/rss.xml" />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">campo</label>
                <select value={feedDialog.category} onChange={(event) => setFeedDialog({ ...feedDialog, category: event.target.value as ReaderCategory })} className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-700 focus:border-orange-300 focus:outline-none">
                  {CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowFeedDialog(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100">Cancelar</button>
              <button type="button" onClick={() => void handleCreateFeed()} className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600">Adicionar feed</button>
            </div>
          </div>
        </div>
      )}

      {deleteFeedId && (
        <div className="absolute inset-0 z-[170] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm" onClick={() => setDeleteFeedId(null)}>
          <div className="w-[420px] rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800">Excluir feed</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">Excluir apenas a configuração de assinatura do TokyOS. Os artigos salvos no banco de dados local não serão excluídos.</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setDeleteFeedId(null)} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100">Cancelar</button>
              <button type="button" onClick={() => void handleDeleteFeed()} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700">Confirmar exclusão</button>
            </div>
          </div>
        </div>
      )}

      {showClearDialog && (
        <div className="absolute inset-0 z-[170] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm" onClick={() => setShowClearDialog(false)}>
          <div className="w-[460px] rounded-3xl border border-white/70 bg-white/95 p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <h3 className="text-lg font-bold text-slate-800">limpar Reader Dados de operação</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">Os artigos rastreados serão excluídos、resumo、Ler e armazenar em cache mais tarde，mas mantenha RSS Configuração de feed。</p>
            <div className="mt-6 flex justify-end gap-3">
              <button type="button" onClick={() => setShowClearDialog(false)} className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100">Cancelar</button>
              <button type="button" onClick={() => void handleClearRuntimeData()} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700">Confirme a limpeza</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
