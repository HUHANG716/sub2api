import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('main theme bootstrap', () => {
  const originalMatchMedia = window.matchMedia

  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
    document.documentElement.classList.remove('dark')
  })

  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('uses the system dark preference when the user has not saved a theme', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia

    const { initThemeClass } = await import('@/utils/themeBootstrap')
    initThemeClass()

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('uses the system light preference when the user has not saved a theme', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia

    const { initThemeClass } = await import('@/utils/themeBootstrap')
    initThemeClass()

    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('keeps an explicit saved theme above the system preference', async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia
    localStorage.setItem('theme', 'dark')

    const { initThemeClass } = await import('@/utils/themeBootstrap')
    initThemeClass()

    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
