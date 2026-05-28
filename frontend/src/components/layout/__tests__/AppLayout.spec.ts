import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { reactive } from 'vue'

import AppLayout from '../AppLayout.vue'

const route = reactive({
  meta: {}
})

vi.mock('vue-router', () => ({
  useRoute: () => route
}))

vi.mock('@/composables/useOnboardingTour', () => ({
  useOnboardingTour: () => ({
    replayTour: vi.fn()
  })
}))

describe('AppLayout', () => {
  it('uses an immersive workspace frame without desktop header or main padding', () => {
    route.meta = { workspaceLayout: true }

    const wrapper = mount(AppLayout, {
      global: {
        plugins: [
          createPinia()
        ],
        stubs: {
          AppSidebar: true,
          AppHeader: true
        }
      },
      slots: {
        default: '<div data-test="content">workspace</div>'
      }
    })

    expect(wrapper.getComponent({ name: 'AppHeader' }).classes()).toContain('app-layout-mobile-header')
    expect(wrapper.get('[data-test="app-layout-main"]').classes()).toContain('app-layout-main--workspace')
    expect(wrapper.get('[data-test="content"]').text()).toBe('workspace')
  })
})
