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
  })
})
