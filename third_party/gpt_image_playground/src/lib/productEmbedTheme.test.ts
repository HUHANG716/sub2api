import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyProductEmbedTheme, PRODUCT_EMBED_THEME_EVENT, syncInitialProductEmbedTheme } from './productEmbedTheme'

function stubDocument(referrer = '') {
  const classes = new Set<string>()
  const documentElement = {
    dataset: {} as Record<string, string>,
    classList: {
      toggle: (name: string, force?: boolean) => {
        if (force) classes.add(name)
        else classes.delete(name)
      },
      contains: (name: string) => classes.has(name),
      remove: (name: string) => classes.delete(name),
    },
    removeAttribute: (name: string) => {
      if (name === 'data-theme') delete documentElement.dataset.theme
    },
  }
  vi.stubGlobal('document', {
    documentElement,
    referrer,
  })
  return documentElement
}

describe('product embed theme sync', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('applies explicit dark and light theme messages to the app root', () => {
    const documentElement = stubDocument()

    applyProductEmbedTheme('dark')
    expect(documentElement.classList.contains('dark')).toBe(true)
    expect(documentElement.dataset.theme).toBe('dark')

    applyProductEmbedTheme('light')
    expect(documentElement.classList.contains('dark')).toBe(false)
    expect(documentElement.dataset.theme).toBe('light')
  })

  it('requests the initial parent theme in product embed mode', () => {
    const postMessage = vi.fn()
    const documentElement = stubDocument('https://code.example.com/image-playground')
    vi.stubGlobal('window', {
      location: { search: '?embed=product' },
      sessionStorage: { getItem: vi.fn() },
      parent: { postMessage },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })

    const cleanup = syncInitialProductEmbedTheme()

    expect(documentElement.classList.contains('dark')).toBe(false)
    expect(window.addEventListener).toHaveBeenCalledWith('message', expect.any(Function))
    expect(postMessage).toHaveBeenCalledWith({
      type: PRODUCT_EMBED_THEME_EVENT,
      request: true,
    }, 'https://code.example.com')

    cleanup()
    expect(window.removeEventListener).toHaveBeenCalledWith('message', expect.any(Function))
  })
})
