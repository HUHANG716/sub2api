import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

import UserDashboardRecentUsage from '../UserDashboardRecentUsage.vue'
import type { UsageLog } from '@/types'

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => key
    })
  }
})

const IconStub = {
  template: '<span data-test="icon" :data-name="name" :class="$attrs.class" />',
  props: ['name', 'size']
}

const LoadingSpinnerStub = {
  template: '<div data-test="loading-spinner" />'
}

const EmptyStateStub = {
  template: '<div data-test="empty-state" />',
  props: ['title', 'description']
}

function usageLog(overrides: Partial<UsageLog>): UsageLog {
  return {
    id: 1,
    user_id: 1,
    api_key_id: 1,
    account_id: null,
    request_id: 'req-1',
    model: 'gpt-5.4',
    group_id: null,
    subscription_id: null,
    input_tokens: 1000,
    output_tokens: 200,
    cache_creation_tokens: 0,
    cache_read_tokens: 0,
    cache_creation_5m_tokens: 0,
    cache_creation_1h_tokens: 0,
    input_cost: 0,
    output_cost: 0,
    cache_creation_cost: 0,
    cache_read_cost: 0,
    total_cost: 0.02,
    actual_cost: 0.01,
    discount_amount: 0,
    discount_rate: 0,
    rate_multiplier: 1,
    billing_type: 1,
    stream: false,
    duration_ms: 1000,
    first_token_ms: null,
    image_count: 0,
    image_size: null,
    image_input_size: null,
    image_output_size: null,
    image_size_source: null,
    image_size_breakdown: null,
    user_agent: null,
    cache_ttl_overridden: false,
    billing_mode: null,
    created_at: '2026-05-29T06:45:00Z',
    ...overrides
  }
}

describe('UserDashboardRecentUsage', () => {
  it('uses a different model icon for each visible recent usage item', () => {
    const wrapper = mount(UserDashboardRecentUsage, {
      props: {
        loading: false,
        data: [
          usageLog({ id: 1, model: 'gpt-5.4' }),
          usageLog({ id: 2, model: 'gpt-5.5' }),
          usageLog({ id: 3, model: 'gpt-5.4' }),
          usageLog({ id: 4, model: 'gpt-5.5' }),
          usageLog({ id: 5, model: 'gpt-5.5' })
        ]
      },
      global: {
        stubs: {
          Icon: IconStub,
          LoadingSpinner: LoadingSpinnerStub,
          EmptyState: EmptyStateStub,
          RouterLink: {
            template: '<a><slot /></a>'
          }
        }
      }
    })

    const modelIconNames = wrapper
      .findAll('[data-test="icon"].recent-usage-model-icon')
      .map((icon) => icon.attributes('data-name'))

    expect(modelIconNames).toEqual(['terminal', 'cpu', 'cloud', 'database', 'sparkles'])
    expect(new Set(modelIconNames).size).toBe(modelIconNames.length)
  })
})
