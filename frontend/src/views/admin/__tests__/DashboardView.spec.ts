import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import type { DashboardStats } from '@/types'
import DashboardView from '../DashboardView.vue'

const { getSnapshotV2, getUserUsageTrend, getUserSpendingRanking } = vi.hoisted(() => ({
  getSnapshotV2: vi.fn(),
  getUserUsageTrend: vi.fn(),
  getUserSpendingRanking: vi.fn()
}))

vi.mock('@/api/admin', () => ({
  adminAPI: {
    dashboard: {
      getSnapshotV2,
      getUserUsageTrend,
      getUserSpendingRanking
    }
  }
}))

vi.mock('@/stores/app', () => ({
  useAppStore: () => ({
    showError: vi.fn()
  })
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}))

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key
    })
  }
})

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const createDashboardStats = (overrides: Partial<DashboardStats> = {}): DashboardStats => ({
  total_users: 0,
  today_new_users: 0,
  active_users: 0,
  hourly_active_users: 0,
  stats_updated_at: '',
  stats_stale: false,
  total_user_balance: 0,
  today_balance_added: 0,
  today_balance_deducted: 0,
  total_api_keys: 0,
  active_api_keys: 0,
  current_total_concurrency: 7,
  total_accounts: 0,
  normal_accounts: 0,
  error_accounts: 0,
  ratelimit_accounts: 0,
  overload_accounts: 0,
  total_requests: 0,
  total_input_tokens: 0,
  total_output_tokens: 0,
  total_cache_creation_tokens: 0,
  total_cache_read_tokens: 0,
  total_tokens: 0,
  total_cost: 0,
  total_actual_cost: 0,
  total_account_cost: 0,
  today_requests: 0,
  today_input_tokens: 0,
  today_output_tokens: 0,
  today_cache_creation_tokens: 0,
  today_cache_read_tokens: 0,
  today_tokens: 0,
  today_cost: 0,
  today_actual_cost: 0,
  today_account_cost: 0,
  average_duration_ms: 0,
  uptime: 0,
  rpm: 0,
  tpm: 0,
  ...overrides
})

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

const mountDashboardView = () => mount(DashboardView, {
  global: {
    stubs: {
      AppLayout: { template: '<div><slot /></div>' },
      LoadingSpinner: true,
      Icon: true,
      DateRangePicker: {
        template: '<button data-test="date-range-picker" @click="$emit(\'change\', { startDate: \'2026-05-28\', endDate: \'2026-05-29\', preset: null })" />'
      },
      Select: true,
      ModelDistributionChart: true,
      TokenUsageTrend: true,
      Line: true
    }
  }
})

describe('admin DashboardView', () => {
  beforeEach(() => {
    vi.useRealTimers()
    getSnapshotV2.mockReset()
    getUserUsageTrend.mockReset()
    getUserSpendingRanking.mockReset()

    getSnapshotV2.mockResolvedValue({
      stats: createDashboardStats(),
      trend: [],
      models: []
    })
    getUserUsageTrend.mockResolvedValue({
      trend: [],
      start_date: '',
      end_date: '',
      granularity: 'hour'
    })
    getUserSpendingRanking.mockResolvedValue({
      ranking: [],
      total_actual_cost: 0,
      total_requests: 0,
      total_tokens: 0,
      start_date: '',
      end_date: ''
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('uses last 24 hours as default dashboard range', async () => {
    mountDashboardView()

    await flushPromises()

    const now = new Date()
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    expect(getSnapshotV2).toHaveBeenCalledTimes(1)
    expect(getSnapshotV2).toHaveBeenCalledWith(expect.objectContaining({
      start_date: formatLocalDate(yesterday),
      end_date: formatLocalDate(now),
      granularity: 'hour'
    }))
    expect(getUserSpendingRanking).toHaveBeenCalledWith(expect.objectContaining({
      user_role: ''
    }))
  })

  it('uses regular dashboard card rows for the top metrics', async () => {
    const wrapper = mountDashboardView()

    await flushPromises()

    expect(wrapper.findAll('.admin-metrics-row')).toHaveLength(2)
    expect(wrapper.findAll('.admin-metric-card')).toHaveLength(9)
    expect(wrapper.findAll('.admin-metric-card.card')).toHaveLength(9)
    expect(wrapper.findAll('.admin-metric-card-icon')).toHaveLength(9)
    expect(wrapper.find('.admin-metrics-grid').exists()).toBe(false)
    expect(wrapper.find('.admin-metrics-panel').exists()).toBe(false)
    expect(wrapper.find('.dashboard-stat-card').exists()).toBe(false)
  })

  it('renders current concurrency in the top stat cards', async () => {
    const wrapper = mountDashboardView()

    await flushPromises()

    expect(wrapper.text()).toContain('admin.dashboard.currentConcurrency')
    expect(wrapper.text()).toContain('7')
  })

  it('renders total user balance in the top stat cards', async () => {
    getSnapshotV2.mockResolvedValueOnce({
      stats: createDashboardStats({ total_user_balance: 123.45 }),
      trend: [],
      models: []
    })

    const wrapper = mountDashboardView()

    await flushPromises()

    expect(wrapper.text()).toContain('admin.dashboard.totalUserBalance')
    expect(wrapper.text()).toContain('$123.45')
  })

  it('does not render today balance adjustments in the top stat cards', async () => {
    getSnapshotV2.mockResolvedValueOnce({
      stats: createDashboardStats({
        today_balance_added: 20.5,
        today_balance_deducted: 3.25
      }),
      trend: [],
      models: []
    })

    const wrapper = mountDashboardView()

    await flushPromises()

    expect(wrapper.text()).not.toContain('admin.dashboard.todayBalanceAdjustments')
    expect(wrapper.text()).not.toContain('+$20.50')
    expect(wrapper.text()).not.toContain('-$3.25')
  })

  it('refreshes current concurrency when chart filters reload the snapshot', async () => {
    getSnapshotV2
      .mockResolvedValueOnce({
        stats: createDashboardStats({ current_total_concurrency: 7 }),
        trend: [],
        models: []
      })
      .mockResolvedValueOnce({
        stats: createDashboardStats({ current_total_concurrency: 11 }),
        trend: [],
        models: []
      })

    const wrapper = mountDashboardView()

    await flushPromises()
    expect(wrapper.text()).toContain('7')

    await wrapper.get('[data-test="date-range-picker"]').trigger('click')
    await flushPromises()

    expect(getSnapshotV2).toHaveBeenLastCalledWith(expect.objectContaining({
      include_stats: true
    }))
    expect(wrapper.text()).toContain('11')
  })

  it('polls dashboard stats every 5 seconds without refreshing chart datasets', async () => {
    vi.useFakeTimers()
    getSnapshotV2
      .mockResolvedValueOnce({
        stats: createDashboardStats({ current_total_concurrency: 7 }),
        trend: [],
        models: []
      })
      .mockResolvedValueOnce({
        stats: createDashboardStats({ current_total_concurrency: 12 }),
        trend: [],
        models: []
      })

    const wrapper = mountDashboardView()

    await flushPromises()
    expect(wrapper.text()).toContain('7')
    expect(getSnapshotV2).toHaveBeenCalledTimes(1)
    expect(getUserUsageTrend).toHaveBeenCalledTimes(1)
    expect(getUserSpendingRanking).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(5000)
    await flushPromises()

    expect(getSnapshotV2).toHaveBeenCalledTimes(2)
    expect(getSnapshotV2).toHaveBeenLastCalledWith(expect.objectContaining({
      include_stats: true,
      include_trend: false,
      include_model_stats: false,
      include_group_stats: false,
      include_users_trend: false
    }))
    expect(getUserUsageTrend).toHaveBeenCalledTimes(1)
    expect(getUserSpendingRanking).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('12')
  })

  it('ignores stale polling stats after a newer snapshot refresh resolves', async () => {
    vi.useFakeTimers()
    const stalePoll = deferred<{
      stats: DashboardStats
      trend: []
      models: []
    }>()

    getSnapshotV2
      .mockResolvedValueOnce({
        stats: createDashboardStats({ current_total_concurrency: 7 }),
        trend: [],
        models: []
      })
      .mockReturnValueOnce(stalePoll.promise)
      .mockResolvedValueOnce({
        stats: createDashboardStats({ current_total_concurrency: 21 }),
        trend: [],
        models: []
      })

    const wrapper = mountDashboardView()

    await flushPromises()
    expect(wrapper.text()).toContain('7')

    await vi.advanceTimersByTimeAsync(5000)
    await wrapper.get('[data-test="date-range-picker"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('admin.dashboard.currentConcurrency21')

    stalePoll.resolve({
      stats: createDashboardStats({ current_total_concurrency: 12 }),
      trend: [],
      models: []
    })
    await flushPromises()

    expect(wrapper.text()).toContain('admin.dashboard.currentConcurrency21')
    expect(wrapper.text()).not.toContain('admin.dashboard.currentConcurrency12')
  })
})
