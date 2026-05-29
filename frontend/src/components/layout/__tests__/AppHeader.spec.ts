import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'

import AppHeader from '../AppHeader.vue'
import { useAppStore, useAuthStore } from '@/stores'

const i18n = createI18n({
  legacy: false,
  locale: 'zh',
  messages: {
    zh: {
      nav: {
        dashboard: '仪表盘',
        buySubscription: '充值/订阅',
        docs: '文档'
      }
    }
  }
})

vi.mock('vue-router', () => ({
  useRoute: () => ({
    meta: {
      titleKey: 'nav.dashboard'
    },
    name: 'Dashboard',
    params: {}
  })
}))

vi.mock('@/stores/adminSettings', () => ({
  useAdminSettingsStore: () => ({
    customMenuItems: []
  })
}))

const mountHeader = () => mount(AppHeader, {
  global: {
    plugins: [i18n],
    stubs: {
      RouterLink: {
        template: '<a><slot /></a>'
      },
      AnnouncementBell: true,
      LocaleSwitcher: true,
      ThemeSwitch: true,
      SubscriptionProgressMini: true
    }
  }
})

describe('AppHeader discount campaign', () => {
  it('shows active global discount copy in the header center', () => {
    setActivePinia(createPinia())
    const appStore = useAppStore()
    const authStore = useAuthStore()
    authStore.user = { id: 1, username: 'tester', email: 'tester@example.com', role: 'user' } as any
    appStore.cachedPublicSettings = {
      global_discount: {
        enabled: true,
        active: true,
        discount_rate: 0.8,
        schedule_type: 'once',
        label: '限时八折活动进行中'
      }
    } as any

    const wrapper = mountHeader()

    expect(wrapper.get('.header-discount-campaign').text()).toContain('限时八折活动进行中')
  })

  it('hides the campaign copy when the discount is inactive', () => {
    setActivePinia(createPinia())
    const appStore = useAppStore()
    const authStore = useAuthStore()
    authStore.user = null
    appStore.cachedPublicSettings = {
      global_discount: {
        enabled: true,
        active: false,
        discount_rate: 0.8,
        schedule_type: 'once',
        label: '限时八折活动进行中'
      }
    } as any

    const wrapper = mountHeader()

    expect(wrapper.find('.header-discount-campaign').exists()).toBe(false)
  })

  it('hides the campaign copy when no activity name is available', () => {
    setActivePinia(createPinia())
    const appStore = useAppStore()
    const authStore = useAuthStore()
    authStore.user = { id: 1, username: 'tester', email: 'tester@example.com', role: 'user' } as any
    appStore.cachedPublicSettings = {}

    const wrapper = mountHeader()

    expect(wrapper.find('.header-discount-campaign').exists()).toBe(false)
  })
})
