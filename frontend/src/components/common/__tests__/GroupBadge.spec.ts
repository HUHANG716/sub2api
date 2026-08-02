import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { createI18n } from 'vue-i18n'
import { createPinia } from 'pinia'

import GroupBadge from '../GroupBadge.vue'

function createTestI18n(locale = 'zh') {
  const params = (ctx: any, key: string) => ctx.named(key)
  return createI18n({
    legacy: false,
    locale,
    messages: {
      en: {
        keys: {
          globalDiscountRateLabel: (ctx: any) => `Global ${params(ctx, 'discount')}x discount`,
          globalDiscountPercentOffLabel: (ctx: any) => `Global ${params(ctx, 'percent')}% off`,
          effectiveRateWithDiscount: (ctx: any) => `${params(ctx, 'base')}x → ${params(ctx, 'effective')}x · ${params(ctx, 'discountLabel')}`,
        },
        admin: { users: { expired: 'Expired', daysRemaining: (ctx: any) => `${params(ctx, 'days')} days left` } },
        groups: { subscription: 'Subscription' }
      },
      zh: {
        keys: {
          globalDiscountRateLabel: (ctx: any) => `全局 ${params(ctx, 'discount')} 折`,
          globalDiscountPercentOffLabel: (ctx: any) => `全局优惠 ${params(ctx, 'percent')}%`,
          effectiveRateWithDiscount: (ctx: any) => `${params(ctx, 'base')}x → ${params(ctx, 'effective')}x · ${params(ctx, 'discountLabel')}`,
        },
        admin: { users: { expired: '已过期', daysRemaining: (ctx: any) => `剩余 ${params(ctx, 'days')} 天` } },
        groups: { subscription: '订阅' }
      },
    },
  })
}

function mountBadge(props: Partial<InstanceType<typeof GroupBadge>['$props']> = {}, locale = 'zh') {
  return mount(GroupBadge, {
    props: {
      name: 'Pro',
      platform: 'openai',
      subscriptionType: 'standard',
      rateMultiplier: 1,
      ...props,
    },
    global: {
      plugins: [createPinia(), createTestI18n(locale)],
      stubs: {
        PlatformIcon: true,
      },
    },
  })
}

describe('GroupBadge global discount rate display', () => {
  it('shows base and discounted rates when an active global discount is passed', () => {
    const wrapper = mountBadge({ rateMultiplier: 1, globalDiscountRate: 0.8 })

    expect(wrapper.text()).toContain('1.000x → 0.800x')
    expect(wrapper.text()).toContain('全局 8 折')
    expect(wrapper.get('.flex.flex-col').text()).toContain('1.000x → 0.800x')
  })

  it('applies the global discount to non-unit group rates', () => {
    const wrapper = mountBadge({ rateMultiplier: 1.2, globalDiscountRate: 0.8 })

    expect(wrapper.text()).toContain('1.200x → 0.960x')
  })

  it('applies the global discount after the user custom rate', () => {
    const wrapper = mountBadge({
      rateMultiplier: 1,
      userRateMultiplier: 0.7,
      globalDiscountRate: 0.8,
    })

    expect(wrapper.text()).toContain('1x')
    expect(wrapper.text()).toContain('0.700x → 0.560x')
    expect(wrapper.text()).toContain('全局 8 折')
  })

  it('keeps the original rate display without a valid global discount', () => {
    expect(mountBadge({ rateMultiplier: 1 }).text()).toContain('1.000x')
    expect(mountBadge({ rateMultiplier: 1 }).text()).not.toContain('→')
    expect(mountBadge({ rateMultiplier: 1, globalDiscountRate: 1 }).text()).not.toContain('→')
    expect(mountBadge({ rateMultiplier: 1, globalDiscountRate: null }).text()).not.toContain('→')
  })

  it('supports percent-off wording for English discount labels', () => {
    const wrapper = mountBadge({ rateMultiplier: 1, globalDiscountRate: 0.8 }, 'en')

    expect(wrapper.vm.$props.globalDiscountRate).toBe(0.8)
    expect(wrapper.text()).toContain('Global 20% off')
  })

  it('keeps subscription badges as subscription labels unless rate display is forced', () => {
    const wrapper = mountBadge({
      subscriptionType: 'subscription',
      rateMultiplier: 1.2,
      globalDiscountRate: 0.8,
    })

    expect(wrapper.text()).not.toContain('1.200x → 0.960x')
    expect(wrapper.find('.flex.flex-col').exists()).toBe(false)
  })
})
