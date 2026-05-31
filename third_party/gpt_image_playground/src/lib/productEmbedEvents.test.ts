import { describe, expect, it, vi } from 'vitest'
import { PRODUCT_EMBED_RECREATE_KEY_EVENT, requestProductEmbedKeyRecreation } from './productEmbedEvents'

describe('product embed events', () => {
  it('requests parent key recreation only in product embed mode', () => {
    const postMessage = vi.fn()
    const originalWindow = globalThis.window
    const originalDocument = globalThis.document

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: { search: '?embed=product' },
        sessionStorage: { getItem: vi.fn() },
        parent: { postMessage },
      },
    })
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        referrer: 'https://code.example.com/image-playground',
      },
    })

    try {
      requestProductEmbedKeyRecreation('image_generation_disabled_for_group')
    } finally {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
      })
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: originalDocument,
      })
    }

    expect(postMessage).toHaveBeenCalledWith({
      type: PRODUCT_EMBED_RECREATE_KEY_EVENT,
      reason: 'image_generation_disabled_for_group',
    }, 'https://code.example.com')
  })

  it('does not post outside product embed mode', () => {
    const postMessage = vi.fn()
    const originalWindow = globalThis.window
    const originalDocument = globalThis.document

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        location: { search: '' },
        sessionStorage: { getItem: vi.fn(() => null) },
        parent: { postMessage },
      },
    })
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        referrer: 'https://code.example.com/image-playground',
      },
    })

    try {
      requestProductEmbedKeyRecreation('image_generation_disabled_for_group')
    } finally {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
      })
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: originalDocument,
      })
    }

    expect(postMessage).not.toHaveBeenCalled()
  })
})
