import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'

import GroupOptionItem from '../GroupOptionItem.vue'

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
      },
      zh: {
        keys: {
          globalDiscountRateLabel: (ctx: any) => `全局 ${params(ctx, 'discount')} 折`,
          globalDiscountPercentOffLabel: (ctx: any) => `全局优惠 ${params(ctx, 'percent')}%`,
          effectiveRateWithDiscount: (ctx: any) => `${params(ctx, 'base')}x → ${params(ctx, 'effective')}x · ${params(ctx, 'discountLabel')}`,
        },
      },
    },
  })
}

function mountOption(props: Partial<InstanceType<typeof GroupOptionItem>['$props']> = {}, locale = 'zh') {
  return mount(GroupOptionItem, {
    props: {
      name: 'Pro',
      platform: 'openai',
      subscriptionType: 'standard',
      rateMultiplier: 1,
      ...props,
    },
    global: {
      plugins: [createTestI18n(locale)],
      stubs: {
        GroupBadge: true,
      },
    },
  })
}

describe('GroupOptionItem global discount rate display', () => {
  it('shows base and discounted rates for group options', () => {
    const wrapper = mountOption({ rateMultiplier: 1, globalDiscountRate: 0.8 })

    expect(wrapper.text()).toContain('1x → 0.8x')
    expect(wrapper.text()).toContain('全局 8 折')
  })

  it('applies the global discount after the user custom rate', () => {
    const wrapper = mountOption({
      rateMultiplier: 0.9,
      userRateMultiplier: 0.7,
      globalDiscountRate: 0.8,
    })

    expect(wrapper.text()).toContain('0.9x')
    expect(wrapper.text()).toContain('0.7x → 0.56x')
    expect(wrapper.text()).toContain('全局 8 折')
  })

  it('keeps the original rate pill without a valid global discount', () => {
    const wrapper = mountOption({ rateMultiplier: 0.8 })

    expect(wrapper.text()).toContain('0.8x 倍率')
    expect(wrapper.text()).not.toContain('→')
  })

  it('supports percent-off wording for English discount labels', () => {
    const wrapper = mountOption({ rateMultiplier: 1, globalDiscountRate: 0.8 }, 'en')

    expect(wrapper.text()).toContain('Global 20% off')
  })
})
