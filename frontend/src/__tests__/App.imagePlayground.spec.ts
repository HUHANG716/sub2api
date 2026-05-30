import { nextTick, onUnmounted, type Component } from 'vue'
import { mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import App from '@/App.vue'

const { routeRef, routerAfterEach, imagePlaygroundUnmounts } = vi.hoisted(() => ({
  routeRef: {
    current: null as null | {
      name: string
      path: string
      meta: Record<string, unknown>
    }
  },
  routerAfterEach: vi.fn(),
  imagePlaygroundUnmounts: {
    count: 0
  }
}))

vi.mock('vue-router', async () => {
  const vue = await vi.importActual<typeof import('vue')>('vue')
  routeRef.current ??= vue.reactive({
    name: 'Dashboard',
    path: '/dashboard',
    meta: {
      title: 'Dashboard'
    }
  })

  return {
  RouterView: vue.defineComponent({
    name: 'RouterView',
    template: '<div data-test="router-view" />'
  }),
  useRoute: () => routeRef.current,
  useRouter: () => ({
    afterEach: routerAfterEach,
    replace: vi.fn()
  })
  }
})

vi.mock('@/views/user/ImagePlaygroundView.vue', async () => {
  const vue = await vi.importActual<typeof import('vue')>('vue')
  return {
  default: vue.defineComponent({
    name: 'ImagePlaygroundView',
    setup() {
      onUnmounted(() => {
        imagePlaygroundUnmounts.count += 1
      })
    },
    template: '<div data-test="image-playground-host" />'
  })
  }
})

function componentStub(name: string): Component {
  return {
    name,
    template: '<div />'
  }
}

vi.mock('@/components/common/Toast.vue', () => ({
  default: componentStub('Toast')
}))

vi.mock('@/components/common/NavigationProgress.vue', () => ({
  default: componentStub('NavigationProgress')
}))

vi.mock('@/components/common/AnnouncementPopup.vue', () => ({
  default: componentStub('AnnouncementPopup')
}))

vi.mock('@/router/title', () => ({
  resolveDocumentTitle: vi.fn(() => 'Hahacode')
}))

vi.mock('@/api/setup', () => ({
  getSetupStatus: vi.fn(async () => ({ needs_setup: false }))
}))

const appStore = {
  siteLogo: '',
  siteName: 'Hahacode',
  fetchPublicSettings: vi.fn(async () => ({}))
}

const authStore = {
  isAuthenticated: true
}

const subscriptionStore = {
  fetchActiveSubscriptions: vi.fn(async () => undefined),
  startPolling: vi.fn(),
  clear: vi.fn()
}

const announcementStore = {
  fetchAnnouncements: vi.fn(async () => undefined),
  reset: vi.fn()
}

vi.mock('@/stores', () => ({
  useAppStore: () => appStore,
  useAuthStore: () => authStore,
  useSubscriptionStore: () => subscriptionStore,
  useAnnouncementStore: () => announcementStore
}))

describe('App image playground route persistence', () => {
  beforeEach(() => {
    if (!routeRef.current) throw new Error('route mock was not initialized')
    routeRef.current.name = 'Dashboard'
    routeRef.current.path = '/dashboard'
    routeRef.current.meta = { title: 'Dashboard' }
    imagePlaygroundUnmounts.count = 0
    routerAfterEach.mockClear()
    appStore.fetchPublicSettings.mockClear()
    subscriptionStore.fetchActiveSubscriptions.mockClear()
    subscriptionStore.startPolling.mockClear()
    subscriptionStore.clear.mockClear()
    announcementStore.fetchAnnouncements.mockClear()
    announcementStore.reset.mockClear()
    authStore.isAuthenticated = true
  })

  it('keeps the image playground mounted when navigating away and shows it again without remounting', async () => {
    const wrapper = mount(App)

    expect(wrapper.find('[data-test="image-playground-host"]').exists()).toBe(false)

    if (!routeRef.current) throw new Error('route mock was not initialized')
    routeRef.current.name = 'ImagePlayground'
    routeRef.current.path = '/image-playground'
    routeRef.current.meta = { title: 'Image Playground' }
    await nextTick()

    const firstHost = wrapper.get('[data-test="image-playground-host"]').element
    expect(wrapper.find('[data-test="router-view"]').exists()).toBe(false)

    routeRef.current.name = 'Dashboard'
    routeRef.current.path = '/dashboard'
    routeRef.current.meta = { title: 'Dashboard' }
    await nextTick()

    expect(wrapper.get('[data-test="router-view"]').exists()).toBe(true)
    expect(wrapper.get('[data-test="image-playground-host"]').element).toBe(firstHost)
    expect(wrapper.get('[data-test="image-playground-host"]').attributes('style')).toContain('display: none')
    expect(imagePlaygroundUnmounts.count).toBe(0)

    routeRef.current.name = 'ImagePlayground'
    routeRef.current.path = '/image-playground'
    routeRef.current.meta = { title: 'Image Playground' }
    await nextTick()

    expect(wrapper.get('[data-test="image-playground-host"]').element).toBe(firstHost)
    expect(wrapper.get('[data-test="image-playground-host"]').attributes('style') ?? '').not.toContain('display: none')
    expect(wrapper.find('[data-test="router-view"]').exists()).toBe(false)
    expect(imagePlaygroundUnmounts.count).toBe(0)
  })
})
