import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const styleSource = readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf-8')
const homeSource = readFileSync(resolve(process.cwd(), 'src/views/HomeView.vue'), 'utf-8')
const authLayoutSource = readFileSync(resolve(process.cwd(), 'src/components/layout/AuthLayout.vue'), 'utf-8')

describe('dark theme tokens', () => {
  it('uses a softened graphite palette without cyan theme accents', () => {
    const combinedThemeSource = `${styleSource}\n${homeSource}\n${authLayoutSource}`

    expect(combinedThemeSource).toContain('--theme-bg: #0f1218')
    expect(combinedThemeSource).toContain('--theme-bg-soft: #12151b')
    expect(combinedThemeSource).toContain('--theme-bg-deep: #0b0e13')
    expect(combinedThemeSource).toContain('--theme-text: #f8fafc')
    expect(combinedThemeSource).toContain('--theme-text-muted: #c4cfdc')
    expect(combinedThemeSource).toContain('--landing-muted: #c4cfdc')
    expect(combinedThemeSource).toContain('color: var(--theme-text-muted);')
    expect(combinedThemeSource).toContain('--theme-surface: rgba(34, 40, 50, 0.96)')
    expect(combinedThemeSource).toContain('--theme-surface-strong: #252c38')
    expect(combinedThemeSource).toContain('--theme-surface-muted: rgba(23, 28, 37, 0.9)')
    expect(combinedThemeSource).toContain('--theme-main-surface: #161a22')
    expect(combinedThemeSource).toContain('--theme-border: rgba(170, 181, 198, 0.18)')
    expect(combinedThemeSource).toContain('--theme-accent: #f97316')
    expect(combinedThemeSource).toContain('--auth-bg: #12151b')
    expect(combinedThemeSource).toContain('--landing-bg: #12151b')

    expect(combinedThemeSource).not.toContain('#38bdf8')
    expect(combinedThemeSource).not.toContain('#22d3ee')
    expect(combinedThemeSource).not.toContain('rgba(56, 189, 248')
    expect(combinedThemeSource).not.toContain('rgba(34, 211, 238')
  })
})
