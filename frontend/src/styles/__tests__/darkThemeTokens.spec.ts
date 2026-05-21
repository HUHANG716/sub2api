import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const styleSource = readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf-8')
const homeSource = readFileSync(resolve(process.cwd(), 'src/views/HomeView.vue'), 'utf-8')
const authLayoutSource = readFileSync(resolve(process.cwd(), 'src/components/layout/AuthLayout.vue'), 'utf-8')

describe('dark theme tokens', () => {
  it('uses a Supabase-like neutral dark palette while keeping orange accents', () => {
    const combinedThemeSource = `${styleSource}\n${homeSource}\n${authLayoutSource}`

    expect(combinedThemeSource).toContain('--theme-bg: #171717')
    expect(combinedThemeSource).toContain('--theme-bg-soft: #1c1c1c')
    expect(combinedThemeSource).toContain('--theme-bg-deep: #0f0f0f')
    expect(combinedThemeSource).toContain('--theme-text: #f8fafc')
    expect(combinedThemeSource).toContain('--theme-text-muted: #c4cfdc')
    expect(combinedThemeSource).toContain('--landing-muted: #c4cfdc')
    expect(combinedThemeSource).toContain('color: var(--theme-text-muted);')
    expect(combinedThemeSource).toContain('--theme-surface: rgba(31, 31, 31, 0.96)')
    expect(combinedThemeSource).toContain('--theme-surface-strong: #242424')
    expect(combinedThemeSource).toContain('--theme-surface-muted: rgba(38, 38, 38, 0.92)')
    expect(combinedThemeSource).toContain('--theme-main-surface: #171717')
    expect(combinedThemeSource).toContain('--theme-border: rgba(255, 255, 255, 0.08)')
    expect(combinedThemeSource).toContain('--theme-primary: #f97316')
    expect(combinedThemeSource).toContain('--theme-primary-hover: #fb923c')
    expect(combinedThemeSource).toContain('--theme-accent: #f97316')
    expect(combinedThemeSource).toContain('--auth-bg: #171717')
    expect(combinedThemeSource).toContain('--landing-bg: #171717')

    expect(combinedThemeSource).not.toContain('#38bdf8')
    expect(combinedThemeSource).not.toContain('#22d3ee')
    expect(combinedThemeSource).not.toContain('rgba(56, 189, 248')
    expect(combinedThemeSource).not.toContain('rgba(34, 211, 238')
  })

  it('keeps dashboard cards outlined with theme borders', () => {
    const cardBlock = styleSource.match(/\.card\s*\{[^}]*\}/)?.[0] ?? ''
    const cardGlassBlock = styleSource.match(/\.card-glass\s*\{[^}]*\}/)?.[0] ?? ''

    expect(cardBlock).toContain('border: 1px solid var(--theme-border)')
    expect(cardGlassBlock).toContain('border: 1px solid var(--theme-border)')
    expect(cardBlock).not.toContain('border: 1px solid transparent')
    expect(cardGlassBlock).not.toContain('border: 1px solid transparent')
  })
})
