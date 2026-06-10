import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
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
      },
      usage: {
        discountActive: '全局折扣进行中'
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
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

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

  it('preserves campaign label spacing when rendering', () => {
    setActivePinia(createPinia())
    const appStore = useAppStore()
    const authStore = useAuthStore()
    authStore.user = { id: 1, username: 'tester', email: 'tester@example.com', role: 'user' } as any
    appStore.cachedPublicSettings = {
      global_discount: {
        enabled: true,
        active: true,
        discount_rate: 0.9,
        schedule_type: 'once',
        label: '🎁  周末全天享  9 折计费  🎁'
      }
    } as any

    const wrapper = mountHeader()

    expect(wrapper.get('.header-discount-campaign span').text()).toBe('🎁  周末全天享  9 折计费  🎁')
  })

  it('falls back to default copy when the active discount has no label', () => {
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
        label: ''
      }
    } as any

    const wrapper = mountHeader()

    expect(wrapper.get('.header-discount-campaign').text()).toContain('usage.discountActive')
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

  it('hides active discount copy after the runtime window ends', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-02T11:59:30+08:00'))
    setActivePinia(createPinia())
    const appStore = useAppStore()
    const authStore = useAuthStore()
    vi.spyOn(appStore, 'fetchPublicSettings').mockResolvedValue(null)
    authStore.user = { id: 1, username: 'tester', email: 'tester@example.com', role: 'user' } as any
    appStore.cachedPublicSettings = {
      global_discount: {
        enabled: true,
        active: true,
        discount_rate: 0.8,
        schedule_type: 'once',
        starts_at: '2026-06-02T11:00:00+08:00',
        ends_at: '2026-06-02T12:00:00+08:00',
        label: '限时八折活动进行中'
      }
    } as any

    const wrapper = mountHeader()
    expect(wrapper.find('.header-discount-campaign').exists()).toBe(true)

    vi.setSystemTime(new Date('2026-06-02T12:00:01+08:00'))
    await vi.advanceTimersByTimeAsync(60_000)

    expect(wrapper.find('.header-discount-campaign').exists()).toBe(false)
  })

  it('refreshes public settings when the active discount window ends', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-02T11:59:30+08:00'))
    setActivePinia(createPinia())
    const appStore = useAppStore()
    const authStore = useAuthStore()
    const fetchPublicSettingsSpy = vi
      .spyOn(appStore, 'fetchPublicSettings')
      .mockResolvedValue(null)
    authStore.user = { id: 1, username: 'tester', email: 'tester@example.com', role: 'user' } as any
    appStore.cachedPublicSettings = {
      global_discount: {
        enabled: true,
        active: true,
        discount_rate: 0.8,
        schedule_type: 'weekly',
        starts_at: '2026-06-02T11:00:00+08:00',
        ends_at: '2026-06-02T12:00:00+08:00',
        recurring_start_at: '11:00',
        recurring_end_at: '12:00',
        weekdays: [2],
        label: '限时八折活动进行中'
      }
    } as any

    mountHeader()

    await vi.advanceTimersByTimeAsync(30_001)
    await flushPromises()

    expect(fetchPublicSettingsSpy).toHaveBeenCalledWith(true)
  })

  it('refreshes public settings when a future discount window starts', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-02T10:59:30+08:00'))
    setActivePinia(createPinia())
    const appStore = useAppStore()
    const authStore = useAuthStore()
    const fetchPublicSettingsSpy = vi
      .spyOn(appStore, 'fetchPublicSettings')
      .mockResolvedValue(null)
    authStore.user = { id: 1, username: 'tester', email: 'tester@example.com', role: 'user' } as any
    appStore.cachedPublicSettings = {
      global_discount: {
        enabled: true,
        active: false,
        discount_rate: 0.8,
        schedule_type: 'once',
        starts_at: '2026-06-02T11:00:00+08:00',
        ends_at: '2026-06-02T12:00:00+08:00',
        label: ''
      }
    } as any

    mountHeader()

    await vi.advanceTimersByTimeAsync(30_001)
    await flushPromises()

    expect(fetchPublicSettingsSpy).toHaveBeenCalledWith(true)
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
