import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const componentPath = resolve(dirname(fileURLToPath(import.meta.url)), '../GroupCapacityBadge.vue')
const componentSource = readFileSync(componentPath, 'utf8')

describe('GroupCapacityBadge theme styles', () => {
  it('uses semantic classes backed by theme tokens for capacity states', () => {
    expect(componentSource).toContain('capacity-badge--idle')
    expect(componentSource).toContain('capacity-badge--active')
    expect(componentSource).toContain('capacity-badge--full')
    expect(componentSource).toContain('var(--theme-surface')
    expect(componentSource).toContain('var(--theme-primary')
    expect(componentSource).toContain('var(--theme-text')
  })

  it('does not hard-code badge state colors with Tailwind color scales', () => {
    expect(componentSource).not.toContain('bg-gray-100 text-gray-600')
    expect(componentSource).not.toContain('bg-yellow-100 text-yellow-700')
    expect(componentSource).not.toContain('bg-red-100 text-red-700')
    expect(componentSource).not.toContain('dark:bg-gray-800')
    expect(componentSource).not.toContain('dark:bg-yellow-900/30')
    expect(componentSource).not.toContain('dark:bg-red-900/30')
  })
})
