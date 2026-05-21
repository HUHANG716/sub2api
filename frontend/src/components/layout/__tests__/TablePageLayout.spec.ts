import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(
  resolve(process.cwd(), 'src/components/layout/TablePageLayout.vue'),
  'utf-8'
)

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
      /@media\s*\(max-width:\s*1023px\)\s*\{[\s\S]*?\.table-page-layout\s*\{[\s\S]*?\n  \}/
    )?.[0]

    expect(mobileMediaBlock).not.toBeNull()
    expect(mobileMediaBlock ?? '').toContain('height: auto')
    expect(mobileMediaBlock ?? '').toContain('min-height: 0')
  })
})
