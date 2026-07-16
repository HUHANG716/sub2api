import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const componentPath = resolve(dirname(fileURLToPath(import.meta.url)), '../TablePageLayout.vue')
const source = readFileSync(componentPath, 'utf8')

describe('TablePageLayout', () => {
  it('lets mobile table pages use natural document height for page scrolling', () => {
    const mobileLayoutBlock = source.match(
      /\.table-page-layout\.mobile-mode\s*\{[\s\S]*?\n\}/
    )?.[0]

    expect(mobileLayoutBlock).toContain('height: auto')
    expect(mobileLayoutBlock).toContain('min-height: 0')
    expect(source).toContain('.flex.min-h-0.flex-1.flex-col.overflow-hidden')
    expect(source).toContain('@apply flex-none overflow-visible')
  })

  it('uses a css media query fallback so mobile pages can scroll before resize state runs', () => {
    const mobileMediaBlock = source.match(
      /@media\s*\(max-width:\s*1023px\)\s*\{[\s\S]*?\.table-page-layout\s*\{[\s\S]*?\n {2}\}/
    )?.[0]

    expect(mobileMediaBlock).not.toBeNull()
    expect(mobileMediaBlock ?? '').toContain('height: auto')
    expect(mobileMediaBlock ?? '').toContain('min-height: 0')
  })

  it('does not disable the table horizontal scroll container in mobile mode', () => {
    const tableWrapperBlocks = Array.from(
      source.matchAll(/([^{}]*:deep\(\.table-wrapper\)[^{}]*)\{([^{}]*)\}/g)
    )

    expect(tableWrapperBlocks.length).toBeGreaterThan(0)

    const baseBlock = tableWrapperBlocks.find(([selector]) => !selector.includes('.mobile-mode'))
    const mobileBlocks = tableWrapperBlocks.filter(([selector]) => selector.includes('.mobile-mode'))

    expect(baseBlock?.[2]).toContain('overflow-x-auto')
    expect(mobileBlocks.every(([, , declarations]) => !declarations.includes('overflow-visible'))).toBe(
      true
    )
  })
})
