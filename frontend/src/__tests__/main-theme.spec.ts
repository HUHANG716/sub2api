import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const mainSourcePath = path.resolve(process.cwd(), 'src/main.ts')

describe('main theme bootstrap', () => {
  it('defaults to dark theme when the user has not saved a theme preference', () => {
    const source = readFileSync(mainSourcePath, 'utf-8')
    const initThemeBlock = source.match(/function initThemeClass\(\) \{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(initThemeBlock).toContain("savedTheme !== 'light'")
    expect(initThemeBlock).not.toContain('prefers-color-scheme: dark')
    expect(initThemeBlock).not.toContain('matchMedia')
  })
})
