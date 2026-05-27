import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import ImagePlaygroundView from '../ImagePlaygroundView.vue'
import {
  IMAGE_PLAYGROUND_STORAGE_KEY,
  buildImagePlaygroundUrl,
  findConfiguredImagePlaygroundGroup
} from '../imagePlayground'
import type { ApiKey, Group } from '@/types'

const { appState, createKey, estimateImageCost, getAvailableGroups } = vi.hoisted(() => ({
  appState: {
    cachedPublicSettings: {
      image_playground_group_id: 11
    } as Record<string, unknown> | null,
    fetchPublicSettings: vi.fn()
  },
  createKey: vi.fn(),
  estimateImageCost: vi.fn(),
  getAvailableGroups: vi.fn()
}))

const messages: Record<string, string> = {
  'imagePlayground.kicker': 'Images API',
  'imagePlayground.title': 'Image Playground',
  'imagePlayground.description': 'Create and edit images through your OpenAI image group.',
  'imagePlayground.loading': 'Preparing image playground...',
  'imagePlayground.regenerateKey': 'Regenerate key',
  'imagePlayground.estimatedCost': 'Est. cost',
  'imagePlayground.estimateWaiting': 'Waiting',
  'imagePlayground.estimateLoading': 'Calculating',
  'imagePlayground.estimateUnavailable': 'Unavailable',
  'imagePlayground.currentKeyLabel': 'Using Key #{id}',
  'imagePlayground.groupFallback': 'Group #{id}',
  'imagePlayground.groupUnknown': 'Group not recorded',
  'imagePlayground.missingConfiguredGroupTitle': 'Image playground is not configured',
  'imagePlayground.missingConfiguredGroupDescription': 'Ask an admin to select an OpenAI image group in settings.',
  'imagePlayground.unavailableConfiguredGroupTitle': 'Image playground group is unavailable',
  'imagePlayground.unavailableConfiguredGroupDescription': 'The configured group is disabled or not available to this account.',
  'imagePlayground.createFailedTitle': 'Unable to prepare image key',
  'imagePlayground.createFailedDescription': 'Try again or create a key manually.',
  'imagePlayground.retry': 'Retry'
}

vi.mock('@/api', () => ({
  keysAPI: {
    create: createKey
  },
  usageAPI: {
    estimateImageCost
  },
  userGroupsAPI: {
    getAvailable: getAvailableGroups
  }
}))

vi.mock('@/stores/app', () => ({
  useAppStore: () => appState
}))

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string) => messages[key] ?? key
    })
  }
})

const BaseLayoutStub = {
  template: '<div><slot /></div>'
}

function makeGroup(overrides: Partial<Group> = {}): Group {
  return {
    id: 11,
    name: 'OpenAI Images',
    description: null,
    platform: 'openai',
    rate_multiplier: 1,
    is_exclusive: false,
    status: 'active',
    subscription_type: 'standard',
    daily_limit_usd: null,
    weekly_limit_usd: null,
    monthly_limit_usd: null,
    allow_image_generation: true,
    image_rate_independent: false,
    image_rate_multiplier: 1,
    image_price_1k: null,
    image_price_2k: null,
    image_price_4k: null,
    claude_code_only: false,
    fallback_group_id: null,
    fallback_group_id_on_invalid_request: null,
    require_oauth_only: false,
    require_privacy_set: false,
    created_at: '2026-05-27T00:00:00Z',
    updated_at: '2026-05-27T00:00:00Z',
    ...overrides
  }
}

function makeApiKey(overrides: Partial<ApiKey> = {}): ApiKey {
  return {
    id: 42,
    user_id: 7,
    key: 'sk-playground',
    name: 'Image Playground',
    group_id: 11,
    status: 'active',
    ip_whitelist: [],
    ip_blacklist: [],
    last_used_at: null,
    quota: 0,
    quota_used: 0,
    expires_at: null,
    created_at: '2026-05-27T00:00:00Z',
    updated_at: '2026-05-27T00:00:00Z',
    rate_limit_5h: 0,
    rate_limit_1d: 0,
    rate_limit_7d: 0,
    usage_5h: 0,
    usage_1d: 0,
    usage_7d: 0,
    window_5h_start: null,
    window_1d_start: null,
    window_7d_start: null,
    reset_5h_at: null,
    reset_1d_at: null,
    reset_7d_at: null,
    ...overrides
  }
}

describe('image playground helpers', () => {
  it('finds the configured active OpenAI group that allows image generation', () => {
    const group = makeGroup({ id: 3 })

    expect(findConfiguredImagePlaygroundGroup([
      makeGroup({ id: 1, platform: 'anthropic' }),
      makeGroup({ id: 2, allow_image_generation: false }),
      group
    ], 3)).toBe(group)
  })

  it('rejects a configured group that is not image-capable', () => {
    expect(findConfiguredImagePlaygroundGroup([
      makeGroup({ id: 11, allow_image_generation: false })
    ], 11)).toBeNull()
  })

  it('builds a same-origin playground URL for the OpenAI Images API', () => {
    const url = buildImagePlaygroundUrl({
      origin: 'https://code.example.com',
      apiKey: 'sk-url'
    })

    expect(url).toBe(
      'https://code.example.com/image-playground-app/?apiUrl=https%3A%2F%2Fcode.example.com%2Fv1&apiKey=sk-url&apiMode=images&appMode=gallery&model=gpt-image-2&streamImages=true&streamPartialImages=3'
    )
  })
})

describe('ImagePlaygroundView', () => {
  let consoleError: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    appState.cachedPublicSettings = {
      image_playground_group_id: 11
    }
    appState.fetchPublicSettings.mockReset()
    appState.fetchPublicSettings.mockResolvedValue(appState.cachedPublicSettings)
    createKey.mockReset()
    estimateImageCost.mockReset()
    getAvailableGroups.mockReset()
    window.localStorage.clear()
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    consoleError.mockRestore()
  })

  it('automatically creates a dedicated key for the admin configured group', async () => {
    getAvailableGroups.mockResolvedValue([makeGroup({ id: 11, name: 'OpenAI Images' })])
    createKey.mockResolvedValue(makeApiKey({ id: 42, key: 'sk-created', group_id: 11 }))

    const wrapper = mount(ImagePlaygroundView, {
      global: {
        stubs: {
          AppLayout: BaseLayoutStub,
          Icon: true
        }
      }
    })

    await flushPromises()

    expect(appState.fetchPublicSettings).not.toHaveBeenCalled()
    expect(getAvailableGroups).toHaveBeenCalledOnce()
    expect(createKey).toHaveBeenCalledWith('Image Playground', 11)
    const stored = JSON.parse(window.localStorage.getItem(IMAGE_PLAYGROUND_STORAGE_KEY) || '{}')
    expect(stored).toMatchObject({
      key: 'sk-created',
      key_id: 42,
      group_id: 11,
      group_name: 'OpenAI Images'
    })
    const iframe = wrapper.get('[data-test="image-playground-frame"]')
    expect(iframe.attributes('src')).toContain('/image-playground-app/?')
    expect(iframe.attributes('src')).toContain('apiMode=images')
    expect(iframe.attributes('src')).toContain('appMode=gallery')
    expect(iframe.attributes('src')).toContain('model=gpt-image-2')
    expect(wrapper.get('[data-test="image-playground-estimate"]').text()).toContain('Waiting')
  })

  it('shows estimated image cost from iframe parameter messages', async () => {
    getAvailableGroups.mockResolvedValue([makeGroup({ id: 11, name: 'OpenAI Images' })])
    createKey.mockResolvedValue(makeApiKey({ id: 42, key: 'sk-created', group_id: 11 }))
    estimateImageCost.mockResolvedValue({
      model: 'gpt-image-2',
      image_size: '1K',
      image_count: 2,
      unit_cost: 0.03,
      total_cost: 0.06,
      actual_cost: 0.09,
      rate_multiplier: 1.5,
      billing_mode: 'image',
      pricing_source: 'fallback'
    })

    const wrapper = mount(ImagePlaygroundView, {
      global: {
        stubs: {
          AppLayout: BaseLayoutStub,
          Icon: true
        }
      }
    })

    await flushPromises()
    window.dispatchEvent(new MessageEvent('message', {
      origin: window.location.origin,
      data: {
        type: 'hahacode:image-playground-params',
        payload: {
          model: 'gpt-image-2',
          size: '1024x1024',
          count: 2
        }
      }
    }))
    await flushPromises()

    expect(estimateImageCost).toHaveBeenCalledWith({
      group_id: 11,
      model: 'gpt-image-2',
      size: '1024x1024',
      count: 2
    }, expect.any(Object))
    expect(wrapper.get('[data-test="image-playground-estimate"]').text()).toContain('$0.0900')
  })

  it('fetches public settings when the admin configured group is not cached yet', async () => {
    appState.cachedPublicSettings = null
    appState.fetchPublicSettings.mockResolvedValue({ image_playground_group_id: 11 })
    getAvailableGroups.mockResolvedValue([makeGroup({ id: 11 })])
    createKey.mockResolvedValue(makeApiKey({ id: 43, key: 'sk-fetched', group_id: 11 }))

    mount(ImagePlaygroundView, {
      global: {
        stubs: {
          AppLayout: BaseLayoutStub,
          Icon: true
        }
      }
    })

    await flushPromises()

    expect(appState.fetchPublicSettings).toHaveBeenCalledOnce()
    expect(createKey).toHaveBeenCalledWith('Image Playground', 11)
  })

  it('renders the playground as a flush workspace instead of a framed card', async () => {
    getAvailableGroups.mockResolvedValue([makeGroup({ id: 11, name: 'OpenAI Images' })])
    window.localStorage.setItem(IMAGE_PLAYGROUND_STORAGE_KEY, JSON.stringify({
      key: 'sk-stored',
      key_id: 77,
      group_id: 11,
      group_name: 'OpenAI Images',
      created_at: '2026-05-27T00:00:00.000Z'
    }))

    const wrapper = mount(ImagePlaygroundView, {
      global: {
        stubs: {
          AppLayout: BaseLayoutStub,
          Icon: true
        }
      }
    })

    await flushPromises()

    expect(wrapper.get('[data-test="image-playground-page"]').classes()).toContain('image-playground-page--flush')
    expect(wrapper.get('[data-test="image-playground-header"]').classes()).toContain('image-playground-toolbar')
    expect(wrapper.get('[data-test="image-playground-frame"]').classes()).toContain('image-playground-frame--workspace')
  })

  it('reuses a stored playground key without creating another key', async () => {
    getAvailableGroups.mockResolvedValue([makeGroup({ id: 11 })])
    window.localStorage.setItem(IMAGE_PLAYGROUND_STORAGE_KEY, JSON.stringify({
      key: 'sk-stored',
      key_id: 77,
      group_id: 11,
      created_at: '2026-05-27T00:00:00.000Z'
    }))

    const wrapper = mount(ImagePlaygroundView, {
      global: {
        stubs: {
          AppLayout: BaseLayoutStub,
          Icon: true
        }
      }
    })

    await flushPromises()

    expect(getAvailableGroups).toHaveBeenCalledOnce()
    expect(createKey).not.toHaveBeenCalled()
    expect(wrapper.get('[data-test="image-playground-frame"]').attributes('src')).toContain('apiKey=sk-stored')
    expect(wrapper.get('[data-test="image-playground-key-summary"]').text()).toContain('Key #77')
    expect(wrapper.get('[data-test="image-playground-key-summary"]').text()).toContain('Group #11')
  })

  it('discards a stored key for a different group and creates one for the configured group', async () => {
    window.localStorage.setItem(IMAGE_PLAYGROUND_STORAGE_KEY, JSON.stringify({
      key: 'sk-old',
      key_id: 77,
      group_id: 12,
      group_name: 'Old Images',
      created_at: '2026-05-27T00:00:00.000Z'
    }))
    getAvailableGroups.mockResolvedValue([
      makeGroup({ id: 11, name: 'Configured Images' }),
      makeGroup({ id: 12, name: 'Old Images' })
    ])
    createKey.mockResolvedValue(makeApiKey({ id: 52, key: 'sk-new', group_id: 11 }))

    mount(ImagePlaygroundView, {
      global: {
        stubs: {
          AppLayout: BaseLayoutStub,
          Icon: true
        }
      }
    })

    await flushPromises()

    expect(createKey).toHaveBeenCalledWith('Image Playground', 11)
    expect(JSON.parse(window.localStorage.getItem(IMAGE_PLAYGROUND_STORAGE_KEY) || '{}')).toMatchObject({
      key: 'sk-new',
      key_id: 52,
      group_id: 11,
      group_name: 'Configured Images'
    })
  })

  it('shows admin configuration guidance when no group is configured', async () => {
    appState.cachedPublicSettings = {
      image_playground_group_id: 0
    }

    const wrapper = mount(ImagePlaygroundView, {
      global: {
        stubs: {
          AppLayout: BaseLayoutStub,
          Icon: true
        }
      }
    })

    await flushPromises()

    expect(getAvailableGroups).not.toHaveBeenCalled()
    expect(createKey).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="image-playground-frame"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Image playground is not configured')
  })

  it('shows unavailable guidance when configured group is not available to the user', async () => {
    getAvailableGroups.mockResolvedValue([
      makeGroup({ id: 1, platform: 'openai', allow_image_generation: false }),
      makeGroup({ id: 2, platform: 'gemini' })
    ])

    const wrapper = mount(ImagePlaygroundView, {
      global: {
        stubs: {
          AppLayout: BaseLayoutStub,
          Icon: true
        }
      }
    })

    await flushPromises()

    expect(createKey).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="image-playground-frame"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Image playground group is unavailable')
  })

  it('clears the stored key and automatically creates a replacement when regenerate is clicked', async () => {
    window.localStorage.setItem(IMAGE_PLAYGROUND_STORAGE_KEY, JSON.stringify({
      key: 'sk-old',
      key_id: 1,
      group_id: 11,
      created_at: '2026-05-27T00:00:00.000Z'
    }))
    getAvailableGroups.mockResolvedValue([makeGroup({ id: 11 })])
    createKey.mockResolvedValue(makeApiKey({ id: 88, key: 'sk-new', group_id: 11 }))

    const wrapper = mount(ImagePlaygroundView, {
      global: {
        stubs: {
          AppLayout: BaseLayoutStub,
          Icon: true
        }
      }
    })

    await flushPromises()
    createKey.mockClear()
    await wrapper.get('[data-test="image-playground-regenerate"]').trigger('click')
    await flushPromises()

    expect(createKey).toHaveBeenCalledWith('Image Playground', 11)
    expect(JSON.parse(window.localStorage.getItem(IMAGE_PLAYGROUND_STORAGE_KEY) || '{}')).toMatchObject({
      key: 'sk-new',
      key_id: 88,
      group_id: 11
    })
  })

  it('shows a retryable failure state when key creation does not return a plaintext key', async () => {
    getAvailableGroups.mockResolvedValue([makeGroup({ id: 11 })])
    createKey.mockResolvedValue(makeApiKey({ key: '' }))

    const wrapper = mount(ImagePlaygroundView, {
      global: {
        stubs: {
          AppLayout: BaseLayoutStub,
          Icon: true
        }
      }
    })

    await flushPromises()

    expect(wrapper.find('[data-test="image-playground-frame"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Unable to prepare image key')
  })
})
