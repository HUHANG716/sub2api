import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

const {
  getOptions,
  getTemplates,
  estimate,
  generate,
  showError,
  showSuccess,
  refreshUser,
} = vi.hoisted(() => ({
  getOptions: vi.fn(),
  getTemplates: vi.fn(),
  estimate: vi.fn(),
  generate: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
  refreshUser: vi.fn(),
}))

vi.mock('@/api/images', () => ({
  default: {
    getOptions,
    getTemplates,
    estimate,
    generate,
  },
}))

vi.mock('@/stores/app', () => ({
  useAppStore: () => ({
    showError,
    showSuccess,
  }),
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    user: { balance: 10 },
    refreshUser,
  }),
}))

vi.mock('@/composables/useClipboard', () => ({
  useClipboard: () => ({
    copyToClipboard: vi.fn(() => Promise.resolve(true)),
  }),
}))

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, params?: Record<string, unknown>) => {
        if (!params) return key
        return Object.entries(params).reduce(
          (message, [name, value]) => message.replace(`{${name}}`, String(value)),
          key,
        )
      },
    }),
  }
})

import ImageStudioView from '../ImageStudioView.vue'

const referenceTemplate = {
  key: 'reference-template',
  mode: 'edit' as const,
  title: 'Reference template',
  model: 'GPT Image 2',
  image: '/template.jpg',
  prompt: 'Edit [PRODUCT] into a premium campaign image',
  source_name: 'Test source',
  source_url: 'https://example.com',
  source_type: 'test',
  meta: 'Test',
  tags: ['product'],
  requires_reference: false,
}

const mountView = async () => {
  const wrapper = mount(ImageStudioView, {
    global: {
      stubs: {
        AppLayout: { template: '<div><slot /></div>' },
        Icon: { props: ['name'], template: '<span :data-icon="name" />' },
      },
    },
  })
  await flushPromises()
  return wrapper
}

describe('ImageStudioView onboarding flow', () => {
  beforeEach(() => {
    getOptions.mockReset()
    getTemplates.mockReset()
    estimate.mockReset()
    generate.mockReset()
    showError.mockReset()
    showSuccess.mockReset()
    refreshUser.mockReset()
    window.localStorage.clear()
    URL.createObjectURL = vi.fn(() => 'blob:reference-image')
    URL.revokeObjectURL = vi.fn()

    getOptions.mockResolvedValue({
      default_model: 'gpt-image-2',
      balance: 10,
      groups: [
        {
          id: 7,
          name: 'Default image group',
          image_price_1k: 0.01,
          image_price_2k: 0.02,
          image_price_4k: 0.04,
          image_rate_multiplier: 1,
          image_rate_independent: true,
        },
      ],
      prices: {},
    })
    getTemplates.mockResolvedValue([referenceTemplate])
    estimate.mockResolvedValue({ estimated_cost: 0.02, billing_size: '2K' })
  })

  it('selects the first group and keeps generation blocked until prompt is written', async () => {
    const wrapper = await mountView()

    expect(wrapper.find('[data-test="creation-console"]').exists()).toBe(true)
    expect(wrapper.findAll('[data-test="prompt-panel"]')).toHaveLength(1)
    expect((wrapper.get('[data-test="group-select"]').element as HTMLSelectElement).value).toBe('7')
    expect(wrapper.text()).toContain('imageStudio.blockerNoPrompt')
    expect(wrapper.get('button.btn-primary.w-full').attributes('disabled')).toBeDefined()
  })

  it('keeps reference images optional in the main generation flow', async () => {
    const wrapper = await mountView()

    await wrapper.get('[data-test="image-prompt"]').setValue('Make a cleaner product hero image')
    await flushPromises()

    expect(wrapper.find('[data-test="reference-panel"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('imageStudio.blockerNeedsReference')
    expect(wrapper.get('button.btn-primary.w-full').attributes('disabled')).toBeUndefined()
  })

  it('opens the template market from the global bar', async () => {
    const wrapper = await mountView()

    await wrapper.get('[data-test="open-template-market"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="template-library"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="creation-console"]').exists()).toBe(false)
  })

  it('selects a template from the generation library detail without requiring a reference image', async () => {
    const wrapper = await mountView()

    expect(wrapper.find('[data-test="creation-console"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="template-library"]').exists()).toBe(false)

    await wrapper.get('[data-test="open-template-library"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="template-library"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="creation-console"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="prompt-panel"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="return-generation"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="template-thumbnail-list"]').classes()).toContain('overflow-y-auto')
    expect(wrapper.get('.image-studio-template-detail > .image-studio-scroll-pane').classes()).toContain('overflow-y-auto')

    await wrapper.get('[data-test="template-card"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-test="use-template"]').trigger('click')
    await flushPromises()

    expect((wrapper.get('[data-test="image-prompt"]').element as HTMLTextAreaElement).value)
      .toContain('Edit [PRODUCT] into a premium campaign image')
    expect(wrapper.find('[data-test="template-library"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="creation-console"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="prompt-panel"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="applied-template-summary"]').text()).toContain('imageStudio.templateAppliedTitle')
    expect(wrapper.find('[data-test="reference-panel"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain('imageStudio.blockerNeedsReference')
    expect(wrapper.text()).not.toContain('imageStudio.templateReferenceNextStep')
  })

  it('keeps generation and local edit prompts as separate drafts', async () => {
    const wrapper = await mountView()
    const prompt = wrapper.get('[data-test="image-prompt"]')

    await prompt.setValue('Text generation draft')
    await wrapper.get('[data-test="start-card-localEdit"]').trigger('click')
    await flushPromises()

    expect((wrapper.get('[data-test="image-prompt"]').element as HTMLTextAreaElement).value).toBe('')

    await wrapper.get('[data-test="image-prompt"]').setValue('Local edit draft')
    await wrapper.get('[data-test="start-card-text"]').trigger('click')
    await flushPromises()

    expect((wrapper.get('[data-test="image-prompt"]').element as HTMLTextAreaElement).value).toBe('Text generation draft')

    await wrapper.get('[data-test="start-card-localEdit"]').trigger('click')
    await flushPromises()

    expect((wrapper.get('[data-test="image-prompt"]').element as HTMLTextAreaElement).value).toBe('Local edit draft')
  })

  it('opens output settings in a popup and updates the generation plan', async () => {
    const wrapper = await mountView()

    expect(wrapper.find('[data-test="settings-popup"]').exists()).toBe(false)
    await wrapper.get('[data-test="open-settings-popup"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="settings-popup"]').exists()).toBe(true)
    await wrapper.get('[data-test="output-setting-size"] select').setValue('4K')
    await flushPromises()

    expect((wrapper.get('[data-test="output-setting-size"] select').element as HTMLSelectElement).value).toBe('4K')
    expect(wrapper.find('[data-test="output-setting-ratio"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="open-settings-popup"]').text()).toContain('4K')
  })

  it('keeps local edit tools in the wide workspace without duplicate side-panel editors', async () => {
    const wrapper = await mountView()
    const file = new File(['image'], 'reference.png', { type: 'image/png' })
    const input = wrapper.get('[data-test="reference-input"]').element as HTMLInputElement
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [file],
    })

    await wrapper.get('[data-test="reference-input"]').trigger('change')
    await flushPromises()
    await wrapper.get('[data-test="start-card-localEdit"]').trigger('click')
    await flushPromises()

    expect(wrapper.find('[data-test="local-edit-panel"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="local-edit-workspace"]').isVisible()).toBe(true)
    expect(wrapper.find('[data-test="local-edit-tools"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="local-edit-workspace"] canvas').exists()).toBe(true)
    expect(wrapper.find('[data-test="open-mask-editor"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="mask-editor-popup"]').exists()).toBe(false)
    expect(wrapper.find('[data-test="local-edit-panel"] canvas').exists()).toBe(false)
  })

  it('shows a low-balance recovery action when the estimate exceeds balance', async () => {
    estimate.mockResolvedValue({ estimated_cost: 20, billing_size: '4K' })

    const wrapper = await mountView()
    await flushPromises()
    await wrapper.get('[data-test="image-prompt"]').setValue('A polished product hero shot')
    await flushPromises()

    expect(wrapper.text()).toContain('imageStudio.blockerBalance')
    expect(wrapper.get('button.btn-primary.w-full').attributes('disabled')).toBeDefined()
  })
})
