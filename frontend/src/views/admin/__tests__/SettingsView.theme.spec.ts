import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const settingsViewSource = readFileSync(resolve(__dirname, '../SettingsView.vue'), 'utf8')
const settingsTabsStyles =
  settingsViewSource.match(/\/\* ============ 系统设置 Tab 导航 ============ \*\/[\s\S]+?<\/style>/)?.[0] ?? ''

describe('admin SettingsView theme styles', () => {
  it('uses shared theme tokens for the settings tab navigation', () => {
    expect(settingsTabsStyles).toContain('background: var(--theme-surface)')
    expect(settingsTabsStyles).toContain('border: 1px solid var(--theme-border)')
    expect(settingsTabsStyles).toContain('color: var(--theme-text-muted)')
    expect(settingsTabsStyles).toContain('background: var(--theme-primary)')
  })

  it('does not hardcode the old settings tab accent colors', () => {
    expect(settingsTabsStyles).not.toContain('#14b8a6')
    expect(settingsTabsStyles).not.toContain('#0ea5e9')
    expect(settingsTabsStyles).not.toContain('rgb(15 23 42 / 0.86)')
  })
})
