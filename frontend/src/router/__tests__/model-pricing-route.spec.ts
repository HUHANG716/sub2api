import { describe, expect, it, vi } from 'vitest'

window.scrollTo = vi.fn()

const authStore = vi.hoisted(() => ({
  checkAuth: vi.fn(),
  isAuthenticated: false,
  isAdmin: false,
  isSimpleMode: false,
  hasPendingAuthSession: false,
}))

const appStore = vi.hoisted(() => ({
  siteName: 'Hahacode',
  backendModeEnabled: false,
  cachedPublicSettings: null as null | Record<string, unknown>,
}))

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => authStore,
}))

vi.mock('@/stores/app', () => ({
  useAppStore: () => appStore,
}))

vi.mock('@/stores/adminSettings', () => ({
  useAdminSettingsStore: () => ({
    customMenuItems: [],
  }),
}))

vi.mock('@/composables/useNavigationLoading', () => ({
  useNavigationLoadingState: () => ({
    startNavigation: vi.fn(),
    endNavigation: vi.fn(),
    isLoading: { value: false },
  }),
}))

vi.mock('@/composables/useRoutePrefetch', () => ({
  useRoutePrefetch: () => ({
    triggerPrefetch: vi.fn(),
    cancelPendingPrefetch: vi.fn(),
    resetPrefetchState: vi.fn(),
  }),
}))

vi.mock('@/api/setup', () => ({
  getSetupStatus: vi.fn().mockResolvedValue({ needs_setup: false }),
}))

describe('router model pricing route', () => {
  it('registers /model-pricing as a public route', async () => {
    const { default: router } = await import('@/router')
    const route = router.getRoutes().find((record) => record.name === 'ModelPricing')

    expect(route?.path).toBe('/model-pricing')
    expect(route?.meta.requiresAuth).toBe(false)
    expect(route?.meta.title).toBe('Model Pricing')
  })

  it('allows anonymous backend-mode access to /model-pricing', async () => {
    appStore.backendModeEnabled = true
    const { default: router } = await import('@/router')

    await router.push('/model-pricing')
    await router.isReady()

    expect(router.currentRoute.value.path).toBe('/model-pricing')
  })
})
