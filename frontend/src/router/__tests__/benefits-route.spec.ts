import { describe, expect, it, vi } from 'vitest'

window.scrollTo = vi.fn()

vi.mock('@/stores/auth', () => ({
  useAuthStore: () => ({
    checkAuth: vi.fn(),
    isAuthenticated: true,
    isAdmin: true,
    isSimpleMode: false,
    hasPendingAuthSession: false,
  }),
}))

vi.mock('@/stores/app', () => ({
  useAppStore: () => ({
    siteName: 'Hahacode',
    backendModeEnabled: false,
    cachedPublicSettings: null,
  }),
}))

vi.mock('@/stores/adminSettings', () => ({
  useAdminSettingsStore: () => ({
    customMenuItems: [],
  }),
}))

vi.mock('@/stores/adminCompliance', () => ({
  useAdminComplianceStore: () => ({
    ensureLoaded: vi.fn(),
    requiresAcceptance: false,
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

describe('benefit routes', () => {
  it('registers user and admin benefit routes', async () => {
    const { default: router } = await import('@/router')
    const userRoute = router.getRoutes().find((record) => record.name === 'Benefits')
    const adminRoute = router.getRoutes().find((record) => record.name === 'AdminBenefits')

    expect(userRoute?.path).toBe('/benefits')
    expect(userRoute?.meta.requiresAuth).toBe(true)
    expect(userRoute?.meta.titleKey).toBe('benefits.title')
    expect(adminRoute?.path).toBe('/admin/benefits')
    expect(adminRoute?.meta.requiresAdmin).toBe(true)
    expect(adminRoute?.meta.titleKey).toBe('admin.benefits.title')
  })
})
