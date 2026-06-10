import { describe, expect, it } from 'vitest'
import componentSource from './TemplateWorkspace.tsx?raw'

const source = String(componentSource)

describe('TemplateWorkspace source contract', () => {
  it('keeps the template page input surface scoped to search', () => {
    expect(source).toContain('type="text"')
    expect(source).toContain('aria-label="搜索模板"')
    expect(source).not.toContain('<textarea')
    expect(source).not.toContain('contentEditable')
  })
})
