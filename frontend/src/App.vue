<script setup lang="ts">
import { RouterView, useRouter, useRoute } from 'vue-router'
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import Toast from '@/components/common/Toast.vue'
import NavigationProgress from '@/components/common/NavigationProgress.vue'
import { applyRouteSeo } from '@/router/seo'
import AdminComplianceDialog from '@/components/admin/AdminComplianceDialog.vue'
import AnnouncementPopup from '@/components/common/AnnouncementPopup.vue'
import { useAppStore, useAuthStore, useSubscriptionStore, useAnnouncementStore, useAdminComplianceStore, useAdminSettingsStore } from '@/stores'
import ImagePlaygroundView from '@/views/user/ImagePlaygroundView.vue'
import { clearStoredImagePlaygroundKey } from '@/views/user/imagePlayground'
import { getSetupStatus } from '@/api/setup'

const router = useRouter()
const route = useRoute()
const appStore = useAppStore()
const authStore = useAuthStore()
const subscriptionStore = useSubscriptionStore()
const announcementStore = useAnnouncementStore()
const adminComplianceStore = useAdminComplianceStore()
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

  applyRouteSeo(route.meta, appStore.siteName)
}

/**
 * Update favicon dynamically
 * @param logoUrl - URL of the logo to use as favicon
 */
function updateFavicon(logoUrl: string) {
  // Find existing favicon link or create new one
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  link.type = logoUrl.endsWith('.svg') ? 'image/svg+xml' : 'image/x-icon'
  link.href = logoUrl
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

function onAdminComplianceRequired(event: Event) {
  const detail = (event as CustomEvent<Record<string, string>>).detail || {}
  adminComplianceStore.requireAcknowledgement(detail)
}

watch(
  () => authStore.isAuthenticated,
  (isAuthenticated, oldValue) => {
    if (isAuthenticated) {
      if (authStore.isAdmin) {
        adminComplianceStore.fetchStatus().catch((error) => {
          console.error('Failed to fetch admin compliance status:', error)
        })
      }

      // User logged in: preload subscriptions and start polling
      subscriptionStore.fetchActiveSubscriptions().catch((error) => {
        console.error('Failed to preload subscriptions:', error)
      })
      subscriptionStore.startPolling()

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
      adminComplianceStore.reset()
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
  window.removeEventListener('admin-compliance-required', onAdminComplianceRequired)
})

onMounted(async () => {
  window.addEventListener('admin-compliance-required', onAdminComplianceRequired)

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
  <AdminComplianceDialog />
</template>
