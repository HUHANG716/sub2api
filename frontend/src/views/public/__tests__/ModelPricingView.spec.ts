import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ModelPricingView from '@/views/public/ModelPricingView.vue'

const { appState, getPublicModelPricingMock } = vi.hoisted(() => ({
  appState: {
    cachedPublicSettings: {
      site_name: 'Case Closed AI',
      site_logo: '/tenant-logo.svg',
    },
    siteName: 'Store Fallback',
    siteLogo: '/store-logo.svg',
    publicSettingsLoaded: true,
    fetchPublicSettings: vi.fn(),
  },
  getPublicModelPricingMock: vi.fn(),
}))

vi.mock('@/api/publicModelPricing', () => ({
  getPublicModelPricing: (...args: any[]) => getPublicModelPricingMock(...args),
}))

vi.mock('@/stores', () => ({
  useAppStore: () => appState,
}))

const IconStub = {
  props: ['name'],
  template: '<span class="icon-stub" :data-icon="name" />',
}

const catalog = {
  last_updated: '2026-06-06T08:15:00Z',
  items: [
    {
      provider: 'openai',
      model: 'gpt-5.5',
      mode: 'responses',
      input_price_per_million: 2.5,
      output_price_per_million: 10,
      cache_write_price_per_million: 1.25,
      cache_read_price_per_million: 0.25,
      image_output_price: null,
      supports_prompt_caching: true,
      supports_service_tier: true,
    },
    {
      provider: 'anthropic',
      model: 'claude-sonnet-5',
      mode: 'messages',
      input_price_per_million: 3,
      output_price_per_million: 15,
      cache_write_price_per_million: null,
      cache_read_price_per_million: 0.3,
      image_output_price: null,
      supports_prompt_caching: true,
      supports_service_tier: false,
    },
    {
      provider: 'gemini',
      model: 'gemini-3-pro',
      mode: 'generateContent',
      input_price_per_million: null,
      output_price_per_million: 12.5,
      cache_write_price_per_million: null,
      cache_read_price_per_million: null,
      image_output_price: 0.04,
      supports_prompt_caching: false,
      supports_service_tier: false,
    },
  ],
}

describe('ModelPricingView', () => {
  beforeEach(() => {
    appState.cachedPublicSettings = {
      site_name: 'Case Closed AI',
      site_logo: '/tenant-logo.svg',
    }
    appState.siteName = 'Store Fallback'
    appState.siteLogo = '/store-logo.svg'
    appState.publicSettingsLoaded = true
    appState.fetchPublicSettings.mockReset()
    getPublicModelPricingMock.mockReset()
    getPublicModelPricingMock.mockResolvedValue(catalog)
  })

  it('renders the public pricing catalog with USD per million token values', async () => {
    const wrapper = mount(ModelPricingView, {
      global: {
        stubs: {
          Icon: IconStub,
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    })

    await flushPromises()

    expect(getPublicModelPricingMock).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('模型价格表')
    expect(wrapper.text()).toContain('USD / 1M tokens')
    expect(wrapper.text()).toContain('gpt-5.5')
    expect(wrapper.text()).toContain('$2.50')
    expect(wrapper.text()).toContain('$10.00')
    expect(wrapper.text()).toContain('$1.25')
    expect(wrapper.text()).toContain('$0.25')
    expect(wrapper.text()).toContain('Prompt Cache')
    expect(wrapper.text()).toContain('Service Tier')
    expect(wrapper.text()).toContain('2026-06-06')
  })

  it('uses public settings for the public page brand', async () => {
    const wrapper = mount(ModelPricingView, {
      global: {
        stubs: {
          Icon: IconStub,
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    })

    await flushPromises()

    const logo = wrapper.get('.pricing-brand img')
    expect(wrapper.text()).toContain('Case Closed AI')
    expect(logo.attributes('src')).toBe('/tenant-logo.svg')
    expect(logo.attributes('alt')).toBe('Case Closed AI')
    expect(appState.fetchPublicSettings).not.toHaveBeenCalled()
  })

  it('loads public settings before rendering the fallback brand when settings are not cached', async () => {
    appState.cachedPublicSettings = null
    appState.siteName = 'Store Brand'
    appState.siteLogo = '/store-brand.svg'
    appState.publicSettingsLoaded = false
    appState.fetchPublicSettings.mockResolvedValue(null)

    const wrapper = mount(ModelPricingView, {
      global: {
        stubs: {
          Icon: IconStub,
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    })

    await flushPromises()

    const logo = wrapper.get('.pricing-brand img')
    expect(appState.fetchPublicSettings).toHaveBeenCalledOnce()
    expect(wrapper.text()).toContain('Store Brand')
    expect(logo.attributes('src')).toBe('/store-brand.svg')
  })

  it('filters by provider tab and search text', async () => {
    const wrapper = mount(ModelPricingView, {
      global: {
        stubs: {
          Icon: IconStub,
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    })

    await flushPromises()
    await wrapper.get('[data-test="provider-tab-gemini"]').trigger('click')

    expect(wrapper.text()).toContain('gemini-3-pro')
    expect(wrapper.text()).not.toContain('gpt-5.5')

    await wrapper.get('[data-test="pricing-search"]').setValue('sonnet')
    expect(wrapper.text()).toContain('没有匹配的模型')
  })

  it('shows an error state and retries loading', async () => {
    getPublicModelPricingMock
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValueOnce(catalog)

    const wrapper = mount(ModelPricingView, {
      global: {
        stubs: {
          Icon: IconStub,
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('价格表加载失败')

    await wrapper.get('[data-test="pricing-retry"]').trigger('click')
    await flushPromises()

    expect(getPublicModelPricingMock).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).toContain('gpt-5.5')
  })
})
