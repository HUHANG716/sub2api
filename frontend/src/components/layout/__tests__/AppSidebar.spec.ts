import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const componentPath = resolve(dirname(fileURLToPath(import.meta.url)), '../AppSidebar.vue')
const componentSource = readFileSync(componentPath, 'utf8')
const appHeaderPath = resolve(dirname(fileURLToPath(import.meta.url)), '../AppHeader.vue')
const appHeaderSource = readFileSync(appHeaderPath, 'utf8')
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

  it('keeps the logo visible when the sidebar is collapsed', () => {
    const logoTemplateBlock = componentSource.match(/<div\s+class="sidebar-logo[\s\S]*?<\/div>/)?.[0] ?? ''
    const logoCollapsedBlock = componentSource.match(/\.sidebar-logo-collapsed\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(logoCollapsedBlock).toContain('max-width: 2.25rem')
    expect(logoCollapsedBlock).toContain('opacity: 1')
    expect(logoCollapsedBlock).not.toContain('pointer-events: none')
    expect(logoTemplateBlock).not.toContain('aria-hidden')
  })

  it('pins the collapse control across the sidebar right border', () => {
    const collapseButtonBlock = componentSource.match(/\.sidebar-collapse-button\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const collapseButtonHoverBlock = componentSource.match(/\.sidebar-collapse-button:hover\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(collapseButtonBlock).toContain('position: absolute')
    expect(collapseButtonBlock).toContain('right: 0')
    expect(collapseButtonBlock).toContain('bottom: 0')
    expect(collapseButtonBlock).toContain('transform: translate(50%, 50%)')
    expect(collapseButtonBlock).toContain('border: 1px solid var(--theme-border)')
    expect(collapseButtonHoverBlock).toContain('transform: translate(50%, calc(50% - 1px))')
  })

  it('hides the collapse control on mobile sidebars', () => {
    const collapseButtonBlock = componentSource.match(/\.sidebar-collapse-button\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const desktopCollapseButtonBlock = componentSource.match(/@media \(min-width: 1024px\)\s*\{[\s\S]*?\.sidebar-collapse-button\s*\{[\s\S]*?\n  \}/)?.[0] ?? ''

    expect(collapseButtonBlock).toContain('display: none')
    expect(desktopCollapseButtonBlock).toContain('display: inline-flex')
  })
})

describe('AppSidebar active state styles', () => {
  it('does not draw a bordered active item', () => {
    const sidebarActiveBlockMatch = styleSource.match(/\.sidebar-link-active\s*\{[\s\S]*?\n {2}\}/)

    expect(sidebarActiveBlockMatch).not.toBeNull()
    expect(sidebarActiveBlockMatch?.[0]).not.toMatch(/\bborder\s*:/)
  })

  it('keeps the active item surface clean without gradients', () => {
    const sidebarActiveBlocks = styleSource.match(/(?:\.dark\s+)?\.sidebar-link-active(?:\:hover)?\s*\{[\s\S]*?\n {2}\}/g) ?? []

    expect(sidebarActiveBlocks.length).toBeGreaterThan(0)
    for (const block of sidebarActiveBlocks) {
      expect(block).not.toContain('linear-gradient')
      expect(block).not.toContain('radial-gradient')
    }
  })

  it('uses neutral dark theme tokens for the active item surface', () => {
    const darkActiveBlock = styleSource.match(/\.dark \.sidebar-link-active\s*\{[\s\S]*?\n {2}\}/)?.[0] ?? ''
    const darkActiveHoverBlock = styleSource.match(/\.dark \.sidebar-link-active:hover\s*\{[\s\S]*?\n {2}\}/)?.[0] ?? ''

    expect(darkActiveBlock).toContain('background: var(--theme-surface-muted);')
    expect(darkActiveBlock).toContain('box-shadow: inset 3px 0 0 var(--theme-primary);')
    expect(darkActiveHoverBlock).toContain('background: var(--theme-surface-strong);')
    expect(darkActiveBlock).not.toContain('rgba(35, 40, 49')
    expect(darkActiveHoverBlock).not.toContain('rgba(39, 45, 55')
  })
})

describe('AppSidebar docs entry', () => {
  it('adds a regular internal docs link at the end of self navigation', () => {
    const docsEntry = "{ path: '/docs', label: t('nav.docs'), icon: DocumentIcon }"

    expect(componentSource).toContain(docsEntry)
    expect(componentSource.indexOf("...customMenuItemsForUser.value.map")).toBeLessThan(
      componentSource.indexOf(docsEntry)
    )
    expect(componentSource).not.toContain("path: docUrl.value, label: t('nav.docs')")
    expect(componentSource).not.toContain('sidebar-link-docs')
    expect(styleSource).not.toContain('.sidebar-link-docs')
  })

  it('renders external sidebar nav items as links instead of router links', () => {
    expect(componentSource).toContain('v-if="item.external"')
    expect(componentSource).toContain(':href="item.path"')
    expect(componentSource).toContain('target="_blank"')
    expect(componentSource).toContain('rel="noopener noreferrer"')
  })
})

describe('AppSidebar image playground entry', () => {
  it('hides the image playground unless admin selected a workbench group', () => {
    expect(componentSource).toContain("import { FeatureFlags, makeImagePlaygroundSidebarFlag, makeSidebarFlag } from '@/utils/featureFlags'")
    expect(componentSource).toContain('const flagImagePlayground = makeImagePlaygroundSidebarFlag()')
    expect(componentSource).toContain("{ path: '/image-playground', label: t('nav.imagePlayground'), icon: ImagePlaygroundIcon, hideInSimpleMode: true, featureFlag: flagImagePlayground }")
  })
})

describe('AppSidebar account dropdown', () => {
  it('keeps theme switching in the header instead of the account dropdown', () => {
    const accountDropdownBlock = componentSource.match(/<div v-if="user && accountDropdownOpen"[\s\S]*?<\/transition>/)?.[0] ?? ''

    expect(appHeaderSource).toContain("import ThemeSwitch from '@/components/common/ThemeSwitch.vue'")
    expect(appHeaderSource).toContain('<ThemeSwitch />')
    expect(componentSource).not.toContain("import ThemeSwitch from '@/components/common/ThemeSwitch.vue'")
    expect(accountDropdownBlock).not.toContain('<ThemeSwitch')
  })

  it('uses an icon-only neutral language switcher in the header', () => {
    expect(appHeaderSource).toContain('<LocaleSwitcher icon-only />')
    expect(appHeaderSource).not.toContain('<LocaleSwitcher />')
  })

  it('gives the dropdown profile summary a larger avatar area', () => {
    const summaryBlock = componentSource.match(/\.sidebar-account-dropdown-summary\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const avatarBlock = componentSource.match(/\.sidebar-account-dropdown-avatar\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(summaryBlock).toContain('min-height: 5.5rem')
    expect(avatarBlock).toContain('height: 3rem')
    expect(avatarBlock).toContain('width: 3rem')
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
