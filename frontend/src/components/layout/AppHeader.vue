<template>
  <header class="glass sticky top-0 z-30 border-b border-gray-200/50 dark:border-dark-700/50">
    <div class="relative flex h-16 items-center justify-between gap-2 px-2 sm:px-4 md:px-6">
      <!-- Left: Mobile Menu Toggle + Page Title -->
      <div class="flex shrink-0 items-center gap-2 sm:gap-4">
        <button
          @click="toggleMobileSidebar"
          class="btn-ghost btn-icon lg:hidden"
          :aria-label="t('common.toggleMenu')"
        >
          <Icon name="menu" size="md" />
        </button>

        <div class="hidden lg:block">
          <h1 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ pageTitle }}
          </h1>
          <p v-if="pageDescription" class="text-xs text-gray-500 dark:text-dark-400">
            {{ pageDescription }}
          </p>
        </div>
      </div>

      <div
        v-if="discountCampaignText"
        class="header-discount-campaign"
        :title="discountCampaignText"
      >
        <span>{{ discountCampaignText }}</span>
      </div>

      <!-- Right: Quick actions + Announcements + Docs + Language + Theme + Subscriptions -->
      <div class="flex items-center gap-2 sm:gap-3">
        <nav class="flex items-center gap-4" aria-label="Header quick links">
          <router-link
            v-if="showPaymentShortcut"
            to="/purchase"
            class="header-recharge-link"
            :title="t('nav.buySubscription')"
          >
            <Icon name="dollar" size="sm" />
            <span class="hidden sm:inline">{{ t('nav.buySubscription') }}</span>
          </router-link>
        </nav>

        <!-- Announcement Bell -->
        <AnnouncementBell v-if="user" />

        <!-- Docs Link -->
        <a
          v-if="docUrl"
          :href="docUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-dark-400 dark:hover:bg-dark-800 dark:hover:text-white"
        >
          <Icon name="book" size="sm" />
          <span class="hidden sm:inline">{{ t('nav.docs') }}</span>
        </a>

        <!-- Model Plaza Entry -->
        <router-link
          v-if="user && modelPlazaEnabled"
          :to="{ path: '/model-plaza', query: { embedded: '1' } }"
          class="hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:text-dark-400 dark:hover:bg-dark-800 dark:hover:text-white sm:flex"
        >
          <Icon name="grid" size="sm" />
          <span class="hidden sm:inline">{{ t('nav.modelPlaza') }}</span>
        </router-link>

        <!-- Language Switcher -->
        <LocaleSwitcher icon-only />

        <!-- Theme Switch -->
        <ThemeSwitch />

        <!-- Subscription Progress (for users with active subscriptions) -->
        <SubscriptionProgressMini v-if="user" />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAppStore, useAuthStore } from '@/stores'
import { useAdminSettingsStore } from '@/stores/adminSettings'
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'
import SubscriptionProgressMini from '@/components/common/SubscriptionProgressMini.vue'
import AnnouncementBell from '@/components/common/AnnouncementBell.vue'
import ThemeSwitch from '@/components/common/ThemeSwitch.vue'
import Icon from '@/components/icons/Icon.vue'
import type { GlobalDiscountRuntime } from '@/types'
import { sanitizeUrl } from '@/utils/url'
import { FeatureFlags, isFeatureFlagEnabled } from '@/utils/featureFlags'

const route = useRoute()
const { t } = useI18n()
const appStore = useAppStore()
const authStore = useAuthStore()
const adminSettingsStore = useAdminSettingsStore()
const nowMs = ref(Date.now())
let discountClockTimer: ReturnType<typeof setInterval> | null = null
let discountBoundaryTimer: ReturnType<typeof setTimeout> | null = null
let discountBoundaryRefreshMounted = true
const discountBoundaryRetryDelayMs = 5_000
const maxDiscountBoundaryRetries = 3

const user = computed(() => authStore.user)
const showPaymentShortcut = computed(() =>
  Boolean(user.value) && !authStore.isSimpleMode && isFeatureFlagEnabled(FeatureFlags.payment)
)
const docUrl = computed(() => sanitizeUrl(appStore.docUrl))
const modelPlazaEnabled = computed(() => isFeatureFlagEnabled(FeatureFlags.modelPlaza))

const pageTitle = computed(() => {
  // For custom pages, use the menu item's label instead of generic "自定义页面"
  if (route.name === 'CustomPage') {
    const id = route.params.id as string
    const publicItems = appStore.cachedPublicSettings?.custom_menu_items ?? []
    const menuItem = publicItems.find((item) => item.id === id)
      ?? (authStore.isAdmin ? adminSettingsStore.customMenuItems.find((item) => item.id === id) : undefined)
    if (menuItem?.label) return menuItem.label
  }
  const titleKey = route.meta.titleKey as string
  if (titleKey) {
    return t(titleKey)
  }
  return (route.meta.title as string) || ''
})

const pageDescription = computed(() => {
  const descKey = route.meta.descriptionKey as string
  if (descKey) {
    return t(descKey)
  }
  return (route.meta.description as string) || ''
})

const activeGlobalDiscount = computed(() => {
  const discount = appStore.cachedPublicSettings?.global_discount
  if (!discount?.active || !isDiscountRuntimeActiveNow(discount, nowMs.value)) return null
  return discount
})

const discountCampaignText = computed(() => {
  const discount = activeGlobalDiscount.value
  if (!discount) return ''
  const label = discount?.label
  return label?.trim() || t('usage.discountActive')
})

function toggleMobileSidebar() {
  appStore.toggleMobileSidebar()
}

function isDiscountRuntimeActiveNow(discount: GlobalDiscountRuntime, timestamp: number): boolean {
  if (!discount.enabled || !discount.active || discount.discount_rate <= 0 || discount.discount_rate >= 1) {
    return false
  }

  const start = discount.starts_at ? new Date(discount.starts_at).getTime() : Number.NaN
  const end = discount.ends_at ? new Date(discount.ends_at).getTime() : Number.NaN
  if (Number.isFinite(start) && timestamp < start) return false
  if (Number.isFinite(end) && timestamp >= end) return false
  return true
}

function clearDiscountBoundaryTimer() {
  if (discountBoundaryTimer) {
    clearTimeout(discountBoundaryTimer)
    discountBoundaryTimer = null
  }
}

function shouldRetryDiscountBoundaryRefresh(previousDiscount: GlobalDiscountRuntime, timestamp: number): boolean {
  const discount = appStore.cachedPublicSettings?.global_discount
  if (!discount) {
    const previousStart = previousDiscount.starts_at ? new Date(previousDiscount.starts_at).getTime() : Number.NaN
    const previousEnd = previousDiscount.ends_at ? new Date(previousDiscount.ends_at).getTime() : Number.NaN
    return Boolean(
      !previousDiscount.active
      && Number.isFinite(previousStart)
      && timestamp >= previousStart
      && (!Number.isFinite(previousEnd) || timestamp < previousEnd)
    )
  }

  const start = discount.starts_at ? new Date(discount.starts_at).getTime() : Number.NaN
  const end = discount.ends_at ? new Date(discount.ends_at).getTime() : Number.NaN
  const hasStarted = Number.isFinite(start) && timestamp >= start
  const hasEnded = Number.isFinite(end) && timestamp >= end
  if (!discount.active && hasStarted && (!Number.isFinite(end) || timestamp < end)) return true
  if (discount.active && hasEnded) return true
  return false
}

async function refreshDiscountSettingsWithRetry(discount: GlobalDiscountRuntime, attempt = 0) {
  if (!discountBoundaryRefreshMounted) return
  nowMs.value = Date.now()
  const settings = await appStore.fetchPublicSettings(true)
  if (!discountBoundaryRefreshMounted) return
  if (settings && !shouldRetryDiscountBoundaryRefresh(discount, nowMs.value)) return
  if (attempt >= maxDiscountBoundaryRetries) return

  discountBoundaryTimer = setTimeout(() => {
    void refreshDiscountSettingsWithRetry(discount, attempt + 1)
  }, discountBoundaryRetryDelayMs)
}

function scheduleDiscountBoundaryRefresh(discount?: GlobalDiscountRuntime | null) {
  clearDiscountBoundaryTimer()
  if (!discount) return

  const now = Date.now()
  const start = discount.starts_at ? new Date(discount.starts_at).getTime() : Number.NaN
  const end = discount.ends_at ? new Date(discount.ends_at).getTime() : Number.NaN
  const boundary = Number.isFinite(start) && start > now
    ? start
    : Number.isFinite(end) && end > now
      ? end
      : Number.NaN
  if (!Number.isFinite(boundary)) return
  const delay = Math.max(0, boundary - now + 1)
  discountBoundaryTimer = setTimeout(() => {
    void refreshDiscountSettingsWithRetry(discount)
  }, delay)
}


onMounted(() => {
  discountBoundaryRefreshMounted = true
  discountClockTimer = setInterval(() => {
    nowMs.value = Date.now()
  }, 60_000)
})

watch(
  () => appStore.cachedPublicSettings?.global_discount,
  (discount) => {
    scheduleDiscountBoundaryRefresh(discount)
  },
  { immediate: true }
)

onBeforeUnmount(() => {
  discountBoundaryRefreshMounted = false
  if (discountClockTimer) {
    clearInterval(discountClockTimer)
    discountClockTimer = null
  }
  clearDiscountBoundaryTimer()
})
</script>

<style scoped>
.header-recharge-link {
  position: relative;
  display: inline-flex;
  min-height: 2rem;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.25rem 0.125rem;
  background: linear-gradient(90deg, var(--theme-primary), var(--theme-primary-hover));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  font-size: 0.875rem;
  font-weight: 600;
}

.header-recharge-link :deep(svg) {
  color: var(--theme-primary);
}

.header-discount-campaign {
  position: absolute;
  left: 50%;
  top: 50%;
  display: none;
  max-width: min(34rem, calc(100% - 28rem));
  min-height: 2rem;
  transform: translate(-50%, -50%);
  align-items: center;
  gap: 0.375rem;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, #10b981 34%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, #10b981 13%, var(--theme-main-surface));
  color: #059669;
  padding: 0.25rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.25;
  pointer-events: none;
  white-space: nowrap;
}

.dark .header-discount-campaign {
  border-color: color-mix(in srgb, #34d399 38%, transparent);
  background: color-mix(in srgb, #10b981 16%, var(--theme-main-surface));
  color: #6ee7b7;
}

.header-discount-campaign span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: pre;
}

@media (min-width: 1024px) {
  .header-discount-campaign {
    display: inline-flex;
  }
}
</style>
