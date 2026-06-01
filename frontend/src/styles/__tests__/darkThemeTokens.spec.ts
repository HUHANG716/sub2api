import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const styleSource = readFileSync(resolve(process.cwd(), 'src/style.css'), 'utf-8')
const homeSource = readFileSync(resolve(process.cwd(), 'src/views/HomeView.vue'), 'utf-8')
const authLayoutSource = readFileSync(resolve(process.cwd(), 'src/components/layout/AuthLayout.vue'), 'utf-8')
const dashboardSource = readFileSync(resolve(process.cwd(), 'src/views/admin/DashboardView.vue'), 'utf-8')
const accountsSource = readFileSync(resolve(process.cwd(), 'src/views/admin/AccountsView.vue'), 'utf-8')

describe('dark theme tokens', () => {
  it('uses a Supabase-like neutral dark palette while keeping burnt mandarin accents', () => {
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
    expect(combinedThemeSource).toContain('--theme-primary: #d97732')
    expect(combinedThemeSource).toContain('--theme-primary-hover: #ef9a5c')
    expect(combinedThemeSource).toContain('--theme-accent: #d97732')
    expect(combinedThemeSource).toContain('--auth-bg: #171717')
    expect(combinedThemeSource).toContain('--landing-bg: #171717')

    expect(combinedThemeSource).not.toContain('#38bdf8')
    expect(combinedThemeSource).not.toContain('#22d3ee')
    expect(combinedThemeSource).not.toContain('rgba(56, 189, 248')
    expect(combinedThemeSource).not.toContain('rgba(34, 211, 238')
  })

  it('softens the light shell with the burnt mandarin theme tokens', () => {
    expect(styleSource).toContain('--theme-bg: #e8e6df')
    expect(styleSource).toContain('--theme-bg-soft: #d9d6cc')
    expect(styleSource).toContain('--theme-bg-deep: #c9c5b9')
    expect(styleSource).toContain('--theme-surface: rgba(245, 243, 236, 0.96)')
    expect(styleSource).toContain('--theme-surface-strong: #f6f3ec')
    expect(styleSource).toContain('--theme-surface-muted: rgba(230, 227, 217, 0.94)')
    expect(styleSource).toContain('--theme-primary: #c65a1e')
    expect(styleSource).toContain('--theme-primary-hover: #a94718')
    expect(styleSource).toContain('--theme-primary-soft: rgba(198, 90, 30, 0.12)')
    expect(styleSource).not.toContain('--theme-bg-deep: #18201a')
    expect(styleSource).not.toContain('--theme-primary: #f97316')
    expect(styleSource).not.toContain('--theme-bg: #ecefe9')
  })

  it('keeps dashboard cards outlined with theme borders', () => {
    const cardBlock = styleSource.match(/\.card\s*\{[^}]*\}/)?.[0] ?? ''
    const cardGlassBlock = styleSource.match(/\.card-glass\s*\{[^}]*\}/)?.[0] ?? ''

    expect(cardBlock).toContain('border: 1px solid var(--theme-border)')
    expect(cardGlassBlock).toContain('border: 1px solid var(--theme-border)')
    expect(cardBlock).not.toContain('border: 1px solid transparent')
    expect(cardGlassBlock).not.toContain('border: 1px solid transparent')
  })

  it('keeps admin dashboard metrics aligned with regular dashboard card styling', () => {
    expect(dashboardSource).toContain('admin-metrics-row')
    expect(dashboardSource).toContain('admin-metric-card card')
    expect(dashboardSource).toContain('admin-metric-card-icon')
    expect(dashboardSource).toContain('lg:grid-cols-5')
    expect(dashboardSource).toContain('lg:grid-cols-4')
    expect(dashboardSource).not.toContain('admin-metrics-grid')
    expect(dashboardSource).not.toContain('admin-metrics-panel')
    expect(dashboardSource).not.toContain('background: var(--theme-surface);')
    expect(styleSource).not.toContain('.dashboard-stat-card')
    expect(dashboardSource).not.toContain('dashboard-stat-icon')
    expect(dashboardSource).not.toContain('dashboard-stat-card')
  })

  it('uses theme tokens for the accounts more actions dropdown', () => {
    expect(accountsSource).toContain('class="account-tools-menu"')
    expect(accountsSource).toContain('account-tools-menu-icon account-tools-menu-icon-primary')
    expect(accountsSource).toContain('account-tools-menu-icon account-tools-menu-icon-warm')
    expect(accountsSource).toContain('account-tools-menu-icon account-tools-menu-icon-neutral')
    expect(accountsSource).toContain('background: var(--theme-surface);')
    expect(accountsSource).toContain('border: 1px solid var(--theme-border);')
    expect(accountsSource).not.toContain('border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800')
    expect(accountsSource).not.toMatch(/account-tools-menu-icon bg-(blue|emerald|violet|amber|slate)-/)
  })
})
