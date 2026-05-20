import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const componentPath = resolve(dirname(fileURLToPath(import.meta.url)), '../AppSidebar.vue')
const componentSource = readFileSync(componentPath, 'utf8')
const stylePath = resolve(dirname(fileURLToPath(import.meta.url)), '../../../style.css')
const styleSource = readFileSync(stylePath, 'utf8')

describe('AppSidebar custom SVG styles', () => {
  it('does not override uploaded SVG fill or stroke colors', () => {
    expect(componentSource).toContain('.sidebar-svg-icon {')
    expect(componentSource).toContain('color: currentColor;')
    expect(componentSource).toContain('display: block;')
    expect(componentSource).not.toContain('stroke: currentColor;')
    expect(componentSource).not.toContain('fill: none;')
  })
})

describe('AppSidebar header styles', () => {
  it('does not clip the version badge dropdown', () => {
    const sidebarHeaderBlockMatch = styleSource.match(/\.sidebar-header\s*\{[\s\S]*?\n {2}\}/)
    const sidebarBrandBlockMatch = componentSource.match(/\.sidebar-brand\s*\{[\s\S]*?\n\}/)

    expect(sidebarHeaderBlockMatch).not.toBeNull()
    expect(sidebarBrandBlockMatch).not.toBeNull()
    expect(sidebarHeaderBlockMatch?.[0]).not.toContain('@apply overflow-hidden;')
    expect(sidebarBrandBlockMatch?.[0]).not.toContain('overflow: hidden;')
  })
})

describe('AppSidebar active state styles', () => {
  it('does not draw a bordered active item', () => {
    const sidebarActiveBlockMatch = styleSource.match(/\.sidebar-link-active\s*\{[\s\S]*?\n {2}\}/)

    expect(sidebarActiveBlockMatch).not.toBeNull()
    expect(sidebarActiveBlockMatch?.[0]).not.toMatch(/\bborder\s*:/)
  })
})

describe('Modal header styles', () => {
  it('uses the neutral modal surface instead of a tinted header background', () => {
    const modalHeaderBlockMatch = styleSource.match(/\.modal-header\s*\{[\s\S]*?\n {2}\}/)

    expect(modalHeaderBlockMatch).not.toBeNull()
    expect(modalHeaderBlockMatch?.[0]).toContain('background: var(--theme-surface-strong);')
    expect(modalHeaderBlockMatch?.[0]).not.toMatch(/rgba\(124,\s*45,\s*18/)
  })
})
