import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import PaymentFunnelAnalytics from '../PaymentFunnelAnalytics.vue'
import type { PaymentAnalyticsResponse } from '@/api/admin/payment'

const messages: Record<string, string> = {
  'payment.admin.auditActions.REFUND_SUCCESS': '退款成功',
  'payment.admin.conversionEmpty': '暂无转化',
  'payment.admin.noData': '暂无数据',
  'payment.admin.noFunnelData': '暂无支付埋点数据',
  'payment.admin.operatorAdmin': '管理员 #{id}',
  'payment.admin.operatorSummary': '操作者汇总',
  'payment.admin.recentAuditEvents': '最近审计动作',
}

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown> | string) => {
      const template = messages[key] ?? (typeof params === 'string' ? params : key)
      if (!params || typeof params === 'string') return template
      return Object.entries(params).reduce(
        (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
        template
      )
    },
  }),
}))

vi.mock('@/utils/format', () => ({
  formatDateTime: (value: string | undefined) => value || '-',
}))

function mountAnalytics(analytics: PaymentAnalyticsResponse) {
  return mount(PaymentFunnelAnalytics, {
    props: {
      analytics,
      days: 30,
    },
    global: {
      stubs: {
        Icon: true,
        LoadingSpinner: true,
      },
    },
  })
}

describe('PaymentFunnelAnalytics', () => {
  it('renders operator audit tables even when funnel events are empty', () => {
    const wrapper = mountAnalytics({
      steps: [],
      methods: [],
      recent_events: [],
      operators: [{
        operator: 'admin:123',
        actor_type: 'admin',
        actor_id: 123,
        action: 'REFUND_SUCCESS',
        count: 1,
        last_action_at: '2026-06-01T10:00:00Z',
      }],
      audit_events: [{
        id: 1,
        order_id: '42',
        action: 'REFUND_SUCCESS',
        operator: 'admin:123',
        actor_type: 'admin',
        actor_id: 123,
        subject_user_id: 88,
        user_email: 'user@example.com',
        pay_amount: 10,
        status: 'REFUNDED',
        created_at: '2026-06-01T10:00:00Z',
      }],
      window_days: 30,
      events_missing: false,
    })

    expect(wrapper.text()).not.toContain('暂无支付埋点数据')
    expect(wrapper.text()).toContain('操作者汇总')
    expect(wrapper.text()).toContain('最近审计动作')
    expect(wrapper.text()).toContain('管理员 #123')
    expect(wrapper.text()).toContain('user@example.com')
  })
})
