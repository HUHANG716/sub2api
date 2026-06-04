import { isProductEmbedMode } from './productEmbed'
import type { ApiMode } from '../types'

export const PRODUCT_EMBED_RECREATE_KEY_EVENT = 'image-playground:recreate-key-request'

export interface ProductEmbedRecreateKeyEventPayload {
  reason: 'image_generation_disabled_for_group'
  apiMode?: ApiMode
}

export function requestProductEmbedKeyRecreation(reason: ProductEmbedRecreateKeyEventPayload['reason'], apiMode?: ApiMode) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  if (!isProductEmbedMode()) return
  if (!window.parent || window.parent === window) return

  const parentOrigin = document.referrer ? new URL(document.referrer).origin : ''
  if (!parentOrigin) return

  window.parent.postMessage({
    type: PRODUCT_EMBED_RECREATE_KEY_EVENT,
    reason,
    ...(apiMode ? { apiMode } : {}),
  }, parentOrigin)
}
