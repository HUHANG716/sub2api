<template>
  <header class="app-main-header sticky top-0 z-30">
    <div class="flex h-16 items-center justify-between px-4 md:px-6">
      <!-- Left: Mobile Menu Toggle + Page Title -->
      <div class="flex items-center gap-4">
        <button
          @click="toggleMobileSidebar"
          class="btn-ghost btn-icon lg:hidden"
          aria-label="Toggle Menu"
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

      <!-- Right: Quick actions + Announcements + Language + Theme + Subscriptions -->
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

          <router-link
            to="/docs"
            class="header-link"
            :title="t('nav.docs')"
          >
            <Icon name="book" size="sm" />
            <span class="hidden sm:inline">{{ t('nav.docs') }}</span>
          </router-link>
        </nav>

        <!-- Announcement Bell -->
        <AnnouncementBell v-if="user" />

        <!-- Language Switcher -->
        <LocaleSwitcher />

        <!-- Theme Switch -->
        <ThemeSwitch />

        <!-- Subscription Progress (for users with active subscriptions) -->
        <SubscriptionProgressMini v-if="user" />
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAppStore, useAuthStore } from '@/stores'
import { useAdminSettingsStore } from '@/stores/adminSettings'
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'
import SubscriptionProgressMini from '@/components/common/SubscriptionProgressMini.vue'
import AnnouncementBell from '@/components/common/AnnouncementBell.vue'
import ThemeSwitch from '@/components/common/ThemeSwitch.vue'
import Icon from '@/components/icons/Icon.vue'
import { FeatureFlags, isFeatureFlagEnabled } from '@/utils/featureFlags'

const route = useRoute()
const { t } = useI18n()
const appStore = useAppStore()
const authStore = useAuthStore()
const adminSettingsStore = useAdminSettingsStore()

const user = computed(() => authStore.user)
const showPaymentShortcut = computed(() =>
  Boolean(user.value) && !authStore.isSimpleMode && isFeatureFlagEnabled(FeatureFlags.payment)
)

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

function toggleMobileSidebar() {
  appStore.toggleMobileSidebar()
}
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.2s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: scale(0.95) translateY(-4px);
}

.header-link {
  display: inline-flex;
  min-height: 2rem;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.25rem 0.125rem;
  color: var(--theme-text-muted);
  font-size: 0.875rem;
  font-weight: 600;
}

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

@media (min-width: 640px) {
  .header-link {
    padding-left: 0.125rem;
    padding-right: 0.125rem;
  }
}
</style>
