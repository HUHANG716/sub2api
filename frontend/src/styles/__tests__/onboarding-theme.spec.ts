import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

const onboardingCss = readFileSync(resolve(__dirname, '../onboarding.css'), 'utf8')
const zhLocale = readFileSync(resolve(__dirname, '../../i18n/locales/zh.ts'), 'utf8')
const enLocale = readFileSync(resolve(__dirname, '../../i18n/locales/en.ts'), 'utf8')

describe('onboarding tour theme styles', () => {
  it('uses shared theme tokens for the popover shell', () => {
    expect(onboardingCss).toContain('background-color: var(--theme-surface-strong)')
    expect(onboardingCss).toContain('border: 1px solid var(--theme-border)')
    expect(onboardingCss).toContain('color: var(--theme-text-muted)')
  })

  it('uses shared action tokens for navigation buttons', () => {
    expect(onboardingCss).toContain('background-color: var(--theme-primary)')
    expect(onboardingCss).toContain('background-color: var(--theme-primary-hover)')
  })

  it('does not hardcode the old tour accent color in onboarding content', () => {
    expect(onboardingCss).not.toContain('#14b8a6')
    expect(zhLocale).not.toContain('#10b981')
    expect(enLocale).not.toContain('#10b981')
  })
})
