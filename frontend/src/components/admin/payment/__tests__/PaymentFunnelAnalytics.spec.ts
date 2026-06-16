import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

import PaymentFunnelAnalytics from '../PaymentFunnelAnalytics.vue'
import type { PaymentAnalyticsResponse } from '@/api/admin/payment'

const messages: Record<string, string> = {
  'payment.admin.auditActions.REFUND_SUCCESS': '退款成功',
  'payment.admin.conversionEmpty': '暂无转化',
  'payment.admin.noData': '暂无数据',
  'payment.admin.noFunnelData': '暂无支付埋点数据',
  'payment.admin.newCustomerCount': '{count} 人',
  'payment.admin.newCustomers': '支付新客户',
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
      new_customers: [],
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

  it('renders new paying customers and recent event actors', () => {
    const wrapper = mountAnalytics({
      steps: [],
      methods: [],
      recent_events: [{
        name: 'payment_amount_select',
        user_id: 99,
        user_email: 'actor@example.com',
        payment_type: 'alipay',
        amount: 20,
        created_at: '2026-06-01T11:00:00Z',
      }],
      new_customers: [{
        user_id: 99,
        user_email: 'actor@example.com',
        order_id: 123,
        payment_type: 'alipay',
        pay_amount: 20,
        first_paid_at: '2026-06-01T11:05:00Z',
      }],
      operators: [],
      audit_events: [],
      window_days: 30,
      events_missing: false,
    })

    expect(wrapper.text()).toContain('支付新客户')
    expect(wrapper.text()).toContain('1 人')
    expect(wrapper.text()).toContain('actor@example.com')
    expect(wrapper.text()).toContain('#123')
  })
})
