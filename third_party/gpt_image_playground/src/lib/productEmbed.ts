export const PRODUCT_EMBED_QUERY_VALUE = 'product'
export const PRODUCT_EMBED_MODE_STORAGE_KEY = 'hahacode.imagePlayground.productEmbed'

export function isProductEmbedMode(search = window.location.search): boolean {
  if (new URLSearchParams(search).get('embed') === PRODUCT_EMBED_QUERY_VALUE) return true

  try {
    return window.sessionStorage.getItem(PRODUCT_EMBED_MODE_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function rememberProductEmbedMode() {
  try {
    window.sessionStorage.setItem(PRODUCT_EMBED_MODE_STORAGE_KEY, 'true')
  } catch {
    // Ignore storage failures; URL based detection still covers the initial render.
  }
}
