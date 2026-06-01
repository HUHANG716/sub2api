import { isProductEmbedMode } from './productEmbed'

export const PRODUCT_EMBED_THEME_EVENT = 'hahacode:image-playground-theme'

export type ProductEmbedTheme = 'light' | 'dark'

function normalizeTheme(value: unknown): ProductEmbedTheme | null {
  return value === 'light' || value === 'dark' ? value : null
}

export function applyProductEmbedTheme(theme: ProductEmbedTheme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.dataset.theme = theme
}

function getParentOrigin() {
  try {
    return document.referrer ? new URL(document.referrer).origin : ''
  } catch {
    return ''
  }
}

export function syncInitialProductEmbedTheme() {
  if (!isProductEmbedMode()) return () => {}

  const searchTheme = normalizeTheme(new URLSearchParams(window.location.search).get('theme'))
  if (searchTheme) applyProductEmbedTheme(searchTheme)

  const handleMessage = (event: MessageEvent) => {
    const parentOrigin = getParentOrigin()
    if (parentOrigin && event.origin !== parentOrigin) return
    const data = event.data as { type?: unknown; theme?: unknown } | null
    if (!data || data.type !== PRODUCT_EMBED_THEME_EVENT) return
    const nextTheme = normalizeTheme(data.theme)
    if (nextTheme) applyProductEmbedTheme(nextTheme)
  }

  window.addEventListener('message', handleMessage)

  const parentOrigin = getParentOrigin()
  if (window.parent && window.parent !== window && parentOrigin) {
    window.parent.postMessage({
      type: PRODUCT_EMBED_THEME_EVENT,
      request: true,
    }, parentOrigin)
  }

  return () => window.removeEventListener('message', handleMessage)
}
