import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const testDir = dirname(fileURLToPath(import.meta.url))
const styleSource = readFileSync(resolve(testDir, '../../../style.css'), 'utf8')
const selectSource = readFileSync(resolve(testDir, '../Select.vue'), 'utf8')

const readCssBlock = (source: string, selector: string, closingIndent = '') => {
  const escapedSelector = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return source.match(new RegExp(`${escapedSelector}\\s*\\{[\\s\\S]*?\\n${closingIndent}\\}`))?.[0] ?? ''
}

describe('borderless control styling', () => {
  it('keeps base inputs visually borderless by default', () => {
    const inputBlock = readCssBlock(styleSource, '.input', '  ')

    expect(inputBlock).toContain('border: 1px solid transparent;')
    expect(inputBlock).not.toContain('border: 1px solid var(--theme-border);')
  })

  it('keeps select triggers visually borderless by default', () => {
    const triggerBlock = readCssBlock(selectSource, '.select-trigger')

    expect(triggerBlock).toContain('border: 1px solid transparent;')
    expect(triggerBlock).not.toContain('@apply border border-gray-200 dark:border-dark-600;')
  })
})

describe('button density styling', () => {
  it('keeps shared buttons visually compact', () => {
    const buttonBlock = readCssBlock(styleSource, '.btn', '  ')
    const smallButtonBlock = readCssBlock(styleSource, '.btn-sm', '  ')
    const mediumButtonBlock = readCssBlock(styleSource, '.btn-md', '  ')
    const largeButtonBlock = readCssBlock(styleSource, '.btn-lg', '  ')
    const iconButtonBlock = readCssBlock(styleSource, '.btn-icon', '  ')
    const iconActionBlock = readCssBlock(styleSource, '.icon-action-themed', '  ')

    expect(buttonBlock).toContain('@apply rounded-lg px-3.5 py-2 text-sm font-medium;')
    expect(buttonBlock).not.toContain('@apply rounded-xl px-4 py-2.5 text-sm font-medium;')
    expect(smallButtonBlock).toContain('@apply rounded-md px-2.5 py-1 text-xs;')
    expect(mediumButtonBlock).toContain('@apply rounded-lg px-3.5 py-1.5 text-sm;')
    expect(largeButtonBlock).toContain('@apply rounded-xl px-5 py-2.5 text-sm;')
    expect(iconButtonBlock).toContain('@apply rounded-lg p-2;')
    expect(iconActionBlock).toContain('@apply inline-flex items-center justify-center rounded-lg transition-all duration-200;')
  })
})
