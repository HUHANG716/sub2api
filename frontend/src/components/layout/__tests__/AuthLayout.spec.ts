import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const testDir = dirname(fileURLToPath(import.meta.url))
const layoutSource = readFileSync(resolve(testDir, '../AuthLayout.vue'), 'utf8')
const authViewDir = resolve(testDir, '../../../views/auth')
const authViewFiles = [
  'LoginView.vue',
  'RegisterView.vue',
  'ForgotPasswordView.vue',
  'ResetPasswordView.vue',
  'EmailVerifyView.vue',
  'LinuxDoCallbackView.vue',
  'DingTalkCallbackView.vue',
  'DingTalkEmailCompletionView.vue',
  'OidcCallbackView.vue',
  'WechatCallbackView.vue'
]
const authViewSources = authViewFiles.map((fileName) => ({
  fileName,
  source: readFileSync(resolve(authViewDir, fileName), 'utf8')
}))
const loginViewSource = authViewSources.find(({ fileName }) => fileName === 'LoginView.vue')?.source ?? ''

describe('AuthLayout split variant', () => {
  it('keeps split auth layout available as the default layout', () => {
    expect(layoutSource).toContain("variant?: 'centered' | 'split'")
    expect(layoutSource).toContain("withDefaults(defineProps")
    expect(layoutSource).toContain("variant: 'split'")
  })

  it('routes all auth pages through the shared AuthLayout shell', () => {
    authViewSources.forEach(({ source }) => {
      expect(source).toContain('<AuthLayout')
    })
  })

  it('renders a split layout with a replaceable visual area', () => {
    expect(layoutSource).toContain("layoutVariant === 'split'")
    expect(layoutSource).toContain('auth-split-shell')
    expect(layoutSource).toContain('auth-split-form')
    expect(layoutSource).toContain('auth-split-divider')
    expect(layoutSource).toContain('auth-split-visual')
    expect(layoutSource).toContain('<slot name="visual">')
    expect(layoutSource).toContain('grid-template-columns: 40% minmax(0, 1fr);')
  })

  it('keeps the split layout as two panels instead of card-like visual containers', () => {
    expect(layoutSource).toContain('auth-brand-visual')
    expect(layoutSource).not.toContain('auth-visual-frame')
    expect(layoutSource).not.toContain('auth-split-card')
    expect(layoutSource).not.toContain('border-radius: 2rem')
  })

  it('centers the left panel content vertically and types the right brand name', () => {
    expect(layoutSource).toContain('align-items: center;')
    expect(layoutSource).toContain('auth-brand-visual__typed')
    expect(layoutSource).toContain('@keyframes auth-brand-type')
    expect(layoutSource).toContain('@keyframes auth-brand-caret')
  })

  it('centers the auth form when the split layout collapses on narrow screens', () => {
    expect(layoutSource).toContain('@media (max-width: 1023px)')
    expect(layoutSource).toContain('justify-content: center;')
    expect(layoutSource).toContain('margin-inline: auto;')
  })

  it('keeps login password mask glyphs on the same size as revealed text', () => {
    expect(loginViewSource).toContain('auth-password-input')
    expect(loginViewSource).toContain(".auth-password-input[type='password'] {")
    expect(loginViewSource).toContain('font-family: ui-sans-serif, system-ui')
    expect(loginViewSource).toContain('letter-spacing: 0;')
    expect(loginViewSource).not.toContain(".auth-password-input[type='password']:not(:placeholder-shown)")
    expect(loginViewSource).not.toContain('font-size: 13px;')
    expect(loginViewSource).not.toContain(".auth-password-input[type='text']")
  })
})
