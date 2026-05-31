import { isProductEmbedMode } from './productEmbed'

export const PRODUCT_EMBED_RECREATE_KEY_EVENT = 'image-playground:recreate-key-request'

export interface ProductEmbedRecreateKeyEventPayload {
  reason: 'image_generation_disabled_for_group'
}

export function requestProductEmbedKeyRecreation(reason: ProductEmbedRecreateKeyEventPayload['reason']) {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  if (!isProductEmbedMode()) return
  if (!window.parent || window.parent === window) return

  const parentOrigin = document.referrer ? new URL(document.referrer).origin : ''
  if (!parentOrigin) return

  window.parent.postMessage({
    type: PRODUCT_EMBED_RECREATE_KEY_EVENT,
    reason,
  }, parentOrigin)
}
