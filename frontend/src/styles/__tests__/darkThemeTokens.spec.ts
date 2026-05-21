import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const styleSource = readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf-8')
const homeSource = readFileSync(resolve(process.cwd(), 'src/views/HomeView.vue'), 'utf-8')
const authLayoutSource = readFileSync(resolve(process.cwd(), 'src/components/layout/AuthLayout.vue'), 'utf-8')

describe('dark theme tokens', () => {
  it('uses a softened graphite palette without cyan theme accents', () => {
    const combinedThemeSource = `${styleSource}\n${homeSource}\n${authLayoutSource}`

    expect(combinedThemeSource).toContain('--theme-bg: #12151b')
    expect(combinedThemeSource).toContain('--theme-main-surface: #1b2028')
    expect(combinedThemeSource).toContain('--theme-accent: #f97316')
    expect(combinedThemeSource).toContain('--auth-bg: #12151b')
    expect(combinedThemeSource).toContain('--landing-bg: #12151b')

    expect(combinedThemeSource).not.toContain('#38bdf8')
    expect(combinedThemeSource).not.toContain('#22d3ee')
    expect(combinedThemeSource).not.toContain('rgba(56, 189, 248')
    expect(combinedThemeSource).not.toContain('rgba(34, 211, 238')
  })
})
