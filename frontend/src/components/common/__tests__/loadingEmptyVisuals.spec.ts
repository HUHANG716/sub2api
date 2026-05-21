import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import DataTable from '../DataTable.vue'
import EmptyState from '../EmptyState.vue'

const testDir = dirname(fileURLToPath(import.meta.url))
const dataTableSource = readFileSync(resolve(testDir, '../DataTable.vue'), 'utf8')

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key
  })
}))

const installDesktopViewport = () => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: true,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  })
}

describe('common loading and empty states', () => {
  it('uses subdued table skeleton lines while loading', () => {
    installDesktopViewport()

    const wrapper = mount(DataTable, {
      props: {
        loading: true,
        data: [],
        columns: [
          { key: 'name', label: 'Name' },
          { key: 'status', label: 'Status' }
        ]
      }
    })

    expect(wrapper.find('.table-skeleton-line').exists()).toBe(true)
  })

  it('keeps desktop empty content centered in the visible table viewport', () => {
    installDesktopViewport()

    const wrapper = mount(DataTable, {
      props: {
        loading: false,
        data: [],
        columns: Array.from({ length: 12 }, (_, index) => ({
          key: `col-${index}`,
          label: `Column ${index}`
        }))
      },
      slots: {
        empty: '<div data-test="empty-content">No rows</div>'
      }
    })

    const emptyViewport = wrapper.find('.table-empty-viewport')
    expect(emptyViewport.exists()).toBe(true)
    expect(emptyViewport.classes()).toEqual(
      expect.arrayContaining(['sticky', 'left-0', 'items-center', 'justify-center'])
    )
  })

  it('uses a lightweight sticky column edge instead of a heavy dark shadow', () => {
    expect(dataTableSource).toContain('--table-sticky-shadow')
    expect(dataTableSource).toContain('linear-gradient')
    expect(dataTableSource).not.toContain('rgba(2, 6, 23, 0.32)')
  })

  it('renders the empty icon in a lightweight frame instead of a solid tile', () => {
    const wrapper = mount(EmptyState, {
      props: {
        title: 'No proxies',
        description: 'Create the first one.'
      }
    })

    const frame = wrapper.find('.empty-state-icon-frame')
    expect(frame.exists()).toBe(true)
    expect(frame.classes()).not.toContain('bg-gray-100')
    expect(frame.classes()).not.toContain('dark:bg-dark-800')
  })
})
