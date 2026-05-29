import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import ImagePlaygroundView from '../ImagePlaygroundView.vue'
import {
  IMAGE_PLAYGROUND_AGENT_MODEL,
  IMAGE_PLAYGROUND_MODEL,
  IMAGE_PLAYGROUND_SETTINGS_STORAGE_KEY,
  IMAGE_PLAYGROUND_STORAGE_KEY,
  buildImagePlaygroundUrl,
  findConfiguredImagePlaygroundGroup
} from '../imagePlayground'
import type { ApiKey, Group } from '@/types'

const { appState, createKey, estimateImageCost, getAvailableGroups, getKeyById, listKeys } = vi.hoisted(() => ({
  appState: {
    cachedPublicSettings: {
      image_playground_group_id: 11
    } as Record<string, unknown> | null,
    fetchPublicSettings: vi.fn()
  },
  createKey: vi.fn(),
  estimateImageCost: vi.fn(),
  getAvailableGroups: vi.fn(),
  getKeyById: vi.fn(),
  listKeys: vi.fn()
}))

const messages: Record<string, string> = {
  'imagePlayground.kicker': 'Images API',
  'imagePlayground.title': 'Image Playground',
  'imagePlayground.description': 'Create and edit images through your OpenAI image group.',
  'imagePlayground.loading': 'Preparing image playground...',
  'imagePlayground.regenerateKey': 'Regenerate API Key',
  'imagePlayground.renewConfirmTitle': 'Regenerate image API Key',
  'imagePlayground.renewManualConfirmDescription': 'This will regenerate the dedicated API Key for the image playground and reload the current workspace. Continue?',
  'imagePlayground.renewExpiredConfirmDescription': 'The image playground API Key has expired. Regenerate it before continuing?',
  'imagePlayground.renewConfirmAction': 'Regenerate',
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
    create: createKey,
    getById: getKeyById,
    list: listKeys
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

function makeKeyList(items: ApiKey[]) {
  return {
    items,
    total: items.length,
    page: 1,
    page_size: 20,
    total_pages: items.length > 0 ? 1 : 0
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
    const parsed = new URL(url)
    const settings = JSON.parse(window.sessionStorage.getItem(IMAGE_PLAYGROUND_SETTINGS_STORAGE_KEY) ?? '{}')

    expect(parsed.origin + parsed.pathname).toBe('https://code.example.com/image-playground-app/')
    expect(parsed.searchParams.get('appMode')).toBe('gallery')
    expect(parsed.searchParams.get('embed')).toBe('product')
    expect(parsed.searchParams.get('settings')).toBeNull()
    expect(url).not.toContain('sk-url')
    expect(settings.activeProfileId).toBe('hahacode-images')
    expect(settings.profiles).toEqual([
      expect.objectContaining({
        id: 'hahacode-images',
        name: 'Hahacode Images API',
        provider: 'openai',
        baseUrl: 'https://code.example.com/v1',
        apiKey: 'sk-url',
        model: IMAGE_PLAYGROUND_MODEL,
        apiMode: 'images',
        streamImages: true,
        streamPartialImages: 3
      }),
      expect.objectContaining({
        id: 'hahacode-agent',
        name: 'Hahacode Agent Responses API',
        provider: 'openai',
        baseUrl: 'https://code.example.com/v1',
        apiKey: 'sk-url',
        model: IMAGE_PLAYGROUND_AGENT_MODEL,
        apiMode: 'responses',
        streamImages: true,
        streamPartialImages: 3
      })
    ])
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
    getKeyById.mockReset()
    listKeys.mockReset()
    listKeys.mockResolvedValue(makeKeyList([]))
    window.localStorage.clear()
    window.sessionStorage.clear()
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
          Icon: true,
          ConfirmDialog: true
        }
      }
    })

    await flushPromises()

    expect(appState.fetchPublicSettings).not.toHaveBeenCalled()
    expect(getAvailableGroups).toHaveBeenCalledOnce()
    expect(listKeys).toHaveBeenCalledWith(1, 20, {
      search: 'Image Playground',
      status: 'active',
      group_id: 11,
      sort_by: 'created_at',
      sort_order: 'desc'
    })
    expect(createKey).toHaveBeenCalledWith('Image Playground', 11)
    const stored = JSON.parse(window.localStorage.getItem(IMAGE_PLAYGROUND_STORAGE_KEY) || '{}')
    expect(stored).toMatchObject({
      key: 'sk-created',
      key_id: 42,
      group_id: 11,
      group_name: 'OpenAI Images'
    })
    const iframe = wrapper.get('[data-test="image-playground-frame"]')
    const iframeUrl = new URL(iframe.attributes('src'))
    const iframeSettings = JSON.parse(window.sessionStorage.getItem(IMAGE_PLAYGROUND_SETTINGS_STORAGE_KEY) ?? '{}')
    expect(iframeUrl.pathname).toBe('/image-playground-app/')
    expect(iframeUrl.searchParams.get('appMode')).toBe('gallery')
    expect(iframeUrl.searchParams.get('embed')).toBe('product')
    expect(iframeUrl.searchParams.get('refresh')).toBe('1')
    expect(iframeUrl.searchParams.get('settings')).toBeNull()
    expect(iframe.attributes('src')).not.toContain('sk-created')
    expect(iframeSettings.activeProfileId).toBe('hahacode-images')
    expect(iframeSettings.profiles).toEqual([
      expect.objectContaining({ apiKey: 'sk-created', apiMode: 'images', model: IMAGE_PLAYGROUND_MODEL }),
      expect.objectContaining({ apiKey: 'sk-created', apiMode: 'responses', model: IMAGE_PLAYGROUND_AGENT_MODEL })
    ])
    expect(wrapper.get('[data-test="image-playground-estimate"]').text()).toContain('Waiting')
  })

  it('shows estimated image cost from iframe parameter messages', async () => {
    getAvailableGroups.mockResolvedValue([makeGroup({ id: 11, name: 'OpenAI Images' })])
    listKeys.mockResolvedValue(makeKeyList([]))
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
          Icon: true,
          ConfirmDialog: true
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
    listKeys.mockResolvedValue(makeKeyList([]))
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
    getKeyById.mockResolvedValue(makeApiKey({
      id: 77,
      key: 'sk-stored',
      group_id: 11,
      created_at: '2026-05-27T00:00:00.000Z'
    }))
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

  it('validates and reuses a stored active playground key without creating another key', async () => {
    getAvailableGroups.mockResolvedValue([makeGroup({ id: 11 })])
    getKeyById.mockResolvedValue(makeApiKey({
      id: 77,
      key: 'sk-stored',
      group_id: 11,
      status: 'active'
    }))
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
    expect(getKeyById).toHaveBeenCalledWith(77)
    expect(listKeys).not.toHaveBeenCalled()
    expect(createKey).not.toHaveBeenCalled()
    const iframeUrl = new URL(wrapper.get('[data-test="image-playground-frame"]').attributes('src'))
    const iframeSettings = JSON.parse(window.sessionStorage.getItem(IMAGE_PLAYGROUND_SETTINGS_STORAGE_KEY) ?? '{}')
    expect(iframeUrl.searchParams.get('settings')).toBeNull()
    expect(wrapper.get('[data-test="image-playground-frame"]').attributes('src')).not.toContain('sk-stored')
    expect(iframeSettings.profiles).toEqual([
      expect.objectContaining({ apiKey: 'sk-stored', apiMode: 'images' }),
      expect.objectContaining({ apiKey: 'sk-stored', apiMode: 'responses' })
    ])
    expect(wrapper.get('[data-test="image-playground-key-summary"]').text()).toContain('Key #77')
    expect(wrapper.get('[data-test="image-playground-key-summary"]').text()).toContain('OpenAI Images')
  })

  it('reuses an existing active playground key when local storage is missing', async () => {
    getAvailableGroups.mockResolvedValue([makeGroup({ id: 11, name: 'OpenAI Images' })])
    listKeys.mockResolvedValue(makeKeyList([
      makeApiKey({ id: 88, key: 'sk-existing', group_id: 11, status: 'active' })
    ]))

    const wrapper = mount(ImagePlaygroundView, {
      global: {
        stubs: {
          AppLayout: BaseLayoutStub,
          Icon: true
        }
      }
    })

    await flushPromises()

    expect(getKeyById).not.toHaveBeenCalled()
    expect(createKey).not.toHaveBeenCalled()
    expect(JSON.parse(window.localStorage.getItem(IMAGE_PLAYGROUND_STORAGE_KEY) || '{}')).toMatchObject({
      key: 'sk-existing',
      key_id: 88,
      group_id: 11,
      group_name: 'OpenAI Images'
    })
    const iframeUrl = new URL(wrapper.get('[data-test="image-playground-frame"]').attributes('src'))
    const iframeSettings = JSON.parse(window.sessionStorage.getItem(IMAGE_PLAYGROUND_SETTINGS_STORAGE_KEY) ?? '{}')
    expect(iframeUrl.searchParams.get('settings')).toBeNull()
    expect(wrapper.get('[data-test="image-playground-frame"]').attributes('src')).not.toContain('sk-existing')
    expect(iframeSettings.profiles).toEqual([
      expect.objectContaining({ apiKey: 'sk-existing', apiMode: 'images' }),
      expect.objectContaining({ apiKey: 'sk-existing', apiMode: 'responses' })
    ])
  })

  it('discards an inactive stored key and reuses a matching active list key', async () => {
    window.localStorage.setItem(IMAGE_PLAYGROUND_STORAGE_KEY, JSON.stringify({
      key: 'sk-old',
      key_id: 77,
      group_id: 11,
      group_name: 'OpenAI Images',
      created_at: '2026-05-27T00:00:00.000Z'
    }))
    getAvailableGroups.mockResolvedValue([makeGroup({ id: 11, name: 'OpenAI Images' })])
    getKeyById.mockResolvedValue(makeApiKey({
      id: 77,
      key: 'sk-old',
      group_id: 11,
      status: 'inactive'
    }))
    listKeys.mockResolvedValue(makeKeyList([
      makeApiKey({ id: 88, key: 'sk-existing', group_id: 11, status: 'active' })
    ]))

    mount(ImagePlaygroundView, {
      global: {
        stubs: {
          AppLayout: BaseLayoutStub,
          Icon: true
        }
      }
    })

    await flushPromises()

    expect(getKeyById).toHaveBeenCalledWith(77)
    expect(createKey).not.toHaveBeenCalled()
    expect(JSON.parse(window.localStorage.getItem(IMAGE_PLAYGROUND_STORAGE_KEY) || '{}')).toMatchObject({
      key: 'sk-existing',
      key_id: 88,
      group_id: 11,
      group_name: 'OpenAI Images'
    })
  })

  it('discards a stored key for a different group and reuses one for the configured group', async () => {
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
    listKeys.mockResolvedValue(makeKeyList([
      makeApiKey({ id: 52, key: 'sk-existing', group_id: 11, status: 'active' })
    ]))

    mount(ImagePlaygroundView, {
      global: {
        stubs: {
          AppLayout: BaseLayoutStub,
          Icon: true
        }
      }
    })

    await flushPromises()

    expect(getKeyById).not.toHaveBeenCalled()
    expect(createKey).not.toHaveBeenCalled()
    expect(JSON.parse(window.localStorage.getItem(IMAGE_PLAYGROUND_STORAGE_KEY) || '{}')).toMatchObject({
      key: 'sk-existing',
      key_id: 52,
      group_id: 11,
      group_name: 'Configured Images'
    })
  })

  it('creates a key only when no reusable list key exists', async () => {
    getAvailableGroups.mockResolvedValue([makeGroup({ id: 11, name: 'OpenAI Images' })])
    listKeys.mockResolvedValue(makeKeyList([
      makeApiKey({ id: 60, key: 'sk-wrong-name', name: 'Manual Key', group_id: 11 }),
      makeApiKey({ id: 61, key: 'sk-wrong-group', group_id: 12 }),
      makeApiKey({ id: 62, key: 'sk-inactive', group_id: 11, status: 'inactive' }),
      makeApiKey({ id: 63, key: '', group_id: 11 })
    ]))
    createKey.mockResolvedValue(makeApiKey({ id: 64, key: 'sk-created', group_id: 11 }))

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
      key: 'sk-created',
      key_id: 64,
      group_id: 11
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

  it('refreshes access by reusing an existing dedicated key instead of creating another one', async () => {
    window.localStorage.setItem(IMAGE_PLAYGROUND_STORAGE_KEY, JSON.stringify({
      key: 'sk-old',
      key_id: 1,
      group_id: 11,
      created_at: '2026-05-27T00:00:00.000Z'
    }))
    getAvailableGroups.mockResolvedValue([makeGroup({ id: 11 })])
    getKeyById.mockResolvedValue(makeApiKey({ id: 1, key: 'sk-old', group_id: 11, status: 'active' }))
    listKeys.mockResolvedValue(makeKeyList([
      makeApiKey({ id: 88, key: 'sk-existing', group_id: 11, status: 'active' })
    ]))

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
    getKeyById.mockClear()
    await wrapper.get('[data-test="image-playground-regenerate"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-test="image-playground-regenerate"]').text()).toContain('Regenerate API Key')
    expect(wrapper.findComponent({ name: 'ConfirmDialog' }).props('show')).toBe(true)
    expect(getKeyById).not.toHaveBeenCalled()
    expect(createKey).not.toHaveBeenCalled()
    await wrapper.findComponent({ name: 'ConfirmDialog' }).vm.$emit('confirm')
    await flushPromises()

    expect(JSON.parse(window.localStorage.getItem(IMAGE_PLAYGROUND_STORAGE_KEY) || '{}')).toMatchObject({
      key: 'sk-existing',
      key_id: 88,
      group_id: 11
    })
    expect(new URL(wrapper.get('[data-test="image-playground-frame"]').attributes('src')).searchParams.get('refresh')).toBe('2')
  })

  it('asks before creating a new key when the stored key was deleted', async () => {
    window.localStorage.setItem(IMAGE_PLAYGROUND_STORAGE_KEY, JSON.stringify({
      key: 'sk-deleted',
      key_id: 77,
      group_id: 11,
      created_at: '2026-05-27T00:00:00.000Z'
    }))
    getAvailableGroups.mockResolvedValue([makeGroup({ id: 11, name: 'OpenAI Images' })])
    getKeyById.mockRejectedValue({ status: 404, message: 'not found' })
    listKeys.mockResolvedValue(makeKeyList([]))
    createKey.mockResolvedValue(makeApiKey({ id: 99, key: 'sk-new', group_id: 11 }))

    const wrapper = mount(ImagePlaygroundView, {
      global: {
        stubs: {
          AppLayout: BaseLayoutStub,
          Icon: true,
          ConfirmDialog: true
        }
      }
    })

    await flushPromises()

    expect(getKeyById).toHaveBeenCalledWith(77)
    expect(wrapper.findComponent({ name: 'ConfirmDialog' }).props('show')).toBe(true)
    expect(wrapper.findComponent({ name: 'ConfirmDialog' }).props('message')).toContain('expired')
    expect(listKeys).not.toHaveBeenCalled()
    expect(createKey).not.toHaveBeenCalled()
    expect(window.localStorage.getItem(IMAGE_PLAYGROUND_STORAGE_KEY)).toContain('sk-deleted')

    await wrapper.findComponent({ name: 'ConfirmDialog' }).vm.$emit('confirm')
    await flushPromises()

    expect(listKeys).toHaveBeenCalledWith(1, 20, expect.objectContaining({
      search: 'Image Playground',
      status: 'active',
      group_id: 11
    }))
    expect(createKey).toHaveBeenCalledWith('Image Playground', 11)
    expect(JSON.parse(window.localStorage.getItem(IMAGE_PLAYGROUND_STORAGE_KEY) || '{}')).toMatchObject({
      key: 'sk-new',
      key_id: 99,
      group_id: 11,
      group_name: 'OpenAI Images'
    })
    const iframe = wrapper.get('[data-test="image-playground-frame"]')
    const iframeUrl = new URL(iframe.attributes('src'))
    const iframeSettings = JSON.parse(window.sessionStorage.getItem(IMAGE_PLAYGROUND_SETTINGS_STORAGE_KEY) ?? '{}')
    expect(iframeUrl.searchParams.get('refresh')).toBe('1')
    expect(iframe.attributes('src')).not.toContain('sk-new')
    expect(iframeSettings.profiles).toEqual([
      expect.objectContaining({ apiKey: 'sk-new', apiMode: 'images' }),
      expect.objectContaining({ apiKey: 'sk-new', apiMode: 'responses' })
    ])
  })

  it('shows a retryable failure state when stored key verification fails', async () => {
    window.localStorage.setItem(IMAGE_PLAYGROUND_STORAGE_KEY, JSON.stringify({
      key: 'sk-old',
      key_id: 77,
      group_id: 11,
      created_at: '2026-05-27T00:00:00.000Z'
    }))
    getAvailableGroups.mockResolvedValue([makeGroup({ id: 11 })])
    getKeyById.mockRejectedValue(new Error('network down'))

    const wrapper = mount(ImagePlaygroundView, {
      global: {
        stubs: {
          AppLayout: BaseLayoutStub,
          Icon: true
        }
      }
    })

    await flushPromises()

    expect(listKeys).not.toHaveBeenCalled()
    expect(createKey).not.toHaveBeenCalled()
    expect(wrapper.find('[data-test="image-playground-frame"]').exists()).toBe(false)
    expect(wrapper.text()).toContain('Unable to prepare image key')
  })

  it('shows a retryable failure state when reusable key lookup fails', async () => {
    getAvailableGroups.mockResolvedValue([makeGroup({ id: 11 })])
    listKeys.mockRejectedValue(new Error('network down'))

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
    expect(wrapper.text()).toContain('Unable to prepare image key')
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
