import { describe, expect, it, vi } from 'vitest'
import { createI18n } from '../../../node_modules/vue-i18n/dist/vue-i18n.mjs'
import en from '../locales/en'
import zh from '../locales/zh'

function collectStrings(value: unknown, prefix: string, out: Array<[string, string]> = []): Array<[string, string]> {
  if (typeof value === 'string') {
    out.push([prefix, value])
    return out
  }

  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      collectStrings(child, prefix ? `${prefix}.${key}` : key, out)
    }
  }

  return out
}

describe('home i18n messages', () => {
  it.each([
    ['en', en],
    ['zh', zh]
  ])('renders the terminal JSON preview without i18n compiler errors for %s', (_locale, messages) => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const i18n = createI18n({
      legacy: false,
      locale: 'test',
      messages: { test: messages }
    })

    expect(i18n.global.t('home.modern.console.lines.report')).toBe('{ "content": "Hello!" }')
    expect(consoleError).not.toHaveBeenCalled()

    consoleError.mockRestore()
  })

  it.each([
    ['en', en],
    ['zh', zh]
  ])('compiles every home message without i18n compiler errors for %s', (_locale, messages) => {
    const i18n = createI18n({
      legacy: false,
      locale: 'test',
      messages: { test: messages }
    })
    const failures: string[] = []

    for (const [key] of collectStrings(messages.home, 'home')) {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      try {
        i18n.global.t(key)
      } catch (error) {
        failures.push(`${key}: ${(error as Error).message}`)
      }
      if (consoleError.mock.calls.length > 0) {
        failures.push(`${key}: ${consoleError.mock.calls.map((call) => call.join(' ')).join(' | ')}`)
      }
      consoleError.mockRestore()
    }

    expect(failures).toEqual([])
  })
})
