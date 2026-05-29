import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import DashboardView from '../DashboardView.vue'

const {
  authStore,
  fetchAnnouncements,
  getByDateRange,
  getDashboardModels,
  getDashboardStats,
  getMyPlatformQuotas
} = vi.hoisted(() => ({
  authStore: {
    user: { balance: 12 },
    isSimpleMode: false,
    refreshUser: vi.fn()
  },
  fetchAnnouncements: vi.fn(),
  getByDateRange: vi.fn(),
  getDashboardModels: vi.fn(),
  getDashboardStats: vi.fn(),
  getMyPlatformQuotas: vi.fn()
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => authStore
}))

vi.mock('@/stores/announcements', () => ({
  useAnnouncementStore: () => ({
    fetchAnnouncements
  })
}))

vi.mock('@/api/usage', () => ({
  usageAPI: {
    getByDateRange,
    getDashboardModels,
    getDashboardStats
  }
}))

vi.mock('@/api/user', () => ({
  getMyPlatformQuotas
}))

const AppLayoutStub = {
  template: '<main><slot /></main>'
}

const LoadingSpinnerStub = {
  template: '<div data-test="loading-spinner" />'
}

const UserDashboardStatsStub = {
  template: '<section data-test="dashboard-stats" />',
  props: ['stats', 'balance', 'isSimple', 'platformQuotas']
}

const UserDashboardChartsStub = {
  template: '<section data-test="dashboard-charts" />',
  props: ['startDate', 'endDate', 'loading', 'models']
}

const UserDashboardQuickActionsStub = {
  template: '<section data-test="dashboard-quick-actions" />'
}

const UserDashboardRecentUsageStub = {
  template: '<section data-test="dashboard-recent-usage" />',
  props: ['data', 'loading']
}

describe('DashboardView', () => {
  beforeEach(() => {
    authStore.refreshUser.mockReset()
    authStore.refreshUser.mockResolvedValue(undefined)
    fetchAnnouncements.mockReset()
    fetchAnnouncements.mockResolvedValue(undefined)
    getByDateRange.mockReset()
    getDashboardModels.mockReset()
    getDashboardModels.mockResolvedValue({ models: [] })
    getDashboardStats.mockReset()
    getDashboardStats.mockResolvedValue({
      total_api_keys: 0,
      active_api_keys: 0,
      today_requests: 0,
      total_requests: 0
    })
    getMyPlatformQuotas.mockReset()
    getMyPlatformQuotas.mockResolvedValue({ platform_quotas: [] })
  })

  it('keeps the user dashboard focused without recent usage requests or panel', async () => {
    const wrapper = mount(DashboardView, {
      global: {
        stubs: {
          AppLayout: AppLayoutStub,
          LoadingSpinner: LoadingSpinnerStub,
          UserDashboardStats: UserDashboardStatsStub,
          UserDashboardCharts: UserDashboardChartsStub,
          UserDashboardQuickActions: UserDashboardQuickActionsStub,
          UserDashboardRecentUsage: UserDashboardRecentUsageStub
        }
      }
    })

    await flushPromises()

    expect(getByDateRange).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="dashboard-recent-usage"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="dashboard-stats"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="dashboard-charts"]').exists()).toBe(true)
  })
})
