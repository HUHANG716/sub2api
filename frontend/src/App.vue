<script setup lang="ts">
import { RouterView, useRouter, useRoute } from 'vue-router'
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import Toast from '@/components/common/Toast.vue'
import NavigationProgress from '@/components/common/NavigationProgress.vue'
import { applyRouteSeo } from '@/router/seo'
import { resolveRouteMetaKeys } from '@/router/title'
import AnnouncementPopup from '@/components/common/AnnouncementPopup.vue'
import { useAppStore, useAuthStore, useSubscriptionStore, useAnnouncementStore, useAdminSettingsStore } from '@/stores'
import ImagePlaygroundView from '@/views/user/ImagePlaygroundView.vue'
import { clearStoredImagePlaygroundKey } from '@/views/user/imagePlayground'
import { getSetupStatus } from '@/api/setup'
import { updateFavicon } from '@/utils/branding'
import { FeatureFlags, resolveFeatureFlag } from '@/utils/featureFlags'
import { resolveSiteBillingMode } from '@/utils/siteBillingMode'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const authStore = useAuthStore()
const subscriptionStore = useSubscriptionStore()
const announcementStore = useAnnouncementStore()
const adminSettingsStore = useAdminSettingsStore()
const imagePlaygroundMounted = ref(false)
const imagePlaygroundSessionId = ref(0)
const isImagePlaygroundRoute = computed(() => route.name === 'ImagePlayground' || route.path === '/image-playground')
const authSessionKey = computed(() => {
  if (!authStore.isAuthenticated) return ''
  const user = authStore.user as { id?: unknown; username?: unknown } | null | undefined
  return typeof user?.id === 'number' || typeof user?.id === 'string'
    ? String(user.id)
    : typeof user?.username === 'string'
    ? user.username
    : 'authenticated'
})

watch(
  isImagePlaygroundRoute,
  (active) => {
    if (active) imagePlaygroundMounted.value = true
  },
  { immediate: true }
)

function applyCurrentRouteSeo() {
  const customMenuItems = [
    ...(appStore.cachedPublicSettings?.custom_menu_items ?? []),
    ...(authStore.isAdmin ? adminSettingsStore.customMenuItems : []),
  ]
  const id = typeof route.params.id === 'string' ? route.params.id : ''
  const menuItem = route.name === 'CustomPage' && id
    ? customMenuItems.find((item) => item.id === id)
    : undefined

  if (menuItem?.label) {
    applyRouteSeo({ title: menuItem.label, canonicalPath: route.path }, appStore.siteName)
    return
  }

  const { titleKey } = resolveRouteMetaKeys(route, {
    billingMode: resolveSiteBillingMode(appStore.cachedPublicSettings),
  })
  applyRouteSeo({ ...route.meta, titleKey }, appStore.siteName)
}

// Watch for site settings changes and update favicon/title
watch(
  () => appStore.siteLogo,
  (newLogo) => {
    if (newLogo) {
      updateFavicon(newLogo)
    }
  },
  { immediate: true }
)

watch(
  [
    () => route.fullPath,
    () => route.meta.seoTitle,
    () => route.meta.seoDescription,
    () => route.meta.seoKeywords,
    () => route.meta.canonicalPath,
    () => route.meta.structuredData,
    () => route.meta.title,
    () => route.meta.titleKey,
    () => appStore.siteName,
    () => appStore.cachedPublicSettings?.custom_menu_items,
    () => appStore.cachedPublicSettings?.subscription_enabled,
    () => appStore.cachedPublicSettings?.payment_balance_disabled,
    () => authStore.isAdmin,
    () => adminSettingsStore.customMenuItems,
  ],
  applyCurrentRouteSeo,
  { deep: true }
)

// Watch for authentication state and manage subscription data + announcements
function onVisibilityChange() {
  if (document.visibilityState === 'visible' && authStore.isAuthenticated) {
    announcementStore.fetchAnnouncements()
  }
}

// 订阅功能开关（opt-out）。关闭后不再预加载/轮询订阅接口；开关在登录后才到达时补启动，反向则清空。
const subscriptionFeatureEnabled = computed(() =>
  resolveFeatureFlag(appStore.cachedPublicSettings, FeatureFlags.subscription)
)

function startSubscriptionSync() {
  subscriptionStore.fetchActiveSubscriptions().catch((error) => {
    console.error('Failed to preload subscriptions:', error)
  })
  subscriptionStore.startPolling()
}

watch(subscriptionFeatureEnabled, (enabled) => {
  if (!authStore.isAuthenticated) return
  if (enabled) {
    startSubscriptionSync()
  } else {
    subscriptionStore.clear()
  }
})

watch(
  () => authStore.isAuthenticated,
  (isAuthenticated, oldValue) => {
    if (isAuthenticated) {
      // User logged in: preload subscriptions and start polling (skipped when the
      // subscription feature is switched off; see the flag watcher below)
      if (subscriptionFeatureEnabled.value) {
        startSubscriptionSync()
      }

      // Announcements: new login vs page refresh restore
      if (oldValue === false) {
        // New login: delay 3s then force fetch
        setTimeout(() => announcementStore.fetchAnnouncements(true), 3000)
      } else {
        // Page refresh restore (oldValue was undefined)
        announcementStore.fetchAnnouncements()
      }

      // Register visibility change listener
      document.addEventListener('visibilitychange', onVisibilityChange)
    } else {
      // User logged out: clear data and stop polling
      subscriptionStore.clear()
      announcementStore.reset()
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  },
  { immediate: true }
)

watch(
  authSessionKey,
  (sessionKey, previousSessionKey) => {
    if (previousSessionKey === undefined || sessionKey === previousSessionKey) return
    clearStoredImagePlaygroundKey()
    imagePlaygroundMounted.value = false
    imagePlaygroundSessionId.value += 1
    if (isImagePlaygroundRoute.value && sessionKey) {
      imagePlaygroundMounted.value = true
    }
  }
)

// Route change trigger (throttled by store)
router.afterEach(() => {
  if (authStore.isAuthenticated) {
    announcementStore.fetchAnnouncements()
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
})

onMounted(async () => {
  // Check if setup is needed
  try {
    const status = await getSetupStatus()
    if (status.needs_setup && route.path !== '/setup') {
      router.replace('/setup')
      return
    }
  } catch {
    // If setup endpoint fails, assume normal mode and continue
  }

  // Load public settings into appStore (will be cached for other components)
  await appStore.fetchPublicSettings()

  // Re-resolve SEO tags now that site settings are available
  applyCurrentRouteSeo()
})
</script>

<template>
  <NavigationProgress />
  <RouterView v-if="!isImagePlaygroundRoute" />
  <ImagePlaygroundView
    v-if="imagePlaygroundMounted"
    v-show="isImagePlaygroundRoute"
    :key="imagePlaygroundSessionId"
  />
  <Toast />
  <AnnouncementPopup />
</template>
