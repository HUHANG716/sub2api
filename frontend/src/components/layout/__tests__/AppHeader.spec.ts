import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'

import AppHeader from '../AppHeader.vue'
import { useAppStore, useAuthStore } from '@/stores'
import i18n from '@/i18n'
import zh from '@/i18n/locales/zh'

i18n.global.setLocaleMessage('zh', zh)
i18n.global.locale.value = 'zh'

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
})
