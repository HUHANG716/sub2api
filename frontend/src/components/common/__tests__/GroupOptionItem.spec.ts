import { createPinia } from 'pinia'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { createI18n } from 'vue-i18n'

import GroupOptionItem from '../GroupOptionItem.vue'

vi.mock('@/stores/app', () => ({
  useAppStore: () => ({ cachedPublicSettings: null }),
}))

function createTestI18n(locale = 'zh') {
  const params = (ctx: any, key: string) => ctx.named(key)
  return createI18n({
    legacy: false,
    locale,
    messages: {
      en: {
        admin: { groups: { rateLabel: () => 'Rate' } },
        keys: {
          globalDiscountRateLabel: (ctx: any) => `Global ${params(ctx, 'discount')}x discount`,
          globalDiscountPercentOffLabel: (ctx: any) => `Global ${params(ctx, 'percent')}% off`,
          effectiveRateWithDiscount: (ctx: any) => `${params(ctx, 'base')}x → ${params(ctx, 'effective')}x · ${params(ctx, 'discountLabel')}`
        }
      },
      zh: {
        admin: { groups: { rateLabel: () => '倍率' } },
        keys: {
          globalDiscountRateLabel: (ctx: any) => `全局 ${params(ctx, 'discount')} 折`,
          globalDiscountPercentOffLabel: (ctx: any) => `全局优惠 ${params(ctx, 'percent')}%`,
          effectiveRateWithDiscount: (ctx: any) => `${params(ctx, 'base')}x → ${params(ctx, 'effective')}x · ${params(ctx, 'discountLabel')}`
        }
      }
    }
  })
}

function mountOption(props: Partial<InstanceType<typeof GroupOptionItem>['$props']> = {}, locale = 'zh') {
  return mount(GroupOptionItem, {
    props: {
      name: 'Pro',
      platform: 'openai',
      subscriptionType: 'standard',
      rateMultiplier: 1,
      ...props
    },
    global: {
      plugins: [createPinia(), createTestI18n(locale)],
      stubs: {
        GroupBadge: true
      }
    }
  })
}

describe('GroupOptionItem global discount rate display', () => {
  it('shows base and discounted rates for group options', () => {
    const wrapper = mountOption({ rateMultiplier: 1, globalDiscountRate: 0.8 })

    expect(wrapper.text()).toContain('1.000x → 0.800x')
    expect(wrapper.text()).toContain('全局 8 折')
  })

  it('applies the global discount after the user custom rate', () => {
    const wrapper = mountOption({
      rateMultiplier: 0.9,
      userRateMultiplier: 0.7,
      globalDiscountRate: 0.8
    })

    expect(wrapper.text()).toContain('0.9x')
    expect(wrapper.text()).toContain('0.700x → 0.560x')
    expect(wrapper.text()).toContain('全局 8 折')
  })

  it('keeps the original rate pill without a valid global discount', () => {
    const wrapper = mountOption({ rateMultiplier: 0.8 })

    expect(wrapper.text()).toContain('0.800x 倍率')
    expect(wrapper.text()).not.toContain('→')
  })

  it('supports percent-off wording for English discount labels', () => {
    const wrapper = mountOption({ rateMultiplier: 1, globalDiscountRate: 0.8 }, 'en')

    expect(wrapper.text()).toContain('Global 20% off')
  })
})

describe('GroupOptionItem description layout', () => {
  it('applies multiline and overflow-safe text styles', () => {
    const description = 'First section\nvery-long-unbroken-description-value-that-must-not-overflow'
    const wrapper = mountOption({ description })
    const descriptionElement = wrapper
      .findAll('span')
      .find((element) => element.text() === description)

    expect(descriptionElement).toBeDefined()
    expect(descriptionElement?.classes()).toContain('whitespace-pre-line')
    expect(descriptionElement?.classes()).toContain('[overflow-wrap:anywhere]')
    expect(descriptionElement?.classes()).toContain('line-clamp-3')
    expect(wrapper.find('[title]').attributes('title')).toBe(description)
  })
})
