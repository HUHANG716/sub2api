import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import DataTable from '../DataTable.vue'
import EmptyState from '../EmptyState.vue'

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
