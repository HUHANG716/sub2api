<template>
  <!-- Custom Home Content: Full Page Mode -->
  <div v-if="homeContent" class="min-h-screen">
    <!-- iframe mode -->
    <iframe
      v-if="isHomeContentUrl"
      :src="homeContent.trim()"
      class="h-screen w-full border-0"
      allowfullscreen
    ></iframe>
    <!-- HTML mode - SECURITY: homeContent is admin-only setting, XSS risk is acceptable -->
    <div v-else v-html="homeContent"></div>
  </div>

  <!-- Default Home Page -->
  <div
    v-else
    class="min-h-screen bg-[#f3f0e7] text-gray-900 dark:bg-[#171a21] dark:text-white"
  >
    <!-- Header -->
    <header
      class="sticky top-0 z-20 border-b border-black/10 bg-[#f3f0e7]/95 px-4 py-4 backdrop-blur-sm dark:border-dark-800 dark:bg-[#171a21]/95 sm:px-6"
    >
      <nav class="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <!-- Logo -->
        <router-link to="/home" class="flex min-w-0 items-center gap-3">
          <div class="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm dark:border-dark-700 dark:bg-[#20242c]">
            <img :src="siteLogo || '/logo.png'" alt="Logo" class="h-full w-full object-contain" />
          </div>
          <span class="min-w-0">
            <span class="block truncate text-sm font-semibold tracking-tight text-gray-900 dark:text-white">
              {{ siteName }}
            </span>
            <span class="hidden truncate text-xs text-gray-500 dark:text-gray-300 sm:block">
              {{ t('home.landing.navTagline') }}
            </span>
          </span>
        </router-link>

        <div class="hidden items-center gap-8 text-sm font-semibold md:flex">
          <router-link to="/home" class="text-primary-600 dark:text-primary-300">{{ t('home.landing.home') }}</router-link>
          <router-link to="/subscriptions" class="text-gray-900 transition-colors hover:text-primary-600 dark:text-white dark:hover:text-primary-300">
            {{ t('home.landing.pricing') }}
          </router-link>
        </div>

        <!-- Nav Actions -->
        <div class="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <!-- Language Switcher -->
          <LocaleSwitcher />

          <!-- Doc Link -->
          <a
            v-if="docUrl"
            :href="docUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-gray-500 transition-colors hover:border-gray-200 hover:bg-white hover:text-gray-900 dark:text-gray-300 dark:hover:border-dark-700 dark:hover:bg-[#20242c] dark:hover:text-white"
            :title="t('home.viewDocs')"
          >
            <Icon name="book" size="md" />
          </a>

          <!-- Theme Toggle -->
          <button
            @click="toggleTheme"
            class="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-gray-500 transition-colors hover:border-gray-200 hover:bg-white hover:text-gray-900 dark:text-gray-300 dark:hover:border-dark-700 dark:hover:bg-[#20242c] dark:hover:text-white"
            :title="isDark ? t('home.switchToLight') : t('home.switchToDark')"
          >
            <Icon v-if="isDark" name="sun" size="md" />
            <Icon v-else name="moon" size="md" />
          </button>

          <!-- Login / Dashboard Button -->
          <router-link
            v-if="isAuthenticated"
            :to="dashboardPath"
            class="inline-flex h-12 items-center gap-2 rounded-2xl bg-gray-950 px-4 text-sm font-semibold text-white shadow-lg shadow-black/10 transition-colors hover:bg-gray-800 dark:bg-primary-500 dark:text-white dark:hover:bg-primary-600"
          >
            <span
              class="flex h-5 w-5 items-center justify-center rounded bg-white/15 text-[10px] font-semibold text-white"
            >
              {{ userInitial }}
            </span>
            <span class="hidden sm:inline">{{ t('home.dashboard') }}</span>
          </router-link>
          <router-link
            v-else
            to="/login"
            class="inline-flex h-12 items-center rounded-2xl bg-gray-950 px-5 text-sm font-semibold text-white shadow-lg shadow-black/10 transition-colors hover:bg-gray-800 dark:bg-primary-500 dark:hover:bg-primary-600"
          >
            {{ t('home.login') }}
          </router-link>
        </div>
      </nav>
    </header>

    <!-- Main Content -->
    <main class="px-4 py-10 sm:px-6 sm:py-14 lg:py-12">
      <div class="mx-auto max-w-7xl">
        <!-- Hero -->
        <section class="grid min-h-[620px] gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:gap-14">
          <div>
            <div class="mb-6 flex flex-wrap items-center gap-3">
              <span
                v-for="badge in heroBadges"
                :key="badge"
                class="inline-flex rotate-[-2deg] items-center gap-2 rounded-lg bg-primary-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary-500/20"
              >
                <span class="h-2 w-2 rounded-sm bg-white/90"></span>
                {{ badge }}
              </span>
            </div>
            <h1 class="max-w-3xl border-b border-gray-900 pb-5 text-5xl font-black leading-[1.08] tracking-tight text-gray-950 dark:border-dark-700 dark:text-white sm:text-6xl lg:text-7xl">
              {{ t('home.landing.title') }}
            </h1>
            <p class="mt-6 max-w-2xl text-base leading-8 text-gray-600 dark:text-gray-200 sm:text-lg">
              <span class="block">{{ siteSubtitle }}</span>
              <span class="mt-2 block">
                {{ t('home.landing.description') }}
              </span>
            </p>

            <div class="mt-8 flex flex-col gap-3 sm:flex-row">
              <router-link
                :to="isAuthenticated ? dashboardPath : '/login'"
                class="inline-flex h-14 items-center justify-center gap-3 rounded-2xl bg-gray-950 px-7 text-base font-semibold text-white shadow-2xl shadow-black/10 transition-colors hover:bg-gray-800 dark:bg-primary-500 dark:hover:bg-primary-600"
              >
                {{ isAuthenticated ? t('home.goToDashboard') : t('home.getStarted') }}
                <Icon name="arrowRight" size="md" :stroke-width="2" />
              </router-link>
              <a
                v-if="docUrl"
                :href="docUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-black/10 bg-white px-6 text-base font-semibold text-gray-900 shadow-sm transition-colors hover:border-primary-300 dark:border-dark-700 dark:bg-[#20242c] dark:text-white dark:hover:border-dark-600 dark:hover:bg-dark-800"
              >
                {{ t('home.docs') }}
                <Icon name="book" size="sm" />
              </a>
            </div>

            <div class="mt-8 grid max-w-2xl gap-4 sm:grid-cols-3">
              <div
                v-for="stat in heroStats"
                :key="stat.label"
                class="rounded-xl border border-black/10 bg-white/90 p-5 shadow-sm dark:border-dark-800 dark:bg-[#20242c]"
              >
                <div class="text-3xl font-black text-gray-950 dark:text-white">{{ stat.value }}</div>
                <div class="mt-1 text-sm text-gray-600 dark:text-gray-300">{{ stat.label }}</div>
              </div>
            </div>
          </div>

          <!-- Brand Visual -->
          <aside class="relative min-h-[420px] overflow-hidden rounded-[2rem] border border-black/10 bg-[#ede9dd] p-8 shadow-2xl shadow-black/5 dark:border-dark-800 dark:bg-[#20242c]" :aria-label="siteName">
            <div class="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-primary-500/20 blur-3xl"></div>
            <div class="absolute bottom-8 left-8 right-8 top-8 rounded-[1.5rem] border border-black/10 dark:border-dark-800"></div>
            <div class="relative flex h-full min-h-[360px] flex-col items-center justify-center">
              <img
                :src="siteLogo || '/logo.png'"
                :alt="siteName"
                class="h-28 w-28 rounded-3xl bg-white object-contain p-3 shadow-xl shadow-black/10 dark:bg-white"
              />
              <div class="mt-8 text-center font-black uppercase leading-none tracking-tight text-gray-950 dark:text-white">
                <div class="max-w-full text-[clamp(3rem,7vw,6.25rem)]">{{ siteName }}</div>
              </div>
              <div class="mt-6 flex flex-wrap justify-center gap-2">
                <span
                  v-for="chip in previewChips"
                  :key="chip"
                  class="rounded-lg border border-black/10 bg-white/80 px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm dark:border-dark-700 dark:bg-[#151922] dark:text-gray-100"
                >
                  {{ chip }}
                </span>
              </div>
              <div class="mt-8 w-full max-w-md rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm dark:border-dark-800 dark:bg-[#151922]">
                <div class="flex items-center justify-between gap-3">
                  <span class="font-mono text-xs text-gray-500 dark:text-gray-300">sk_live_••••••••••••8F2A</span>
                  <span class="rounded-md bg-emerald-500/10 px-2 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                    {{ t('home.landing.preview.keyStatus') }}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </section>

        <!-- Compatibility Strip -->
        <section class="mt-4 rounded-2xl border border-black/10 bg-white/60 p-5 shadow-sm dark:border-dark-800 dark:bg-[#20242c]/80 sm:p-6">
          <h2 class="max-w-3xl text-2xl font-black tracking-tight text-gray-950 dark:text-white sm:text-3xl">
            {{ t('home.landing.compat.title') }}
          </h2>
          <div class="mt-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div class="flex flex-wrap items-center gap-2">
              <span class="mr-2 text-sm font-medium text-gray-500 dark:text-gray-300">{{ t('home.landing.compat.worksWith') }}</span>
              <span
                v-for="tool in toolBadges"
                :key="tool"
                class="rounded-xl border border-black/10 bg-[#f8f6ef] px-3 py-2 text-sm font-semibold text-gray-800 dark:border-dark-700 dark:bg-[#151922] dark:text-white"
              >
                {{ tool }}
              </span>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <span class="mr-2 text-sm font-medium text-gray-500 dark:text-gray-300">{{ t('home.landing.compat.platforms') }}</span>
              <span
                v-for="platform in platformBadges"
                :key="platform"
                class="rounded-xl border border-black/10 bg-[#f8f6ef] px-3 py-2 text-sm font-semibold text-gray-800 dark:border-dark-700 dark:bg-[#151922] dark:text-white"
              >
                {{ platform }}
              </span>
            </div>
          </div>
        </section>

        <!-- Feature Cards -->
        <section class="mt-14 grid gap-5 md:grid-cols-3">
          <article
            v-for="card in landingCards"
            :key="card.kicker"
            class="rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-dark-800 dark:bg-[#20242c]"
          >
            <p class="text-sm font-semibold text-primary-600 dark:text-primary-300">{{ card.kicker }}</p>
            <h3 class="mt-3 text-2xl font-black tracking-tight text-gray-950 dark:text-white">
              {{ card.title }}
            </h3>
            <p class="mt-4 text-sm leading-7 text-gray-600 dark:text-gray-200">
              {{ card.description }}
            </p>
          </article>
        </section>

        <!-- CTA -->
        <section class="mt-14 rounded-[2rem] border border-black/10 bg-gray-950 p-6 text-white shadow-2xl shadow-black/10 dark:border-dark-800 dark:bg-[#20242c] sm:p-8">
          <div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p class="text-sm font-semibold text-primary-300">{{ t('home.landing.cta.kicker') }}</p>
              <h2 class="mt-3 max-w-2xl text-3xl font-black tracking-tight sm:text-4xl">
                {{ t('home.landing.cta.title') }}
              </h2>
              <p class="mt-4 max-w-2xl text-sm leading-7 text-white/70 sm:text-base">
                {{ t('home.landing.cta.description') }}
              </p>
            </div>
            <router-link
              to="/subscriptions"
              class="inline-flex h-14 shrink-0 items-center justify-center rounded-2xl bg-white px-7 text-base font-semibold text-gray-950 transition-colors hover:bg-primary-50 dark:bg-primary-500 dark:text-white dark:hover:bg-primary-600"
            >
              {{ t('home.landing.cta.button') }}
            </router-link>
          </div>
        </section>
      </div>
    </main>

    <!-- Footer -->
    <footer class="border-t border-gray-200 px-4 py-10 dark:border-dark-800 sm:px-6">
      <div class="mx-auto max-w-7xl">
        <div class="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
          <div v-for="group in footerGroups" :key="group.title">
            <h2 class="text-sm font-semibold text-gray-950 dark:text-white">{{ group.title }}</h2>
            <div class="mt-4 space-y-3">
              <template v-for="item in group.items" :key="item.label">
                <router-link
                  v-if="isFooterRouteItem(item)"
                  :to="item.to"
                  class="block text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  {{ item.label }}
                </router-link>
                <a
                  v-else-if="isFooterLinkItem(item)"
                  :href="item.href"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="block text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
                >
                  {{ item.label }}
                </a>
                <span v-else class="block text-sm text-gray-500 dark:text-gray-300">
                  {{ item.label }}
                </span>
              </template>
            </div>
          </div>
        </div>
        <p class="mt-10 text-sm text-gray-500 dark:text-gray-300">
          &copy; {{ currentYear }} {{ siteName }}. {{ t('home.footer.allRightsReserved') }}
        </p>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore, useAppStore } from '@/stores'
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'
import Icon from '@/components/icons/Icon.vue'

const { t } = useI18n()

type FooterItem = {
  label: string
  to?: string
  href?: string
}

type FooterGroup = {
  title: string
  items: FooterItem[]
}

function isFooterRouteItem(item: FooterItem): item is FooterItem & { to: string } {
  return typeof item.to === 'string'
}

function isFooterLinkItem(item: FooterItem): item is FooterItem & { href: string } {
  return typeof item.href === 'string'
}

const authStore = useAuthStore()
const appStore = useAppStore()

// Site settings - directly from appStore (already initialized from injected config)
const siteName = computed(() => appStore.cachedPublicSettings?.site_name || appStore.siteName || 'Sub2API')
const siteLogo = computed(() => appStore.cachedPublicSettings?.site_logo || appStore.siteLogo || '')
const siteSubtitle = computed(() => appStore.cachedPublicSettings?.site_subtitle || t('home.landing.subtitle'))
const docUrl = computed(() => appStore.cachedPublicSettings?.doc_url || appStore.docUrl || '')
const homeContent = computed(() => appStore.cachedPublicSettings?.home_content || '')

// Check if homeContent is a URL (for iframe display)
const isHomeContentUrl = computed(() => {
  const content = homeContent.value.trim()
  return content.startsWith('http://') || content.startsWith('https://')
})

// Theme
const isDark = ref(document.documentElement.classList.contains('dark'))

// GitHub URL
const githubUrl = 'https://github.com/Wei-Shaw/sub2api'

// Auth state
const isAuthenticated = computed(() => authStore.isAuthenticated)
const isAdmin = computed(() => authStore.isAdmin)
const dashboardPath = computed(() => isAdmin.value ? '/admin/dashboard' : '/dashboard')
const userInitial = computed(() => {
  const user = authStore.user
  if (!user || !user.email) return ''
  return user.email.charAt(0).toUpperCase()
})

const heroStats = computed(() => [
  { value: '1', label: t('home.landing.stats.key') },
  { value: '4+', label: t('home.landing.stats.capabilities') },
  { value: '3', label: t('home.landing.stats.interface') }
])

const heroBadges = computed(() => [
  t('home.landing.badges.oneKey'),
  t('home.landing.badges.compatible')
])

const previewChips = computed(() => [
  t('home.landing.preview.chipChat'),
  t('home.landing.preview.chipCode'),
  t('home.landing.preview.chipDocs'),
  t('home.landing.preview.chipVision')
])

const toolBadges = computed(() => [
  'Claude Code',
  'Codex',
  'Gemini CLI',
  'OpenClaw'
])

const platformBadges = computed(() => [
  'macOS',
  'Windows',
  'Linux'
])

const landingCards = computed(() => [
  {
    kicker: t('home.landing.cards.dashboard.kicker'),
    title: t('home.landing.cards.dashboard.title'),
    description: t('home.landing.cards.dashboard.description')
  },
  {
    kicker: t('home.landing.cards.api.kicker'),
    title: t('home.landing.cards.api.title'),
    description: t('home.landing.cards.api.description')
  },
  {
    kicker: t('home.landing.cards.wallet.kicker'),
    title: t('home.landing.cards.wallet.title'),
    description: t('home.landing.cards.wallet.description')
  }
])

const footerGroups = computed<FooterGroup[]>(() => [
  {
    title: t('home.landing.footer.product.title'),
    items: [
      { label: t('home.landing.footer.product.pricing'), to: '/subscriptions' },
      { label: t('home.landing.footer.product.login'), to: '/login' },
      ...(docUrl.value ? [{ label: t('home.docs'), href: docUrl.value }] : [])
    ]
  },
  {
    title: t('home.landing.footer.models.title'),
    items: [
      { label: t('home.landing.footer.models.claude') },
      { label: t('home.landing.footer.models.gpt') },
      { label: t('home.landing.footer.models.gemini') }
    ]
  },
  {
    title: t('home.landing.footer.commitment.title'),
    items: [
      { label: t('home.landing.footer.commitment.pricing') },
      { label: t('home.landing.footer.commitment.privacy') },
      { label: t('home.landing.footer.commitment.security') }
    ]
  },
  {
    title: t('home.landing.footer.solutions.title'),
    items: [
      { label: t('home.landing.footer.solutions.coding') },
      { label: t('home.landing.footer.solutions.generation') },
      { label: t('home.landing.footer.solutions.support') }
    ]
  },
  {
    title: t('home.landing.footer.about.title'),
    items: [
      { label: t('home.landing.footer.about.contact') },
      { label: 'GitHub', href: githubUrl }
    ]
  }
])

// Current year for footer
const currentYear = computed(() => new Date().getFullYear())

// Toggle theme
function toggleTheme() {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

// Initialize theme
function initTheme() {
  const savedTheme = localStorage.getItem('theme')
  if (
    savedTheme === 'dark' ||
    (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)
  ) {
    isDark.value = true
    document.documentElement.classList.add('dark')
  }
}

onMounted(() => {
  initTheme()

  // Check auth state
  authStore.checkAuth()

  // Ensure public settings are loaded (will use cache if already loaded from injected config)
  if (!appStore.publicSettingsLoaded) {
    appStore.fetchPublicSettings()
  }
})
</script>
