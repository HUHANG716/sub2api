import { describe, expect, it, vi, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'

import KeysView from '../KeysView.vue'

const {
  listKeys,
  getAvailableGroups,
  getUserGroupRates,
  getPublicSettings,
  getDashboardApiKeysUsage,
  showError,
  showSuccess
} = vi.hoisted(() => ({
  listKeys: vi.fn(),
  getAvailableGroups: vi.fn(),
  getUserGroupRates: vi.fn(),
  getPublicSettings: vi.fn(),
  getDashboardApiKeysUsage: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn()
}))

const messages: Record<string, string> = {
  'keys.createKey': 'Create API Key',
  'keys.defaultName': 'My API Key',
  'keys.nameLabel': 'Name',
  'keys.namePlaceholder': 'My API Key',
  'common.cancel': 'Cancel'
}

vi.mock('@/api', () => ({
  keysAPI: {
    list: listKeys,
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    toggleStatus: vi.fn()
  },
  authAPI: {
    getPublicSettings
  },
  usageAPI: {
    getDashboardApiKeysUsage
  },
  userGroupsAPI: {
    getAvailable: getAvailableGroups,
    getUserGroupRates
  }
}))

vi.mock('@/stores/app', () => ({
  useAppStore: () => ({ showError, showSuccess })
}))

vi.mock('@/stores/onboarding', () => ({
  useOnboardingStore: () => ({
    isCurrentStep: vi.fn(() => false),
    nextStep: vi.fn()
  })
}))

vi.mock('@/composables/useClipboard', () => ({
  useClipboard: () => ({
    copyToClipboard: vi.fn(() => Promise.resolve(true))
  })
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

const BaseDialogStub = {
  props: ['show'],
  template: '<div v-if="show"><slot /><slot name="footer" /></div>'
}

describe('user KeysView create form defaults', () => {
  beforeEach(() => {
    listKeys.mockReset()
    getAvailableGroups.mockReset()
    getUserGroupRates.mockReset()
    getPublicSettings.mockReset()
    getDashboardApiKeysUsage.mockReset()
    showError.mockReset()
    showSuccess.mockReset()

    listKeys.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 20, pages: 0 })
    getAvailableGroups.mockResolvedValue([])
    getUserGroupRates.mockResolvedValue({})
    getPublicSettings.mockResolvedValue({})
    getDashboardApiKeysUsage.mockResolvedValue({ stats: {} })
  })

  it('prefills the create-key name input with the default name', async () => {
    const wrapper = mount(KeysView, {
      global: {
        stubs: {
          AppLayout: { template: '<div><slot /></div>' },
          TablePageLayout: {
            template: '<div><slot name="filters" /><slot name="actions" /><slot name="table" /><slot name="pagination" /></div>'
          },
          DataTable: { template: '<div><slot name="empty" /></div>' },
          EmptyState: { emits: ['action'], template: '<button data-test="empty-create" @click="$emit(\'action\')">create</button>' },
          BaseDialog: BaseDialogStub,
          Pagination: true,
          ConfirmDialog: true,
          Select: true,
          SearchInput: true,
          Icon: true,
          EndpointPopover: true,
          GroupBadge: true,
          GroupOptionItem: true,
          UseKeyModal: true,
          Teleport: true
        }
      }
    })

    await flushPromises()
    await wrapper.get('[data-tour="keys-create-btn"]').trigger('click')

    expect((wrapper.get('[data-tour="key-form-name"]').element as HTMLInputElement).value)
      .toBe('My API Key')
  })
})
