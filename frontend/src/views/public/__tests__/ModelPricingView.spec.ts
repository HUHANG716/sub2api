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
  groups: [
    {
      id: 1,
      name: 'Plus 福利',
      platform: 'openai',
      rate_multiplier: 0.5,
      subscription_type: 'standard',
      is_exclusive: false,
    },
    {
      id: 2,
      name: 'Claude Kiro',
      platform: 'anthropic',
      rate_multiplier: 2.6,
      subscription_type: 'standard',
      is_exclusive: false,
    },
    {
      id: 3,
      name: 'Gemini 全家桶',
      platform: 'gemini',
      rate_multiplier: 1,
      subscription_type: 'standard',
      is_exclusive: false,
    },
  ],
  items: [
    {
      provider: 'openai',
      model: 'gpt-5.5',
      mode: 'responses',
      billing_mode: 'token',
      group_ids: [1],
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
      billing_mode: 'token',
      group_ids: [2],
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
      billing_mode: 'image',
      group_ids: [3],
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
    expect(wrapper.text()).toContain('模型广场')
    expect(wrapper.text()).toContain('USD / 1M tokens')
    expect(wrapper.text()).toContain('Plus 福利 x0.5')
    expect(wrapper.text()).toContain('Claude Kiro x2.6')
    expect(wrapper.text()).toContain('gpt-5.5')
    expect(wrapper.text()).toContain('$2.50/1M')
    expect(wrapper.text()).toContain('$10.00/1M')
    expect(wrapper.text()).toContain('$1.25/1M')
    expect(wrapper.text()).toContain('$0.2500/1M')
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

  it('filters by real group', async () => {
    const wrapper = mount(ModelPricingView, {
      global: {
        stubs: {
          Icon: IconStub,
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    })

    await flushPromises()
    await wrapper.get('[data-test="group-filter-2"]').trigger('click')

    expect(wrapper.text()).toContain('claude-sonnet-5')
    expect(wrapper.text()).toContain('Claude Kiro')
    expect(wrapper.text()).not.toContain('gpt-5.5')
    expect(wrapper.text()).not.toContain('gemini-3-pro')
  })

  it('sorts dated model snapshots from newest to oldest', async () => {
    getPublicModelPricingMock.mockResolvedValue({
      ...catalog,
      items: [
        {
          ...catalog.items[0],
          model: 'claude-4-sonnet-20250514',
        },
        {
          ...catalog.items[1],
          model: 'gpt-4o-2024-08-06',
        },
        {
          ...catalog.items[2],
          model: 'gpt-5.5',
        },
        {
          ...catalog.items[0],
          model: 'claude-3-7-sonnet-20250219',
        },
      ],
    })

    const wrapper = mount(ModelPricingView, {
      global: {
        stubs: {
          Icon: IconStub,
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    })

    await flushPromises()

    const names = wrapper.findAll('.model-title h3').map(node => node.text())
    expect(names).toEqual([
      'claude-4-sonnet-20250514',
      'claude-3-7-sonnet-20250219',
      'gpt-4o-2024-08-06',
      'gpt-5.5',
    ])
  })

  it('shows provider icons and real catalog groups instead of generic dots', async () => {
    const wrapper = mount(ModelPricingView, {
      global: {
        stubs: {
          Icon: IconStub,
          RouterLink: { template: '<a><slot /></a>' },
        },
      },
    })

    await flushPromises()

    expect(wrapper.find('.provider-dot').exists()).toBe(false)
    expect(wrapper.find('[data-test="provider-tab-openai"] .provider-filter-icon .model-icon').exists()).toBe(true)
    expect(wrapper.find('[data-test="provider-tab-anthropic"] .provider-filter-icon .model-icon').exists()).toBe(true)
    expect(wrapper.findAll('.model-group-chip').some(chip => chip.text().includes('Plus 福利') && chip.text().includes('x0.5'))).toBe(true)
    expect(wrapper.findAll('.model-group-chip').some(chip => chip.text().includes('Claude Kiro') && chip.text().includes('x2.6'))).toBe(true)

    await wrapper.get('[data-test="view-table"]').trigger('click')

    expect(wrapper.findAll('.pricing-group-chip').some(chip => chip.text().includes('Gemini 全家桶') && chip.text().includes('x1'))).toBe(true)
    expect(wrapper.find('.pricing-provider .model-icon').exists()).toBe(true)
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
