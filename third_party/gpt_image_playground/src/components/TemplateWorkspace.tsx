import { useEffect, useMemo, useState } from 'react'
import { copyTextToClipboard, getClipboardFailureMessage } from '../lib/clipboard'
import { trackImagePlaygroundEvent } from '../lib/imagePlaygroundAnalytics'
import {
  createEmptyTemplateFetchState,
  fetchPromptTemplates,
  type PromptTemplateItem,
  type PromptTemplateKind,
  type PromptTemplateSourceId,
  type TemplateFetchState,
} from '../lib/promptTemplates'
import { useStore } from '../store'
import { CopyIcon, ExternalLinkIcon, PhotoIcon, RefreshIcon } from './icons'
import TemplateImagePreview from './TemplateImagePreview'

type SourceFilter = 'all' | 'xianyu110' | 'evolink' | 'youmind' | 'freestylefly'
type KindFilter = 'all' | PromptTemplateKind

const SOURCE_OPTIONS: Array<{ id: SourceFilter; label: string }> = [
  { id: 'all', label: '全部来源' },
  { id: 'xianyu110', label: 'xianyu110' },
  { id: 'evolink', label: 'EvoLinkAI' },
  { id: 'youmind', label: 'YouMind' },
  { id: 'freestylefly', label: 'freestylefly' },
]

const KIND_OPTIONS: Array<{ label: string; value: KindFilter }> = [
  { label: '全部', value: 'all' },
  { label: '场景模板', value: 'scenario' },
  { label: '最新 X', value: 'latest-x' },
  { label: '案例库', value: 'case-library' },
]

const PAGE_SIZE = 120

function getKindLabel(kind: PromptTemplateKind) {
  if (kind === 'scenario') return '场景模板'
  if (kind === 'latest-x') return '最新 X'
  return '案例库'
}

function getPromptPreview(prompt: string) {
  return prompt.length > 360 ? `${prompt.slice(0, 360).trim()}...` : prompt
}

function getImageUrls(item: PromptTemplateItem) {
  return item.imageUrls?.length ? item.imageUrls : item.imageUrl ? [item.imageUrl] : []
}

function matchesKeyword(item: PromptTemplateItem, keyword: string) {
  if (!keyword) return true
  return [
    item.title,
    item.category,
    item.description,
    item.promptText,
    item.author,
    item.sourceName,
    item.sourceRepo,
  ]
    .filter(Boolean)
    .join('\n')
    .toLowerCase()
    .includes(keyword)
}

function FilterButton({
  active,
  children,
  onClick,
}: {
  active: boolean
  children: React.ReactNode
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-md px-3 py-1.5 text-sm transition ${
        active
          ? 'bg-white text-gray-900 shadow-sm dark:bg-white/10 dark:text-white'
          : 'text-gray-500 hover:text-gray-800 dark:hover:text-gray-200'
      }`}
    >
      {children}
    </button>
  )
}

function TemplateCard({
  item,
  onApply,
  onCopy,
  onPreview,
}: {
  item: PromptTemplateItem
  onApply: (item: PromptTemplateItem) => void
  onCopy: (item: PromptTemplateItem) => void
  onPreview: (item: PromptTemplateItem, index: number) => void
}) {
  const imageUrls = getImageUrls(item)
  return (
    <article className="group flex min-h-[22rem] flex-col overflow-hidden rounded-xl border border-gray-200/70 bg-white/80 shadow-sm ring-1 ring-black/[0.02] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md dark:border-white/[0.08] dark:bg-gray-900/70 dark:ring-white/[0.03] dark:hover:border-blue-500/40">
      <div className="relative h-36 overflow-hidden bg-gray-100 dark:bg-white/[0.04]">
        {imageUrls[0] ? (
          <button
            type="button"
            onClick={() => onPreview(item, 0)}
            className="block h-full w-full text-left focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
            aria-label={`预览 ${item.title}`}
            title="点击预览"
          >
            <img
              src={imageUrls[0]}
              alt=""
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            />
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
              <PhotoIcon className="h-3.5 w-3.5" />
              {imageUrls.length > 1 ? `${imageUrls.length} 张` : '预览'}
            </span>
          </button>
        ) : (
          <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,rgba(15,23,42,0.04),rgba(59,130,246,0.10))] px-5 text-center text-xs font-medium text-gray-400 dark:bg-[linear-gradient(135deg,rgba(255,255,255,0.04),rgba(59,130,246,0.10))] dark:text-gray-500">
            {item.sourceName}
          </div>
        )}
        <div className="absolute left-3 top-3 flex max-w-[calc(100%-1.5rem)] flex-wrap gap-1.5">
          <span className="rounded-md bg-white/90 px-2 py-1 text-[11px] font-semibold text-gray-700 shadow-sm backdrop-blur dark:bg-gray-950/80 dark:text-gray-200">
            {item.sourceName}
          </span>
          <span className="rounded-md bg-blue-600/85 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
            {getKindLabel(item.kind)}
          </span>
          <span className="max-w-[12rem] truncate rounded-md bg-black/55 px-2 py-1 text-[11px] font-medium text-white backdrop-blur">
            {item.category}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-2 min-h-[3.25rem]">
          <h2 className="line-clamp-2 text-base font-semibold leading-snug text-gray-900 dark:text-gray-100">
            {item.title}
          </h2>
          {(item.author || item.createdAt || item.stats) && (
            <p className="mt-1 truncate text-[11px] text-gray-400 dark:text-gray-500">
              {[item.author, item.createdAt, item.stats].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>

        {item.description && (
          <p className="mb-3 line-clamp-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
            {item.description}
          </p>
        )}

        <pre className="custom-scrollbar mb-4 max-h-36 flex-1 overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-gray-200/70 bg-gray-50/80 p-3 font-mono text-[11px] leading-relaxed text-gray-600 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-300">
          {getPromptPreview(item.promptText)}
        </pre>

        <div className="mt-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => onApply(item)}
            className="flex-1 rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            使用模板
          </button>
          <button
            type="button"
            onClick={() => onCopy(item)}
            className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-100"
            aria-label="复制模板"
            title="复制"
          >
            <CopyIcon className="h-4 w-4" />
          </button>
          {item.sourceUrl && (
            <a
              href={item.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:bg-white/[0.06] dark:hover:text-gray-100"
              aria-label="查看来源"
              title="查看来源"
            >
              <ExternalLinkIcon className="h-4 w-4" />
            </a>
          )}
        </div>
      </div>
    </article>
  )
}

export default function TemplateWorkspace() {
  const setPrompt = useStore((s) => s.setPrompt)
  const setAppMode = useStore((s) => s.setAppMode)
  const showToast = useStore((s) => s.showToast)
  const [fetchState, setFetchState] = useState<TemplateFetchState>(() => createEmptyTemplateFetchState())
  const [query, setQuery] = useState('')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all')
  const [kindFilter, setKindFilter] = useState<KindFilter>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [preview, setPreview] = useState<{ item: PromptTemplateItem; index: number } | null>(null)

  const loadTemplates = () => {
    setFetchState((state) => ({ ...state, status: 'loading', error: undefined }))
    void fetchPromptTemplates()
      .then((state) => {
        setFetchState(state)
        for (const [sourceId, sourceState] of Object.entries(state.sourceStates)) {
          trackImagePlaygroundEvent(
            sourceState.status === 'success' ? 'template_source_load_success' : 'template_source_load_error',
            {
              sourceId,
              count: sourceState.count,
              error: sourceState.status === 'error' ? sourceState.error : undefined,
            },
          )
        }
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : String(err)
        setFetchState((state) => ({
          ...state,
          status: 'error',
          error: message || '模板加载失败',
        }))
      })
  }

  useEffect(() => {
    loadTemplates()
  }, [])

  const sourceFilteredItems = useMemo(() => fetchState.items.filter((item) => {
    if (sourceFilter === 'xianyu110' && item.sourceId !== 'xianyu110' && item.sourceId !== 'xianyu110-latest-x') return false
    if (sourceFilter !== 'all' && sourceFilter !== 'xianyu110' && item.sourceId !== sourceFilter) return false
    if (kindFilter !== 'all' && item.kind !== kindFilter) return false
    return true
  }), [fetchState.items, kindFilter, sourceFilter])

  const categories = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of sourceFilteredItems) {
      counts.set(item.category, (counts.get(item.category) ?? 0) + 1)
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'zh-CN'))
  }, [sourceFilteredItems])

  useEffect(() => {
    if (categoryFilter !== 'all' && !categories.some(([category]) => category === categoryFilter)) {
      setCategoryFilter('all')
    }
  }, [categories, categoryFilter])

  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
  }, [categoryFilter, kindFilter, query, sourceFilter])

  const filteredItems = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return sourceFilteredItems.filter((item) => {
      if (categoryFilter !== 'all' && item.category !== categoryFilter) return false
      return matchesKeyword(item, keyword)
    })
  }, [categoryFilter, query, sourceFilteredItems])

  const visibleItems = filteredItems.slice(0, visibleCount)
  const failedSources = Object.entries(fetchState.sourceStates).filter(([, state]) => state.status === 'error')
  const loading = fetchState.status === 'loading'
  const hasResults = fetchState.status === 'success' || fetchState.status === 'partial-success'

  const handleApply = (item: PromptTemplateItem) => {
    trackImagePlaygroundEvent('template_apply', {
      templateId: item.id,
      sourceId: item.sourceId,
      kind: item.kind,
      category: item.category,
    })
    setPrompt(item.promptText)
    setAppMode('gallery')
    showToast('已填入模板提示词', 'success')
  }

  const handleCopy = async (item: PromptTemplateItem) => {
    try {
      await copyTextToClipboard(item.promptText)
      trackImagePlaygroundEvent('template_copy', {
        templateId: item.id,
        sourceId: item.sourceId,
        kind: item.kind,
      })
      showToast('模板已复制', 'success')
    } catch (err) {
      showToast(getClipboardFailureMessage('复制失败', err), 'error')
    }
  }

  const handlePreview = (item: PromptTemplateItem, index: number) => {
    trackImagePlaygroundEvent('template_preview_open', {
      templateId: item.id,
      sourceId: item.sourceId,
      kind: item.kind,
      imageCount: getImageUrls(item).length,
    })
    setPreview({ item, index })
  }

  return (
    <main className="pb-48">
      <div className="safe-area-x mx-auto max-w-7xl">
        <section className="mt-6">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400">
                <span className="h-2 w-2 rounded-full bg-blue-500" />
                Awesome GPT-Image-2
              </div>
              <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">模板</h1>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                多源读取模板、案例库和最新 X Prompt，选中后会填入底部输入框。
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
              {fetchState.fetchedAt && <span>刷新于 {new Date(fetchState.fetchedAt).toLocaleTimeString('zh-CN', { hour12: false })}</span>}
              <button
                type="button"
                onClick={loadTemplates}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-300 dark:hover:bg-white/[0.06]"
              >
                <RefreshIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </button>
            </div>
          </div>

          <div className="mb-4 grid gap-3 rounded-xl border border-gray-200/70 bg-white/70 p-3 shadow-sm dark:border-white/[0.08] dark:bg-gray-900/60">
            <label className="relative block">
              <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  trackImagePlaygroundEvent('template_search', { keywordLength: event.target.value.trim().length })
                }}
                type="search"
                placeholder="搜索标题、分类、说明、来源或 prompt..."
                className="w-full rounded-lg border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm text-gray-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-100"
              />
            </label>
            <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1 dark:bg-white/[0.04]">
                {SOURCE_OPTIONS.map((option) => (
                  <FilterButton
                    key={option.id}
                    active={sourceFilter === option.id}
                    onClick={() => {
                      setSourceFilter(option.id)
                      trackImagePlaygroundEvent('template_filter', { filterType: 'source', value: option.id })
                    }}
                  >
                    {option.label}
                  </FilterButton>
                ))}
              </div>
              <div className="flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1 dark:bg-white/[0.04]">
                {KIND_OPTIONS.map((option) => (
                  <FilterButton
                    key={option.value}
                    active={kindFilter === option.value}
                    onClick={() => {
                      setKindFilter(option.value)
                      trackImagePlaygroundEvent('template_filter', { filterType: 'kind', value: option.value })
                    }}
                  >
                    {option.label}
                  </FilterButton>
                ))}
              </div>
            </div>
          </div>

          {failedSources.length > 0 && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span>部分来源加载失败：{failedSources.map(([, state]) => state.label).join('、')}</span>
                <button
                  type="button"
                  onClick={loadTemplates}
                  className="self-start rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700 sm:self-auto"
                >
                  重试失败来源
                </button>
              </div>
            </div>
          )}

          <div className="mb-5 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition ${
                categoryFilter === 'all'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                  : 'border-gray-200 bg-white text-gray-500 hover:text-gray-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:text-gray-100'
              }`}
            >
              全部 {sourceFilteredItems.length}
            </button>
            {categories.map(([category, count]) => (
              <button
                key={category}
                type="button"
                onClick={() => {
                  setCategoryFilter(category)
                  trackImagePlaygroundEvent('template_filter', { filterType: 'category', value: category })
                }}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-sm transition ${
                  categoryFilter === category
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-300'
                    : 'border-gray-200 bg-white text-gray-500 hover:text-gray-900 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-400 dark:hover:text-gray-100'
                }`}
              >
                {category} {count}
              </button>
            ))}
          </div>

          {loading && (
            <div className="flex min-h-[32vh] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white/50 text-sm text-gray-500 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-gray-400">
              正在读取多个模板来源...
            </div>
          )}

          {fetchState.status === 'error' && !fetchState.items.length && !loading && (
            <div className="flex min-h-[32vh] flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50/70 px-5 text-center dark:border-red-500/20 dark:bg-red-500/10">
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">模板加载失败</p>
                <p className="mt-1 text-xs text-red-600/80 dark:text-red-200/80">{fetchState.error}</p>
              </div>
              <button
                type="button"
                onClick={loadTemplates}
                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                重试
              </button>
            </div>
          )}

          {hasResults && filteredItems.length === 0 && (
            <div className="flex min-h-[32vh] items-center justify-center rounded-xl border border-dashed border-gray-200 bg-white/50 px-5 text-center text-sm text-gray-500 dark:border-white/[0.08] dark:bg-white/[0.02] dark:text-gray-400">
              没有找到匹配模板，试试缩短关键词或切换筛选。
            </div>
          )}

          {hasResults && filteredItems.length > 0 && (
            <>
              <div className="mb-3 text-xs text-gray-400 dark:text-gray-500">
                显示 {visibleItems.length} / {filteredItems.length} 个模板
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visibleItems.map((item) => (
                  <TemplateCard
                    key={item.id}
                    item={item}
                    onApply={handleApply}
                    onCopy={handleCopy}
                    onPreview={handlePreview}
                  />
                ))}
              </div>
              {visibleCount < filteredItems.length && (
                <div className="mt-5 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                    className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-gray-300 dark:hover:bg-white/[0.06]"
                  >
                    加载更多
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>

      {preview && (
        <TemplateImagePreview
          images={getImageUrls(preview.item)}
          initialIndex={preview.index}
          title={preview.item.title}
          onClose={() => setPreview(null)}
        />
      )}
    </main>
  )
}
