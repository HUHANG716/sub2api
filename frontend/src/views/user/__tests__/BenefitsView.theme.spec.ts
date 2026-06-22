import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(resolve(process.cwd(), 'src/views/user/BenefitsView.vue'), 'utf-8')
const styleBlock = source.match(/<style scoped>([\s\S]*?)<\/style>/)?.[1] ?? ''

describe('BenefitsView theme colors', () => {
  it('uses product theme tokens instead of hard-coded panel colors', () => {
    expect(styleBlock).toContain('background: var(--theme-surface)')
    expect(styleBlock).toContain('border: 1px solid var(--theme-border)')
    expect(styleBlock).toContain('color: var(--theme-text)')
    expect(styleBlock).not.toContain('rgb(255 255 255)')
    expect(styleBlock).not.toContain('rgb(31 41 55)')
    expect(styleBlock).not.toContain(':global(.dark) .benefits-hero')
  })
})
