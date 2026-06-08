import { resolveDocumentTitle } from './title'

export interface RouteSeoMeta {
  title?: string
  titleKey?: string
  seoTitle?: string
  seoDescription?: string
  seoKeywords?: string[]
  canonicalPath?: string
  structuredData?: Record<string, unknown>
}

export interface ResolvedRouteSeo {
  title: string
  description: string
  keywords: string
  canonicalUrl: string
  structuredData?: Record<string, unknown>
}

const defaultDescription =
  'Hahacode is an AI API Gateway for OpenAI, Claude and Gemini compatible API access.'

const defaultKeywords = [
  'Hahacode',
  'AI API Gateway',
  'OpenAI API',
  'Claude API',
  'Gemini API',
]

function normalizeSiteName(siteName?: string): string {
  return typeof siteName === 'string' && siteName.trim() ? siteName.trim() : 'Hahacode'
}

function resolveBaseUrl(currentUrl?: string): URL {
  if (currentUrl) {
    return new URL(currentUrl, 'https://code.hahacode.top')
  }

  if (typeof window !== 'undefined' && window.location?.href) {
    return new URL(window.location.href)
  }

  return new URL('https://code.hahacode.top/home')
}

function resolveCanonicalUrl(canonicalPath: string | undefined, currentUrl?: string): string {
  const baseUrl = resolveBaseUrl(currentUrl)
  const pathname = canonicalPath || baseUrl.pathname || '/home'
  return new URL(pathname, `${baseUrl.protocol}//${baseUrl.host}`).toString()
}

function ensureMeta(selector: string, attrs: Record<string, string>): HTMLMetaElement {
  let el = document.head.querySelector<HTMLMetaElement>(selector)
  if (!el) {
    el = document.createElement('meta')
    document.head.appendChild(el)
  }
  Object.entries(attrs).forEach(([key, value]) => el?.setAttribute(key, value))
  return el
}

function ensureLink(selector: string, attrs: Record<string, string>): HTMLLinkElement {
  let el = document.head.querySelector<HTMLLinkElement>(selector)
  if (!el) {
    el = document.createElement('link')
    document.head.appendChild(el)
  }
  Object.entries(attrs).forEach(([key, value]) => el?.setAttribute(key, value))
  return el
}

function ensureStructuredData(data?: Record<string, unknown>) {
  const selector = 'script[type="application/ld+json"][data-route-seo="true"]'
  const existing = document.head.querySelector<HTMLScriptElement>(selector)

  if (!data) {
    existing?.remove()
    return
  }

  const el = existing || document.createElement('script')
  el.type = 'application/ld+json'
  el.dataset.routeSeo = 'true'
  el.textContent = JSON.stringify(data)
  if (!existing) document.head.appendChild(el)
}

export function resolveRouteSeo(meta: RouteSeoMeta, siteName?: string, currentUrl?: string): ResolvedRouteSeo {
  const normalizedSiteName = normalizeSiteName(siteName)
  const title = meta.seoTitle
    ? `${meta.seoTitle} - ${normalizedSiteName}`
    : resolveDocumentTitle(meta.title, normalizedSiteName, meta.titleKey)
  const description = meta.seoDescription || defaultDescription
  const keywords = (meta.seoKeywords?.length ? meta.seoKeywords : defaultKeywords).join(', ')

  return {
    title,
    description,
    keywords,
    canonicalUrl: resolveCanonicalUrl(meta.canonicalPath, currentUrl),
    structuredData: meta.structuredData,
  }
}

export function applyRouteSeo(meta: RouteSeoMeta, siteName?: string, currentUrl?: string): ResolvedRouteSeo {
  const seo = resolveRouteSeo(meta, siteName, currentUrl)

  document.title = seo.title
  ensureMeta('meta[name="description"]', { name: 'description', content: seo.description })
  ensureMeta('meta[name="keywords"]', { name: 'keywords', content: seo.keywords })
  ensureMeta('meta[property="og:title"]', { property: 'og:title', content: seo.title })
  ensureMeta('meta[property="og:description"]', { property: 'og:description', content: seo.description })
  ensureMeta('meta[property="og:type"]', { property: 'og:type', content: 'website' })
  ensureMeta('meta[property="og:url"]', { property: 'og:url', content: seo.canonicalUrl })
  ensureMeta('meta[name="twitter:card"]', { name: 'twitter:card', content: 'summary' })
  ensureMeta('meta[name="twitter:title"]', { name: 'twitter:title', content: seo.title })
  ensureMeta('meta[name="twitter:description"]', { name: 'twitter:description', content: seo.description })
  ensureLink('link[rel="canonical"]', { rel: 'canonical', href: seo.canonicalUrl })
  ensureStructuredData(seo.structuredData)

  return seo
}
