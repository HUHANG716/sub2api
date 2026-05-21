import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const componentPath = resolve(dirname(fileURLToPath(import.meta.url)), '../VersionBadge.vue')
const componentSource = readFileSync(componentPath, 'utf8')

describe('VersionBadge theme styles', () => {
  it('uses shared theme tokens for the dropdown surface', () => {
    expect(componentSource).toContain('background: var(--theme-surface-strong);')
    expect(componentSource).toContain('border: 1px solid var(--theme-border);')
    expect(componentSource).toContain('color: var(--theme-text')
  })

  it('does not hard-code the dark dropdown surface with Tailwind dark colors', () => {
    const dropdownMatch = componentSource.match(/class="[^"]*version-dropdown[^"]*"/)

    expect(dropdownMatch).not.toBeNull()
    expect(dropdownMatch?.[0]).not.toContain('dark:bg-dark-800')
    expect(dropdownMatch?.[0]).not.toContain('bg-white')
  })
})
