export type ImagePlaygroundEventName =
  | 'template_source_load_success'
  | 'template_source_load_error'
  | 'template_search'
  | 'template_filter'
  | 'template_preview_open'
  | 'template_copy'
  | 'template_apply'
  | 'template_favorite_toggle'
  | 'image_generate_submit'
  | 'image_generate_success'
  | 'image_generate_error'
  | 'agent_image_generate_submit'
  | 'agent_image_generate_success'
  | 'agent_image_generate_error'

export type ImagePlaygroundAnalyticsPayload = Record<string, unknown>

export interface ImagePlaygroundAnalyticsEvent {
  name: ImagePlaygroundEventName
  payload: ImagePlaygroundAnalyticsPayload
  timestamp: number
}

const BLOCKED_PAYLOAD_KEYS = new Set([
  'prompt',
  'promptText',
  'apiKey',
  'key',
  'image',
  'imageDataUrl',
  'dataUrl',
  'inputImageDataUrls',
  'maskDataUrl',
  'b64_json',
  'base64',
])

function sanitizePayload(payload: ImagePlaygroundAnalyticsPayload = {}) {
  const sanitized: ImagePlaygroundAnalyticsPayload = {}
  for (const [key, value] of Object.entries(payload)) {
    if (BLOCKED_PAYLOAD_KEYS.has(key)) continue
    if (typeof value === 'string' && (value.startsWith('data:image/') || value.startsWith('sk-'))) continue
    if (Array.isArray(value)) {
      sanitized[key] = value.filter((item) => typeof item !== 'string' || (!item.startsWith('data:image/') && !item.startsWith('sk-')))
      continue
    }
    if (value == null || ['string', 'number', 'boolean'].includes(typeof value)) {
      sanitized[key] = value
    }
  }
  return sanitized
}

export function createImagePlaygroundEvent(
  name: ImagePlaygroundEventName,
  payload: ImagePlaygroundAnalyticsPayload = {},
  now = Date.now(),
): ImagePlaygroundAnalyticsEvent {
  return {
    name,
    payload: sanitizePayload(payload),
    timestamp: now,
  }
}

export function trackImagePlaygroundEvent(name: ImagePlaygroundEventName, payload: ImagePlaygroundAnalyticsPayload = {}) {
  if (typeof window === 'undefined') return
  const event = createImagePlaygroundEvent(name, payload)
  window.dispatchEvent(new CustomEvent('image-playground:analytics', { detail: event }))
  if (window.parent && window.parent !== window) {
    const parentOrigin = document.referrer ? new URL(document.referrer).origin : ''
    if (parentOrigin) {
      window.parent.postMessage({ type: 'image-playground:analytics', event }, parentOrigin)
    }
  }
}
