import { describe, expect, it } from 'vitest'
import componentSource from './TemplateWorkspace.tsx?raw'

const source = String(componentSource)

describe('TemplateWorkspace source contract', () => {
  it('does not render text input controls on the template page', () => {
    expect(source).not.toContain('type="search"')
    expect(source).not.toContain('<input')
    expect(source).not.toContain('<textarea')
    expect(source).not.toContain('contentEditable')
  })
})
