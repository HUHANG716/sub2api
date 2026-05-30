export const README_URL = 'https://raw.githubusercontent.com/xianyu110/awesome-gptimage2/main/README.md'
export const LATEST_X_URL = 'https://raw.githubusercontent.com/xianyu110/awesome-gptimage2/main/data/latest-prompts.json'
export const EVOLINK_README_ZH_URL = 'https://raw.githubusercontent.com/EvoLinkAI/awesome-gpt-image-2-API-and-Prompts/main/README_zh-CN.md'
export const EVOLINK_README_URL = 'https://raw.githubusercontent.com/EvoLinkAI/awesome-gpt-image-2-API-and-Prompts/main/README.md'
export const YOUMIND_README_ZH_URL = 'https://raw.githubusercontent.com/YouMind-OpenLab/awesome-gpt-image-2/main/README_zh.md'
export const YOUMIND_README_URL = 'https://raw.githubusercontent.com/YouMind-OpenLab/awesome-gpt-image-2/main/README.md'
export const FREESTYLEFLY_CASES_URL = 'https://raw.githubusercontent.com/freestylefly/awesome-gpt-image-2/main/data/cases.json'

export type PromptTemplateSource = 'readme' | 'latest-x' | 'case-library'
export type PromptTemplateSourceId = 'xianyu110' | 'xianyu110-latest-x' | 'evolink' | 'youmind' | 'freestylefly'
export type PromptTemplateKind = 'scenario' | 'latest-x' | 'case-library'
export type TemplateFetchStatus = 'idle' | 'loading' | 'success' | 'partial-success' | 'error'
export type TemplateSourceStatus = 'idle' | 'loading' | 'success' | 'error'

export interface PromptTemplateItem {
  id: string
  /** Backward-compatible broad source bucket. Prefer sourceId for UI filters. */
  source: PromptTemplateSource
  sourceId: PromptTemplateSourceId
  sourceName: string
  sourceRepo: string
  kind: PromptTemplateKind
  title: string
  category: string
  promptText: string
  description?: string
  imageUrl?: string
  imageUrls?: string[]
  sourceUrl?: string
  author?: string
  createdAt?: string
  stats?: string
  language?: string
}

export interface TemplateSourceState {
  status: TemplateSourceStatus
  label: string
  error?: string
  count?: number
  fetchedAt?: number
}

export type TemplateSourceStates = Record<PromptTemplateSourceId, TemplateSourceState>

export interface TemplateFetchState {
  status: TemplateFetchStatus
  items: PromptTemplateItem[]
  sourceStates: TemplateSourceStates
  error?: string
  fetchedAt?: number
}

interface DraftReadmeTemplate {
  title: string
  category: string
  lines: string[]
}

const SOURCE_LABELS: Record<PromptTemplateSourceId, string> = {
  xianyu110: 'xianyu110',
  'xianyu110-latest-x': 'xianyu110 最新 X',
  evolink: 'EvoLinkAI',
  youmind: 'YouMind',
  freestylefly: 'freestylefly',
}

const SOURCE_REPOS: Record<PromptTemplateSourceId, string> = {
  xianyu110: 'xianyu110/awesome-gptimage2',
  'xianyu110-latest-x': 'xianyu110/awesome-gptimage2',
  evolink: 'EvoLinkAI/awesome-gpt-image-2-API-and-Prompts',
  youmind: 'YouMind-OpenLab/awesome-gpt-image-2',
  freestylefly: 'freestylefly/awesome-gpt-image-2',
}

export const PROMPT_TEMPLATE_SOURCE_OPTIONS: Array<{ id: PromptTemplateSourceId; label: string; repo: string }> =
  (Object.keys(SOURCE_LABELS) as PromptTemplateSourceId[]).map((id) => ({
    id,
    label: SOURCE_LABELS[id],
    repo: SOURCE_REPOS[id],
  }))

function cleanCategoryName(value: string) {
  return value
    .trim()
    .replace(/^[^\p{L}\p{N}]+/u, '')
    .replace(/^[一二三四五六七八九十]+[、.．\s]*/, '')
    .replace(/^\d+[、.．\s]*/, '')
    .trim() || '未分类'
}

function stripMarkdown(value: string) {
  return value
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[`*_>#-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function extractMarkdownImageUrls(lines: string[]) {
  const urls: string[] = []
  for (const line of lines) {
    for (const match of line.matchAll(/!\[[^\]]*]\(([^)]+)\)/g)) {
      if (match[1]?.trim()) urls.push(match[1].trim())
    }
  }
  return urls
}

function extractHtmlImageUrls(lines: string[]) {
  const urls: string[] = []
  for (const line of lines) {
    for (const match of line.matchAll(/<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)) {
      if (match[1]?.trim()) urls.push(match[1].trim())
    }
  }
  return urls
}

function uniqueStrings(values: Array<string | undefined>) {
  return [...new Set(values.map((value) => value?.trim()).filter(Boolean) as string[])]
}

function extractFirstImage(lines: string[]) {
  return uniqueStrings([...extractMarkdownImageUrls(lines), ...extractHtmlImageUrls(lines)])[0]
}

function extractFirstCodeBlock(lines: string[], afterLine?: RegExp) {
  let armed = !afterLine
  let inCode = false
  const codeLines: string[] = []
  for (const line of lines) {
    if (!armed) {
      if (afterLine?.test(line.trim())) armed = true
      continue
    }
    if (/^```/.test(line.trim())) {
      if (inCode) break
      inCode = true
      continue
    }
    if (inCode) codeLines.push(line)
  }
  return codeLines.join('\n').trim()
}

function extractDescription(lines: string[], promptText: string) {
  const descriptionLines: string[] = []
  let inCode = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (/^```/.test(trimmed)) {
      inCode = !inCode
      continue
    }
    if (
      inCode ||
      !trimmed ||
      trimmed.startsWith('![') ||
      /^<img\b/i.test(trimmed) ||
      /^\|/.test(trimmed) ||
      /^#+\s/.test(trimmed) ||
      /^\*\*Prompt:\*\*/i.test(trimmed) ||
      /^####\s+📝/.test(trimmed) ||
      trimmed === promptText
    ) {
      continue
    }
    const cleaned = stripMarkdown(trimmed)
    if (cleaned) descriptionLines.push(cleaned)
    if (descriptionLines.join(' ').length > 180) break
  }
  return descriptionLines.join(' ').slice(0, 220).trim() || undefined
}

function withSource(
  item: Omit<PromptTemplateItem, 'sourceName' | 'sourceRepo'>,
): PromptTemplateItem {
  return {
    ...item,
    sourceName: SOURCE_LABELS[item.sourceId],
    sourceRepo: SOURCE_REPOS[item.sourceId],
  }
}

function createReadmeTemplate(draft: DraftReadmeTemplate, index: number): PromptTemplateItem | null {
  const promptText = extractFirstCodeBlock(draft.lines)
  if (!promptText) return null
  const imageUrl = extractFirstImage(draft.lines)
  return withSource({
    id: `readme-${index}`,
    source: 'readme',
    sourceId: 'xianyu110',
    kind: 'scenario',
    title: draft.title,
    category: draft.category,
    sourceUrl: README_URL,
    imageUrl,
    imageUrls: imageUrl ? [imageUrl] : undefined,
    description: extractDescription(draft.lines, promptText),
    promptText,
    language: 'zh',
  })
}

export function parseReadmePromptTemplates(markdown: string): PromptTemplateItem[] {
  const templates: PromptTemplateItem[] = []
  let inPromptSection = false
  let currentCategory = '未分类'
  let currentDraft: DraftReadmeTemplate | null = null

  const finishDraft = () => {
    if (!currentDraft) return
    const template = createReadmeTemplate(currentDraft, templates.length + 1)
    if (template) templates.push(template)
    currentDraft = null
  }

  for (const line of markdown.split(/\r?\n/)) {
    if (/^##\s+提示词合集\s*$/.test(line)) {
      inPromptSection = true
      continue
    }
    if (inPromptSection && /^##\s+/.test(line)) {
      finishDraft()
      break
    }
    if (!inPromptSection) continue

    const categoryMatch = line.match(/^###\s+(.+)/)
    if (categoryMatch?.[1]) {
      finishDraft()
      currentCategory = cleanCategoryName(categoryMatch[1])
      continue
    }

    const titleMatch = line.match(/^####\s+(.+)/)
    if (titleMatch?.[1]) {
      finishDraft()
      currentDraft = {
        title: stripMarkdown(titleMatch[1]) || '未命名模板',
        category: currentCategory,
        lines: [],
      }
      continue
    }

    if (currentDraft) currentDraft.lines.push(line)
  }

  finishDraft()
  return templates
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function getString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function getNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function getLatestXDate(item: Record<string, unknown>, fallbackDate?: string) {
  if (fallbackDate) return fallbackDate
  const createdAt = getString(item.created_at)
  const isoMatch = createdAt.match(/^(\d{4}-\d{2}-\d{2})/)
  if (isoMatch?.[1]) return isoMatch[1]
  const parsed = createdAt ? new Date(createdAt) : null
  if (parsed && !Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10)
  return '最新 X'
}

function getLatestXImageUrls(item: Record<string, unknown>) {
  const urls = Array.isArray(item.image_urls) ? item.image_urls.map(getString) : []
  return uniqueStrings([getString(item.primary_image_url), ...urls])
}

function getLatestXStats(item: Record<string, unknown>) {
  const stats = [
    ['浏览', getNumber(item.view_count)],
    ['转推', getNumber(item.retweet_count)],
    ['点赞', getNumber(item.like_count)],
  ]
    .filter(([, value]) => value != null)
    .map(([label, value]) => `${label} ${value}`)
  return stats.join(' · ') || undefined
}

function createLatestXTemplate(item: Record<string, unknown>, index: number, fallbackDate?: string): PromptTemplateItem | null {
  const promptText = getString(item.prompt)
  if (!promptText) return null
  const author = getString(item.author)
  const text = getString(item.text)
  const imageUrls = getLatestXImageUrls(item)
  return withSource({
    id: `latest-x-${index}`,
    source: 'latest-x',
    sourceId: 'xianyu110-latest-x',
    kind: 'latest-x',
    title: author || `X Prompt #${index}`,
    category: getLatestXDate(item, fallbackDate),
    promptText,
    description: getString(item.reason) || (text ? text.slice(0, 220) : undefined),
    imageUrl: imageUrls[0],
    imageUrls: imageUrls.length ? imageUrls : undefined,
    sourceUrl: getString(item.x_url) || getString(item.url) || undefined,
    author: author || undefined,
    createdAt: getString(item.created_at) || undefined,
    stats: getLatestXStats(item),
  })
}

export function parseLatestXPromptTemplates(payload: unknown): PromptTemplateItem[] {
  if (!isRecord(payload)) return []
  const rawGroups = Array.isArray(payload.dates) ? payload.dates : []
  const templates: PromptTemplateItem[] = []

  if (rawGroups.length > 0) {
    for (const group of rawGroups) {
      if (!isRecord(group) || !Array.isArray(group.items)) continue
      const date = getString(group.date) || undefined
      for (const item of group.items) {
        if (!isRecord(item)) continue
        const template = createLatestXTemplate(item, templates.length + 1, date)
        if (template) templates.push(template)
      }
    }
    return templates
  }

  const rawItems = Array.isArray(payload.items) ? payload.items : []
  for (const item of rawItems) {
    if (!isRecord(item)) continue
    const template = createLatestXTemplate(item, templates.length + 1)
    if (template) templates.push(template)
  }
  return templates
}

export function resolveGitHubRawUrl(url: string | undefined, repo: string, rootPrefix = '') {
  const trimmed = url?.trim()
  if (!trimmed) return undefined
  if (/^https?:\/\//i.test(trimmed) || trimmed.startsWith('data:')) return trimmed
  const cleanPrefix = rootPrefix.replace(/^\/+|\/+$/g, '')
  const cleanPath = trimmed.replace(/^(\.\/|\.\.\/)+/, '').replace(/^\/+/, '')
  const path = cleanPrefix ? `${cleanPrefix}/${cleanPath}` : cleanPath
  return `https://raw.githubusercontent.com/${repo}/main/${path}`
}

function getLanguageFromReadmePath(readmePath: string) {
  if (/README_zh/i.test(readmePath)) return 'zh'
  if (/README_zh-CN/i.test(readmePath)) return 'zh-CN'
  return 'en'
}

function extractCaseBlocks(markdown: string) {
  const blocks: Array<{ heading: string; lines: string[]; category: string }> = []
  let currentCategory = '未分类'
  let current: { heading: string; lines: string[]; category: string } | null = null
  for (const line of markdown.split(/\r?\n/)) {
    const categoryMatch = line.match(/^##\s+(.+)/)
    if (categoryMatch?.[1]) {
      if (current) blocks.push(current)
      current = null
      currentCategory = cleanCategoryName(categoryMatch[1]).replace(/\s+Cases$/i, ' Cases')
      continue
    }
    const caseMatch = line.match(/^###\s+(Case\s+\d+:.+|No\.\s*\d+:.+)/)
    if (caseMatch?.[1]) {
      if (current) blocks.push(current)
      current = { heading: caseMatch[1], lines: [], category: currentCategory }
      continue
    }
    if (current) current.lines.push(line)
  }
  if (current) blocks.push(current)
  return blocks
}

function parseCaseHeading(heading: string) {
  const caseId = heading.match(/^(?:Case|No\.)\s*(\d+)/i)?.[1] || ''
  const linkMatch = heading.match(/\[([^\]]+)]\(([^)]+)\)/)
  const title = stripMarkdown(linkMatch?.[1] || heading.replace(/^(?:Case|No\.)\s*\d+:\s*/i, '')) || `Case ${caseId || '?'}`
  const sourceUrl = linkMatch?.[2]
  const author = heading.match(/\(by\s+(?:\[)?(@[^)\]\s]+)(?:][^)]+)?\)/i)?.[1]
  return { caseId, title, sourceUrl, author }
}

export function parseEvoLinkPromptTemplates(markdown: string, readmePath = 'README.md'): PromptTemplateItem[] {
  return extractCaseBlocks(markdown)
    .filter((block) => /\bCases$/i.test(block.category))
    .map((block, index) => {
      const { caseId, title, sourceUrl, author } = parseCaseHeading(block.heading)
      const promptText = extractFirstCodeBlock(block.lines, /^\*\*Prompt:\*\*/i)
      if (!promptText) return null
      const imageUrls = uniqueStrings([...extractMarkdownImageUrls(block.lines), ...extractHtmlImageUrls(block.lines)])
        .map((url) => resolveGitHubRawUrl(url, SOURCE_REPOS.evolink))
        .filter(Boolean) as string[]
      return withSource({
        id: `evolink-case-${caseId || index + 1}-${index + 1}`,
        source: 'case-library',
        sourceId: 'evolink',
        kind: 'case-library',
        title,
        category: cleanCategoryName(block.category),
        promptText,
        description: extractDescription(block.lines, promptText),
        imageUrl: imageUrls[0],
        imageUrls: imageUrls.length ? imageUrls : undefined,
        sourceUrl,
        author,
        language: getLanguageFromReadmePath(readmePath),
      })
    })
    .filter(Boolean) as PromptTemplateItem[]
}

export function parseYouMindPromptTemplates(markdown: string, readmePath = 'README.md'): PromptTemplateItem[] {
  return extractCaseBlocks(markdown)
    .filter((block) => /^No\./i.test(block.heading))
    .map((block, index) => {
      const { caseId, title } = parseCaseHeading(block.heading)
      const promptText = extractFirstCodeBlock(block.lines, /^####\s+📝\s*提示词/i)
      if (!promptText) return null
      const imageUrls = uniqueStrings([...extractMarkdownImageUrls(block.lines), ...extractHtmlImageUrls(block.lines)])
      const descriptionLines: string[] = []
      let inDescription = false
      for (const line of block.lines) {
        const trimmed = line.trim()
        if (/^####\s+📖/.test(trimmed)) {
          inDescription = true
          continue
        }
        if (/^####\s+/.test(trimmed) && inDescription) break
        if (inDescription && trimmed) descriptionLines.push(trimmed)
      }
      return withSource({
        id: `youmind-no-${caseId || index + 1}-${index + 1}`,
        source: 'case-library',
        sourceId: 'youmind',
        kind: 'case-library',
        title,
        category: cleanCategoryName(block.category),
        promptText,
        description: extractDescription(descriptionLines.length ? descriptionLines : block.lines, promptText),
        imageUrl: imageUrls[0],
        imageUrls: imageUrls.length ? imageUrls : undefined,
        sourceUrl: 'https://github.com/YouMind-OpenLab/awesome-gpt-image-2',
        language: getLanguageFromReadmePath(readmePath),
      })
    })
    .filter(Boolean) as PromptTemplateItem[]
}

export function parseFreestyleFlyPromptTemplates(payload: unknown): PromptTemplateItem[] {
  if (!isRecord(payload) || !Array.isArray(payload.cases)) return []
  return payload.cases
    .map((item) => {
      if (!isRecord(item)) return null
      const promptText = getString(item.prompt)
      if (!promptText) return null
      const rawImageUrl = resolveGitHubRawUrl(getString(item.image), SOURCE_REPOS.freestylefly, 'data')
      const sourceUrl = getString(item.sourceUrl) || getString(item.githubUrl) || 'https://github.com/freestylefly/awesome-gpt-image-2'
      return withSource({
        id: `freestylefly-case-${getString(item.id) || getNumber(item.id) || promptText.slice(0, 12)}`,
        source: 'case-library',
        sourceId: 'freestylefly',
        kind: 'case-library',
        title: getString(item.title) || 'freestylefly case',
        category: getString(item.category) || '未分类',
        promptText,
        description: getString(item.promptPreview) || undefined,
        imageUrl: rawImageUrl,
        imageUrls: rawImageUrl ? [rawImageUrl] : undefined,
        sourceUrl,
        author: getString(item.sourceLabel) || undefined,
      })
    })
    .filter(Boolean) as PromptTemplateItem[]
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

async function fetchText(url: string, fetcher: FetchLike) {
  const response = await fetcher(url, { cache: 'no-store' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.text()
}

async function fetchJson(url: string, fetcher: FetchLike) {
  const response = await fetcher(url, { cache: 'no-store' })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

async function fetchTextWithFallback(primaryUrl: string, fallbackUrl: string, fetcher: FetchLike) {
  try {
    return { text: await fetchText(primaryUrl, fetcher), url: primaryUrl }
  } catch (primaryError) {
    try {
      return { text: await fetchText(fallbackUrl, fetcher), url: fallbackUrl }
    } catch {
      throw primaryError
    }
  }
}

function emptySourceStates(): TemplateSourceStates {
  return {
    xianyu110: { status: 'idle', label: SOURCE_LABELS.xianyu110 },
    'xianyu110-latest-x': { status: 'idle', label: SOURCE_LABELS['xianyu110-latest-x'] },
    evolink: { status: 'idle', label: SOURCE_LABELS.evolink },
    youmind: { status: 'idle', label: SOURCE_LABELS.youmind },
    freestylefly: { status: 'idle', label: SOURCE_LABELS.freestylefly },
  }
}

async function loadSource(sourceId: PromptTemplateSourceId, fetcher: FetchLike): Promise<PromptTemplateItem[]> {
  if (sourceId === 'xianyu110') return parseReadmePromptTemplates(await fetchText(README_URL, fetcher))
  if (sourceId === 'xianyu110-latest-x') return parseLatestXPromptTemplates(await fetchJson(LATEST_X_URL, fetcher))
  if (sourceId === 'evolink') {
    const result = await fetchTextWithFallback(EVOLINK_README_ZH_URL, EVOLINK_README_URL, fetcher)
    return parseEvoLinkPromptTemplates(result.text, result.url.endsWith('README_zh-CN.md') ? 'README_zh-CN.md' : 'README.md')
  }
  if (sourceId === 'youmind') {
    const result = await fetchTextWithFallback(YOUMIND_README_ZH_URL, YOUMIND_README_URL, fetcher)
    return parseYouMindPromptTemplates(result.text, result.url.endsWith('README_zh.md') ? 'README_zh.md' : 'README.md')
  }
  return parseFreestyleFlyPromptTemplates(await fetchJson(FREESTYLEFLY_CASES_URL, fetcher))
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error)
}

export async function fetchPromptTemplates(fetcher: FetchLike = fetch): Promise<TemplateFetchState> {
  const sourceStates = emptySourceStates()
  const sourceIds = PROMPT_TEMPLATE_SOURCE_OPTIONS.map((source) => source.id)
  const settled = await Promise.allSettled(sourceIds.map(async (sourceId) => ({
    sourceId,
    items: await loadSource(sourceId, fetcher),
  })))
  const items: PromptTemplateItem[] = []
  const now = Date.now()

  for (let index = 0; index < sourceIds.length; index += 1) {
    const sourceId = sourceIds[index]
    const result = settled[index]
    if (result.status === 'fulfilled') {
      items.push(...result.value.items)
      sourceStates[sourceId] = {
        status: 'success',
        label: SOURCE_LABELS[sourceId],
        count: result.value.items.length,
        fetchedAt: now,
      }
    } else {
      sourceStates[sourceId] = {
        status: 'error',
        label: SOURCE_LABELS[sourceId],
        error: errorMessage(result.reason),
        count: 0,
      }
    }
  }

  const failed = Object.values(sourceStates).filter((state) => state.status === 'error')
  const status: TemplateFetchStatus = items.length === 0
    ? 'error'
    : failed.length > 0
      ? 'partial-success'
      : 'success'

  return {
    status,
    items,
    sourceStates,
    error: failed.length ? failed.map((state) => `${state.label}: ${state.error}`).join('；') : undefined,
    fetchedAt: now,
  }
}

export function createEmptyTemplateFetchState(status: TemplateFetchStatus = 'idle'): TemplateFetchState {
  return {
    status,
    items: [],
    sourceStates: emptySourceStates(),
  }
}
