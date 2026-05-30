<template>
  <div v-if="homeContent" class="min-h-screen">
    <iframe
      v-if="isHomeContentUrl"
      :src="homeContent.trim()"
      class="h-screen w-full border-0"
      allowfullscreen
    ></iframe>
    <div v-else v-html="homeContent"></div>
  </div>

  <div v-else class="landing-shell min-h-screen">
    <header class="landing-header" :class="{ 'landing-header-scrolled': isHeaderCompact }">
      <nav class="mx-auto flex items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8">
        <router-link to="/home" class="brand-lockup">
            <span class="brand-mark">
              <img :src="siteLogo || '/logo.png'" :alt="siteName" />
            </span>
            <span class="min-w-0">
              <span class="block truncate text-base font-semibold tracking-tight">{{ siteName }}</span>
            <span class="brand-tagline block truncate text-xs">{{ t('home.modern.navTagline') }}</span>
          </span>
        </router-link>

        <div class="landing-nav-links hidden items-center gap-8 text-sm font-medium md:flex">
          <a href="#features" class="transition">{{ t('home.modern.nav.features') }}</a>
          <a href="#testimonials" class="transition">{{ t('home.modern.nav.testimonials') }}</a>
          <a href="#faq" class="transition">{{ t('home.modern.nav.faq') }}</a>
          <a href="#contact" class="transition">{{ t('home.modern.nav.contact') }}</a>
        </div>

        <div class="landing-header-actions flex items-center gap-2">
          <LocaleSwitcher icon-only />
          <router-link
            to="/docs"
            class="landing-docs-action"
            :title="t('home.viewDocs')"
          >
            <Icon name="book" size="sm" />
            <span>{{ t('home.viewDocs') }}</span>
          </router-link>
          <router-link
            :to="isAuthenticated ? dashboardPath : '/login'"
            class="primary-action"
          >
            {{ isAuthenticated ? t('home.dashboard') : t('home.login') }}
          </router-link>
        </div>
      </nav>
    </header>

    <main>
      <section
        class="hero-section px-5 sm:px-6 lg:px-8"
        @mousemove="handleHeroPointerMove"
        @mouseleave="resetHeroPointer"
      >
        <div class="landing-container hero-stage" :style="heroStageStyle">
          <div class="hero-floating-tags" aria-hidden="true">
            <div
              v-for="(tool, index) in heroFloatingTags"
              :key="tool.name"
              class="floating-tool-tag"
              :class="[`floating-tool-tag-${index + 1}`, `floating-tool-tag-${tool.shape}`]"
            >
              <span v-if="tool.icon" class="floating-tool-icon" :class="{ 'floating-tool-icon-backed': tool.needsBadge }">
                <img :src="tool.icon" :alt="tool.name" />
              </span>
              <span class="floating-tool-name">{{ tool.name }}</span>
            </div>
          </div>

          <div class="hero-copy hero-copy-centered">
            <h1>
              <span class="hero-brand-title">{{ siteName }}</span>
              <span>{{ t('home.modern.hero.line1') }}</span>
              <span>{{ t('home.modern.hero.line2') }}</span>
            </h1>
            <p class="hero-lede">
              {{ siteSubtitle }}
              <span>{{ t('home.modern.hero.description') }}</span>
            </p>

            <div class="hero-actions">
              <router-link :to="isAuthenticated ? dashboardPath : '/login'" class="hero-button">
                <span>{{ isAuthenticated ? t('home.goToDashboard') : t('home.getStarted') }}</span>
                <Icon name="arrowRight" size="sm" />
              </router-link>
              <router-link to="/docs" class="hero-button secondary">
                <span>{{ t('home.viewDocs') }}</span>
                <Icon name="book" size="sm" />
              </router-link>
            </div>
          </div>
        </div>
      </section>

      <section class="trust-band px-5 py-8 sm:px-6 lg:px-8">
        <div class="landing-container trust-strip">
          <div v-for="stat in trustStats" :key="stat.label" class="trust-card">
            <strong>{{ stat.value }}</strong>
            <span>{{ stat.label }}</span>
          </div>
        </div>
      </section>

      <section id="features" class="support-showcase px-5 py-12 sm:px-6 lg:px-8">
        <div class="landing-container support-showcase-panel">
          <h2 class="support-showcase-title">
            <span>{{ t('home.modern.supportShowcase.titlePrefix') }}</span>
            <strong>{{ t('home.modern.supportShowcase.titleCore') }}</strong>
            <em>{{ t('home.modern.supportShowcase.titleAccent') }}</em>
          </h2>

          <div class="support-provider-row">
            <p>{{ t('home.modern.supportShowcase.supports') }}</p>
            <div
              v-for="provider in supportProviders"
              :key="provider.name"
              class="support-provider-chip"
            >
              <span class="support-icon-frame" :class="{ 'support-icon-frame-backed': provider.needsBadge }">
                <img :src="provider.icon" :alt="provider.name" />
              </span>
              <span>{{ provider.name }}</span>
            </div>
          </div>

          <div class="support-platform-row">
            <p>{{ t('home.modern.supportShowcase.platformIntro') }}</p>
            <div
              v-for="platform in supportPlatforms"
              :key="platform.name"
              class="support-platform-chip"
            >
              <span class="support-icon-frame support-icon-frame-backed">
                <img :src="platform.icon" :alt="platform.name" />
              </span>
              <span>{{ platform.name }}</span>
            </div>
          </div>
        </div>
      </section>

      <section id="testimonials" class="testimonial-section px-5 py-20 sm:px-6 lg:px-8">
        <div class="landing-container">
          <div class="section-heading centered">
            <p>{{ t('home.modern.testimonials.eyebrow') }}</p>
            <h2>{{ t('home.modern.testimonials.title') }}</h2>
            <span>{{ t('home.modern.testimonials.description') }}</span>
          </div>

          <div class="testimonial-marquee" :aria-label="t('home.modern.testimonials.listLabel')">
            <div class="testimonial-track">
              <article v-for="review in testimonials" :key="review.name" class="testimonial-card">
                <p>{{ review.quote }}</p>
                <div class="reviewer">
                  <span
                    class="avatar-photo"
                    :style="avatarStyle(review.avatarPosition)"
                    role="img"
                    :aria-label="`${review.name} avatar`"
                  ></span>
                  <span>
                    <strong>{{ review.name }}</strong>
                    <em>{{ review.role }}</em>
                  </span>
                </div>
              </article>
              <article
                v-for="review in testimonials"
                :key="`duplicate-${review.name}`"
                class="testimonial-card"
                aria-hidden="true"
              >
                <p>{{ review.quote }}</p>
                <div class="reviewer">
                  <span class="avatar-photo" :style="avatarStyle(review.avatarPosition)"></span>
                  <span>
                    <strong>{{ review.name }}</strong>
                    <em>{{ review.role }}</em>
                  </span>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>

      <section id="faq" class="section-pad px-5 sm:px-6 lg:px-8">
        <div class="landing-container grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
          <div class="section-heading sticky-heading">
            <p>FAQ</p>
            <h2>{{ t('home.modern.faq.title') }}</h2>
            <span>{{ t('home.modern.faq.description') }}</span>
          </div>
          <div class="faq-list">
            <article v-for="item in faqItems" :key="item.question" class="faq-item">
              <h3>{{ item.question }}</h3>
              <p>{{ item.answer }}</p>
            </article>
          </div>
        </div>
      </section>
    </main>

    <footer id="contact" class="landing-footer px-5 py-12 sm:px-6 lg:px-8">
      <div class="landing-container">
        <div class="footer-top">
          <div>
            <div class="brand-lockup">
              <span class="brand-mark">
                <img :src="siteLogo || '/logo.png'" :alt="siteName" />
              </span>
              <span>
                <span class="block text-base font-semibold">{{ siteName }}</span>
                <span class="brand-tagline block text-xs">{{ t('home.modern.footer.tagline') }}</span>
              </span>
            </div>
            <p class="footer-description mt-5 max-w-md text-sm leading-7">
              {{ t('home.modern.footer.description') }}
            </p>
          </div>

          <div class="footer-links">
            <div v-for="group in footerGroups" :key="group.title">
              <h3>{{ group.title }}</h3>
              <template v-for="item in group.items" :key="item.label">
                <router-link v-if="isFooterRouteItem(item)" :to="item.to">{{ item.label }}</router-link>
                <a v-else-if="isFooterLinkItem(item)" :href="item.href" target="_blank" rel="noopener noreferrer">
                  {{ item.label }}
                </a>
                <span v-else>{{ item.label }}</span>
              </template>
            </div>
          </div>
        </div>

        <div class="footer-bottom">
          <span>&copy; {{ currentYear }} {{ siteName }}. {{ t('home.footer.allRightsReserved') }}</span>
          <span>{{ t('home.modern.footer.operator') }}</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore, useAuthStore } from '@/stores'
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

const siteName = computed(() => appStore.cachedPublicSettings?.site_name || appStore.siteName || 'Hahacode')
const siteLogo = computed(() => appStore.cachedPublicSettings?.site_logo || appStore.siteLogo || '')
const siteSubtitle = computed(() => appStore.cachedPublicSettings?.site_subtitle || t('home.modern.hero.subtitle'))
const homeContent = computed(() => appStore.cachedPublicSettings?.home_content || '')

const isHomeContentUrl = computed(() => {
  const content = homeContent.value.trim()
  return content.startsWith('http://') || content.startsWith('https://')
})

const isAuthenticated = computed(() => authStore.isAuthenticated)
const isAdmin = computed(() => authStore.isAdmin)
const dashboardPath = computed(() => (isAdmin.value ? '/admin/dashboard' : '/dashboard'))
const currentYear = computed(() => new Date().getFullYear())
const isHeaderCompact = ref(false)
const heroPointer = ref({ x: 0, y: 0 })

const trustStats = computed(() => [
  { value: '10,000+', label: t('home.modern.stats.developers') },
  { value: '99.9%', label: t('home.modern.stats.uptime') },
  { value: t('home.modern.stats.taskValue'), label: t('home.modern.stats.tasks') },
  { value: '1v1', label: t('home.modern.stats.support') }
])

const testimonialAvatarSprite = '/testimonial-avatar-sprite.png'
const supportAssetBase = '/landing-support'
const supportProviders = [
  { name: 'Claude Code', icon: `${supportAssetBase}/claude-code.svg`, needsBadge: false },
  { name: 'Codex', icon: `${supportAssetBase}/codex.svg`, needsBadge: false },
  { name: 'Gemini CLI', icon: `${supportAssetBase}/gemini-cli.svg`, needsBadge: false },
  { name: 'OpenClaw', icon: `${supportAssetBase}/openclaw.svg`, needsBadge: false },
  { name: 'Hermes Agent', icon: `${supportAssetBase}/hermes-agent.svg`, needsBadge: true }
] as const
const heroFloatingTags = [
  { ...supportProviders[0], shape: 'round' },
  { ...supportProviders[1], shape: 'round' },
  { ...supportProviders[2], shape: 'round' },
  { name: 'OpenAI', icon: '', needsBadge: false, shape: 'text' },
  { ...supportProviders[3], shape: 'round' },
  { ...supportProviders[4], shape: 'round' },
  { name: 'Codex App', icon: `${supportAssetBase}/codex-app.png`, needsBadge: false, shape: 'round' }
] as const
const supportPlatforms = [
  { name: 'macOS', icon: `${supportAssetBase}/macos.svg` },
  { name: 'Windows', icon: `${supportAssetBase}/windows.svg` },
  { name: 'Linux', icon: `${supportAssetBase}/linux.svg` }
] as const

const testimonials = computed(() => [
  {
    quote: t('home.modern.reviews.one.quote'),
    name: t('home.modern.reviews.one.name'),
    avatarPosition: '0% 0%',
    role: t('home.modern.reviews.one.role')
  },
  {
    quote: t('home.modern.reviews.two.quote'),
    name: t('home.modern.reviews.two.name'),
    avatarPosition: '33.333% 0%',
    role: t('home.modern.reviews.two.role')
  },
  {
    quote: t('home.modern.reviews.three.quote'),
    name: t('home.modern.reviews.three.name'),
    avatarPosition: '66.666% 0%',
    role: t('home.modern.reviews.three.role')
  },
  {
    quote: t('home.modern.reviews.four.quote'),
    name: t('home.modern.reviews.four.name'),
    avatarPosition: '100% 0%',
    role: t('home.modern.reviews.four.role')
  },
  {
    quote: t('home.modern.reviews.five.quote'),
    name: t('home.modern.reviews.five.name'),
    avatarPosition: '0% 100%',
    role: t('home.modern.reviews.five.role')
  },
  {
    quote: t('home.modern.reviews.six.quote'),
    name: t('home.modern.reviews.six.name'),
    avatarPosition: '33.333% 100%',
    role: t('home.modern.reviews.six.role')
  },
  {
    quote: t('home.modern.reviews.seven.quote'),
    name: t('home.modern.reviews.seven.name'),
    avatarPosition: '66.666% 100%',
    role: t('home.modern.reviews.seven.role')
  },
  {
    quote: t('home.modern.reviews.eight.quote'),
    name: t('home.modern.reviews.eight.name'),
    avatarPosition: '100% 100%',
    role: t('home.modern.reviews.eight.role')
  }
])

const faqItems = computed(() => [
  {
    question: t('home.modern.faq.items.fit.question', { siteName: siteName.value }),
    answer: t('home.modern.faq.items.fit.answer')
  },
  {
    question: t('home.modern.faq.items.individual.question'),
    answer: t('home.modern.faq.items.individual.answer')
  },
  {
    question: t('home.modern.faq.items.stability.question'),
    answer: t('home.modern.faq.items.stability.answer')
  },
  {
    question: t('home.modern.faq.items.start.question'),
    answer: t('home.modern.faq.items.start.answer')
  }
])

const footerGroups = computed<FooterGroup[]>(() => [
  {
    title: t('home.modern.footer.groups.product'),
    items: [
      { label: t('home.modern.nav.features'), href: '#features' },
      { label: t('home.modern.nav.testimonials'), href: '#testimonials' },
      { label: t('home.docs'), to: '/docs' }
    ]
  },
  {
    title: t('home.modern.footer.groups.support'),
    items: [
      { label: t('home.modern.nav.faq'), href: '#faq' },
      { label: t('home.modern.footer.loginWorkspace'), to: '/login' },
      { label: t('home.modern.nav.contact'), href: '#contact' }
    ]
  },
  {
    title: t('home.modern.footer.groups.scenes'),
    items: [
      { label: t('home.modern.footer.scenes.coding') },
      { label: t('home.modern.footer.scenes.usage') },
      { label: t('home.modern.footer.scenes.tools') }
    ]
  },
  {
    title: t('home.modern.footer.groups.legal'),
    items: [
      { label: t('home.modern.footer.legal.privacy'), to: '/legal/privacy' },
      { label: t('home.modern.footer.legal.terms'), to: '/legal/terms' },
      { label: t('home.modern.footer.legal.refund'), to: '/legal/refund' }
    ]
  }
])

const heroStageStyle = computed(() => ({
  '--hero-pointer-x': heroPointer.value.x.toFixed(3),
  '--hero-pointer-y': heroPointer.value.y.toFixed(3)
}))

function avatarStyle(backgroundPosition: string) {
  return {
    backgroundImage: `url(${testimonialAvatarSprite})`,
    backgroundPosition
  }
}

function syncHeaderScrollState() {
  isHeaderCompact.value = window.scrollY > 18
}

function handleHeroPointerMove(event: MouseEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2
  const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2

  heroPointer.value = {
    x: Math.max(-1, Math.min(1, x)),
    y: Math.max(-1, Math.min(1, y))
  }
}

function resetHeroPointer() {
  heroPointer.value = { x: 0, y: 0 }
}

onMounted(() => {
  authStore.checkAuth()

  if (!appStore.publicSettingsLoaded) {
    appStore.fetchPublicSettings()
  }

  syncHeaderScrollState()
  window.addEventListener('scroll', syncHeaderScrollState, { passive: true })
})

watchEffect(() => {
  const useLandingCanvas = !homeContent.value
  document.documentElement.classList.toggle('landing-page-active', useLandingCanvas)
  document.body.classList.toggle('landing-page-active', useLandingCanvas)
})

onUnmounted(() => {
  window.removeEventListener('scroll', syncHeaderScrollState)
  document.documentElement.classList.remove('landing-page-active')
  document.body.classList.remove('landing-page-active')
})
</script>

<style scoped>
@font-face {
  font-family: 'Hahacode Landing SC';
  font-style: normal;
  font-display: optional;
  font-weight: 400 900;
  src: url('/fonts/hahacode-landing-sc.woff2') format('woff2-variations');
}

:global(html.landing-page-active),
:global(body.landing-page-active) {
  --theme-bg: #171717;
  --theme-bg-soft: #1c1c1c;
  --theme-bg-deep: #0f0f0f;
  --theme-surface: rgba(31, 31, 31, 0.94);
  --theme-surface-strong: #242424;
  --theme-surface-muted: rgba(38, 38, 38, 0.84);
  --theme-main-surface: #171717;
  --theme-border: rgba(255, 255, 255, 0.08);
  --theme-border-strong: rgba(255, 255, 255, 0.14);
  --theme-text: #f8fafc;
  --theme-text-soft: #dfe6ef;
  --theme-text-muted: #c4cfdc;
  --theme-text-subtle: #aeb9c8;
  --theme-primary: #d97732;
  --theme-primary-hover: #ef9a5c;
  --theme-primary-soft: rgba(217, 119, 50, 0.14);
  --theme-accent: #d97732;
  --theme-accent-soft: rgba(217, 119, 50, 0.12);
  --theme-shadow: 0 1px 0 rgba(255, 255, 255, 0.035);
  --theme-shadow-hover: 0 10px 30px rgba(0, 0, 0, 0.22);
  --theme-scrollbar-track: #171717;
  --theme-scrollbar-thumb: rgba(148, 163, 184, 0.34);
  --theme-scrollbar-thumb-hover: rgba(148, 163, 184, 0.56);
  color-scheme: dark;
  background: #171717;
}

:global(.landing-page-active ::selection) {
  background: var(--landing-accent-selection, rgba(217, 119, 50, 0.28));
  color: var(--landing-text-inverse, #ffffff);
}

:global(html.landing-page-active),
:global(body.landing-page-active) {
  overflow-x: clip;
  overscroll-behavior-x: none;
}

:global(html.landing-page-active #app) {
  min-height: 100vh;
  background: #171717;
}

.landing-shell {
  --landing-bg: #171717;
  --landing-bg-soft: #1c1c1c;
  --landing-surface: #242424;
  --landing-surface-raised: #292929;
  --landing-surface-muted: #262626;
  --landing-surface-subtle: rgba(38, 38, 38, 0.84);
  --landing-surface-soft: rgba(255, 255, 255, 0.035);
  --landing-border: rgba(255, 255, 255, 0.08);
  --landing-border-strong: rgba(255, 255, 255, 0.14);
  --landing-hairline: rgba(255, 255, 255, 0.055);
  --landing-text: #f8fafc;
  --landing-text-strong: #ffffff;
  --landing-text-soft: #e2e8f0;
  --landing-muted: #c4cfdc;
  --landing-subtle: #aeb9c8;
  --landing-dim: #8fa0b3;
  --landing-accent: #d97732;
  --landing-accent-hover: #ef9a5c;
  --landing-accent-soft: #f8cfad;
  --landing-accent-tint: rgba(217, 119, 50, 0.18);
  --landing-accent-border: rgba(217, 119, 50, 0.36);
  --landing-accent-selection: rgba(217, 119, 50, 0.28);
  --landing-support: #d97732;
  --landing-support-soft: rgba(217, 119, 50, 0.12);
  --landing-sticker-bg: color-mix(in srgb, var(--landing-accent-soft) 18%, var(--landing-text-strong));
  --landing-sticker-border: color-mix(in srgb, var(--landing-text-strong) 84%, var(--landing-accent-soft));
  --landing-control-radius: 0.375rem;
  --landing-nav-control-height: 2.25rem;
  --landing-nav-control-radius: 0.375rem;
  --landing-control-border: rgba(148, 163, 184, 0.18);
  --landing-control-shadow: 0 1px 0 rgba(255, 255, 255, 0.055) inset, 0 8px 18px rgba(2, 6, 23, 0.16);
  --landing-control-shadow-hover: 0 1px 0 rgba(255, 255, 255, 0.075) inset, 0 10px 22px rgba(2, 6, 23, 0.22);
  --landing-button-bg: var(--landing-accent);
  --landing-button-bg-hover: var(--landing-accent-hover);
  --landing-text-inverse: #ffffff;
  --theme-bg: #171717;
  --theme-bg-soft: #1c1c1c;
  --theme-bg-deep: #0f0f0f;
  --theme-surface: rgba(31, 31, 31, 0.94);
  --theme-surface-strong: #242424;
  --theme-surface-muted: rgba(38, 38, 38, 0.84);
  --theme-main-surface: #171717;
  --theme-border: rgba(255, 255, 255, 0.08);
  --theme-border-strong: rgba(255, 255, 255, 0.14);
  --theme-text: #f8fafc;
  --theme-text-soft: #dfe6ef;
  --theme-text-muted: #c4cfdc;
  --theme-text-subtle: #aeb9c8;
  --theme-primary: #d97732;
  --theme-primary-hover: #ef9a5c;
  --theme-primary-soft: rgba(217, 119, 50, 0.14);
  --theme-accent: #d97732;
  --theme-accent-soft: rgba(217, 119, 50, 0.12);
  --theme-shadow: 0 1px 0 rgba(255, 255, 255, 0.035);
  --theme-shadow-hover: 0 10px 30px rgba(0, 0, 0, 0.22);
  color-scheme: dark;
  width: 100%;
  max-width: 100vw;
  overflow-x: clip;
  font-family:
    'Hahacode Landing SC',
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    'PingFang SC',
    'Hiragino Sans GB',
    'Microsoft YaHei',
    sans-serif;
  color: var(--landing-text);
  background: var(--landing-bg);
}

.landing-shell *,
.landing-shell *::before,
.landing-shell *::after {
  box-sizing: border-box;
}

.landing-container {
  width: min(100%, 78rem);
  margin: 0 auto;
}

.landing-shell :deep(.locale-switcher) {
  --locale-text: #e2e8f0;
  --locale-text-strong: var(--landing-text-strong);
  --locale-code-bg: rgba(148, 163, 184, 0.14);
  --locale-hover-bg: var(--theme-surface-muted);
  --locale-active-bg: var(--landing-accent-tint);
  --locale-active-text: var(--landing-text-strong);
}

.landing-shell :deep(.locale-trigger) {
  height: var(--landing-nav-control-height);
  width: var(--landing-nav-control-height);
  min-height: var(--landing-nav-control-height);
  min-width: var(--landing-nav-control-height);
  gap: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  padding: 0;
  box-shadow: none;
}

.landing-shell :deep(.locale-trigger-value),
.landing-shell :deep(.locale-chevron) {
  display: none;
}

.landing-shell :deep(.locale-trigger-icon) {
  display: grid;
  place-items: center;
  height: 1rem;
  width: 1rem;
  color: var(--landing-text-soft);
}

.landing-header {
  --landing-header-width: 100%;
  position: sticky;
  top: 0;
  z-index: 30;
  max-width: 100vw;
  overflow-x: clip;
  padding-top: 0;
  transition: padding 180ms ease;
}

.landing-header nav {
  width: var(--landing-header-width);
  min-width: 0;
  border: 1px solid var(--theme-border);
  border-right: 0;
  border-left: 0;
  border-radius: 0;
  background: var(--theme-surface);
  backdrop-filter: blur(18px);
  padding-top: 0.625rem;
  padding-bottom: 0.625rem;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.05) inset,
    0 10px 26px rgba(2, 6, 23, 0.22);
  transition:
    padding 180ms ease,
    width 240ms cubic-bezier(0.22, 1, 0.36, 1),
    border-color 180ms ease,
    border-radius 180ms ease,
    background-color 180ms ease,
    box-shadow 180ms ease;
}

.brand-mark {
  transition:
    padding 180ms ease,
    height 180ms ease,
    width 180ms ease;
}

.landing-header-scrolled {
  --landing-header-width: min(72rem, calc(100vw - 1.5rem));
  pointer-events: none;
  padding-top: 0.5rem;
}

.landing-header-scrolled nav {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  border-color: var(--theme-border-strong);
  border-right: 0;
  border-left: 0;
  border-radius: 0.9rem;
  background: var(--theme-surface-strong);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.06) inset,
    0 12px 28px rgba(2, 6, 23, 0.28);
  pointer-events: auto;
}

.brand-lockup {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.75rem;
  color: var(--landing-text);
}

.landing-header .brand-lockup {
  flex: 1 1 auto;
  max-width: min(20rem, 48vw);
}

.landing-header-actions {
  min-width: 0;
  flex: 0 0 auto;
}

.brand-tagline {
  color: var(--landing-subtle);
}

.brand-mark {
  display: inline-flex;
  height: 2.4rem;
  width: 2.4rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.brand-mark img {
  height: 100%;
  width: 100%;
  object-fit: contain;
}

.landing-header-scrolled .brand-mark {
  height: 2.2rem;
  width: 2.2rem;
}

.landing-nav-links {
  color: var(--landing-text-soft);
}

.landing-nav-links a:hover {
  color: var(--landing-text-strong);
}

.icon-action,
.landing-docs-action,
.primary-action,
.hero-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  border-radius: var(--landing-control-radius);
  box-shadow: var(--landing-control-shadow);
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background 160ms ease,
    box-shadow 160ms ease,
    color 160ms ease;
}

.icon-action:focus-visible,
.landing-docs-action:focus-visible,
.primary-action:focus-visible,
.hero-button:focus-visible {
  outline: none;
  border-color: color-mix(in srgb, var(--landing-support) 60%, transparent);
  box-shadow:
    0 0 0 3px color-mix(in srgb, var(--landing-support) 18%, transparent),
    var(--landing-control-shadow-hover);
}

.icon-action {
  height: var(--landing-nav-control-height);
  width: var(--landing-nav-control-height);
  border-radius: var(--landing-nav-control-radius);
  border: 1px solid var(--landing-control-border);
  color: var(--landing-muted);
  background: var(--theme-surface-muted);
}

.landing-docs-action {
  min-height: var(--landing-nav-control-height);
  max-width: 7.5rem;
  gap: 0.38rem;
  border: 1px solid var(--landing-control-border);
  border-radius: var(--landing-nav-control-radius);
  background: transparent;
  padding: 0 0.62rem;
  color: var(--landing-text-soft);
  font-size: 0.8125rem;
  font-weight: 760;
  line-height: 1;
  white-space: nowrap;
}

.landing-docs-action span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.landing-docs-action :deep(svg) {
  display: block;
  flex: 0 0 auto;
}

.landing-docs-action:hover {
  border-color: color-mix(in srgb, var(--landing-support) 42%, transparent);
  color: var(--landing-support);
  background: var(--theme-surface-muted);
  box-shadow: var(--landing-control-shadow-hover);
}

.icon-action:hover {
  border-color: color-mix(in srgb, var(--landing-support) 42%, transparent);
  color: var(--landing-support);
  background: var(--theme-surface-strong);
  box-shadow: var(--landing-control-shadow-hover);
}

.icon-action:hover,
.landing-docs-action:hover,
.primary-action:hover,
.hero-button:hover {
  transform: translateY(-1px);
}

.primary-action {
  min-height: var(--landing-nav-control-height);
  min-width: 0;
  border-radius: var(--landing-nav-control-radius);
  border: 1px solid var(--landing-accent-border);
  background: var(--landing-button-bg);
  padding: 0 0.78rem;
  color: var(--landing-text-inverse);
  font-size: 0.8125rem;
  font-weight: 760;
  line-height: 1;
  text-align: center;
  white-space: nowrap;
}

.primary-action:hover {
  border-color: color-mix(in srgb, var(--landing-accent-hover) 58%, transparent);
  background: var(--landing-button-bg-hover);
  box-shadow: var(--landing-control-shadow-hover);
}

.hero-section {
  position: relative;
  isolation: isolate;
  max-width: 100vw;
  min-height: 100svh;
  display: grid;
  place-items: center;
  overflow-x: clip;
  background: var(--landing-bg);
  padding-top: clamp(5rem, 7vw, 6.25rem);
  padding-bottom: clamp(2rem, 4vw, 3.25rem);
}

.hero-section > div {
  min-width: 0;
}

.hero-section::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: rgba(18, 21, 27, 0.16);
  opacity: 0;
  pointer-events: none;
}

.hero-stage {
  position: relative;
  --hero-pointer-x: 0;
  --hero-pointer-y: 0;
  --hero-copy-safe-width: clamp(46rem, 58vw, 62rem);
  --hero-copy-safe-left: calc((100% - var(--hero-copy-safe-width)) / 2);
  --hero-copy-safe-right: calc(var(--hero-copy-safe-left) + var(--hero-copy-safe-width));
  --hero-copy-safe-gap: clamp(3.5rem, 6vw, 5rem);
  width: min(100%, calc(100vw - 2rem));
  max-width: none;
  min-height: calc(100svh - 5.5rem);
  display: grid;
  place-items: center;
  overflow: visible;
}

.hero-floating-tags {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  perspective: 58rem;
  transform-style: preserve-3d;
}

.floating-tool-tag {
  position: absolute;
  --hero-tag-size: 5rem;
  --hero-tag-depth: 0px;
  --hero-tag-drift-x: 14px;
  --hero-tag-drift-y: 12px;
  --hero-tag-rotation: 0deg;
  display: inline-flex;
  width: var(--hero-tag-size);
  height: var(--hero-tag-size);
  aspect-ratio: 1;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.38rem;
  border: clamp(0.32rem, 0.8vw, 0.56rem) solid var(--landing-sticker-border);
  border-radius: 999px;
  background: var(--landing-sticker-bg);
  padding: 0;
  color: var(--landing-bg);
  font-size: clamp(0.62rem, 0.76vw, 0.78rem);
  font-weight: 800;
  line-height: 1.05;
  text-align: center;
  isolation: isolate;
  overflow: hidden;
  box-shadow:
    calc(var(--hero-pointer-x) * -10px) calc(18px + var(--hero-pointer-y) * -8px) 28px rgba(217, 119, 50, 0.22),
    0 2px 0 color-mix(in srgb, var(--landing-text-strong) 76%, transparent) inset;
  filter: drop-shadow(0 0.48rem 0.46rem rgba(217, 119, 50, 0.16));
  transform: translate3d(
      calc(var(--hero-pointer-x) * var(--hero-tag-drift-x)),
      calc(var(--hero-pointer-y) * var(--hero-tag-drift-y)),
      var(--hero-tag-depth)
    )
    rotate(var(--hero-tag-rotation));
  animation: hero-tag-float 7.5s ease-in-out infinite;
  animation-delay: var(--hero-tag-delay, 0ms);
  transition:
    box-shadow 180ms ease,
    transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
  will-change: box-shadow, transform, translate;
}

.floating-tool-tag::before {
  content: none;
}

.floating-tool-tag-round {
  border-radius: 999px;
}

.floating-tool-tag-pill,
.floating-tool-tag-text {
  width: var(--hero-tag-size);
  height: var(--hero-tag-size);
  min-width: 0;
  aspect-ratio: 1;
  border-radius: 999px;
  padding: 0;
  gap: 0.42rem;
  background: var(--landing-sticker-bg);
  color: var(--landing-bg);
  font-size: clamp(1.35rem, 2vw, 1.9rem);
  font-weight: 900;
  letter-spacing: 0;
}

.floating-tool-tag-text {
  width: auto;
  height: auto;
  min-width: clamp(8rem, 12vw, 11rem);
  min-height: clamp(3.25rem, 5vw, 4.25rem);
  aspect-ratio: auto;
  border-radius: 999px;
  padding: 0 clamp(1.25rem, 2vw, 1.85rem);
  font-size: clamp(1.2rem, 2vw, 1.8rem);
}

.floating-tool-tag-pill .floating-tool-icon,
.floating-tool-tag-text .floating-tool-icon {
  display: none;
}

.floating-tool-tag-pill .floating-tool-name,
.floating-tool-tag-text .floating-tool-name {
  display: block;
  max-width: none;
  white-space: nowrap;
}

.floating-tool-tag-1 {
  right: calc(100% - var(--hero-copy-safe-left) + var(--hero-copy-safe-gap));
  top: clamp(4.75rem, 13vh, 8.5rem);
  --hero-tag-size: clamp(5rem, 7.2vw, 7rem);
  --hero-tag-depth: 56px;
  --hero-tag-drift-x: 20px;
  --hero-tag-drift-y: 16px;
  --hero-tag-rotation: -9deg;
  --hero-tag-delay: -900ms;
}

.floating-tool-tag-2 {
  left: clamp(-1.1rem, -0.6vw, -0.5rem);
  top: clamp(10.5rem, 28vh, 19rem);
  --hero-tag-size: clamp(11rem, 16vw, 18.5rem);
  --hero-tag-depth: 74px;
  --hero-tag-drift-x: 9px;
  --hero-tag-drift-y: 7px;
  --hero-tag-rotation: -3deg;
  --hero-tag-delay: -2100ms;
}

.floating-tool-tag-3 {
  right: clamp(0.75rem, 3vw, 5rem);
  top: clamp(14rem, 32vh, 21rem);
  --hero-tag-size: clamp(6rem, 8.8vw, 9rem);
  --hero-tag-depth: 52px;
  --hero-tag-drift-x: 24px;
  --hero-tag-drift-y: 18px;
  --hero-tag-rotation: 4deg;
  --hero-tag-delay: -3400ms;
}

.floating-tool-tag-4 {
  left: calc(var(--hero-copy-safe-right) + var(--hero-copy-safe-gap));
  bottom: clamp(16rem, 31vh, 21rem);
  --hero-tag-size: clamp(7.4rem, 12vw, 10.8rem);
  --hero-tag-depth: -52px;
  --hero-tag-drift-x: 14px;
  --hero-tag-drift-y: 10px;
  --hero-tag-rotation: -14deg;
  --hero-tag-delay: -4300ms;
}

.floating-tool-tag-5 {
  right: clamp(7rem, 14vw, 18rem);
  top: clamp(1.5rem, 6vh, 4rem);
  --hero-tag-size: clamp(4.25rem, 6vw, 5.75rem);
  --hero-tag-depth: 8px;
  --hero-tag-drift-x: 34px;
  --hero-tag-drift-y: 28px;
  --hero-tag-rotation: 10deg;
  --hero-tag-delay: -5600ms;
}

.floating-tool-tag-6 {
  right: calc(100% - var(--hero-copy-safe-left) + var(--hero-copy-safe-gap));
  bottom: clamp(7.25rem, 12vh, 9.5rem);
  --hero-tag-size: clamp(8.5rem, 12.5vw, 12rem);
  --hero-tag-depth: 68px;
  --hero-tag-drift-x: 11px;
  --hero-tag-drift-y: 8px;
  --hero-tag-rotation: -6deg;
  --hero-tag-delay: -6600ms;
}

.floating-tool-tag-7 {
  left: calc(var(--hero-copy-safe-right) + var(--hero-copy-safe-gap));
  bottom: clamp(5.25rem, 11vh, 8.25rem);
  --hero-tag-size: clamp(7.5rem, 11vw, 10.5rem);
  --hero-tag-depth: 38px;
  --hero-tag-drift-x: 16px;
  --hero-tag-drift-y: 10px;
  --hero-tag-rotation: 8deg;
  --hero-tag-delay: -5200ms;
}

.floating-tool-icon {
  position: relative;
  z-index: 1;
  display: inline-flex;
  height: 100%;
  width: 100%;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
}

.floating-tool-icon-backed {
  border: 1px solid color-mix(in srgb, var(--theme-text) 18%, transparent);
  background: color-mix(in srgb, var(--theme-text) 88%, var(--theme-surface-strong));
}

.floating-tool-icon img {
  height: 86%;
  width: 86%;
  object-fit: contain;
}

.floating-tool-name {
  position: relative;
  z-index: 1;
  display: none;
  max-width: 86%;
  overflow-wrap: anywhere;
}

.hero-copy {
  position: relative;
  min-width: 0;
}

.hero-copy-centered {
  position: relative;
  z-index: 1;
  display: grid;
  justify-items: center;
  max-width: min(100%, 55rem);
  text-align: center;
  transform: translateY(clamp(-5rem, -7vh, -2.5rem));
}

.hero-copy h1 {
  margin-top: 0.85rem;
  max-width: 52rem;
  color: var(--landing-text-strong);
  font-size: clamp(2.65rem, 6.6vw, 5.15rem);
  font-weight: 820;
  letter-spacing: 0;
  line-height: 0.98;
}

.hero-copy h1 span {
  display: block;
  white-space: nowrap;
}

.hero-brand-title {
  margin-bottom: 0.1em;
  color: color-mix(in srgb, var(--landing-text-strong) 92%, var(--landing-accent-soft));
}

.eyebrow,
.section-heading p {
  color: var(--landing-accent);
  font-size: 0.78rem;
  font-weight: 760;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.hero-lede {
  margin-top: 1.1rem;
  max-width: 42rem;
  color: var(--landing-text-soft);
  font-size: 1rem;
  line-height: 1.62;
}

.hero-lede span {
  display: block;
}

.hero-actions {
  margin-top: clamp(1.45rem, 3vw, 2.05rem);
  display: flex;
  width: fit-content;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  justify-self: center;
  gap: 0.85rem;
}

.hero-button {
  display: inline-flex;
  min-height: 3.125rem;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 0.625rem;
  border: 1px solid var(--landing-accent-border);
  border-radius: 999px;
  background: var(--landing-button-bg);
  padding: 0 1.45rem;
  color: var(--landing-text-inverse);
  font-size: 0.9375rem;
  font-weight: 800;
  line-height: 1;
  text-align: center;
}

.hero-button span {
  line-height: 1;
}

.hero-button :deep(svg) {
  display: block;
  flex: 0 0 auto;
}

.hero-button:hover {
  border-color: color-mix(in srgb, var(--landing-accent-hover) 58%, transparent);
  background: var(--landing-button-bg-hover);
  box-shadow: var(--landing-control-shadow-hover);
}

.hero-button.secondary {
  border: 1px solid var(--landing-accent-border);
  background: var(--landing-button-bg);
  color: var(--landing-text-inverse);
}

.hero-button.secondary:hover {
  border-color: color-mix(in srgb, var(--landing-accent-hover) 58%, transparent);
  background: var(--landing-button-bg-hover);
  color: var(--landing-text-inverse);
}

.trust-card span {
  display: block;
  color: var(--landing-muted);
  font-size: 0.8rem;
}

.trust-band {
  background: var(--landing-bg);
  padding-top: clamp(0.75rem, 1.6vw, 1.4rem);
  padding-bottom: clamp(1.35rem, 2.8vw, 2.15rem);
}

.trust-strip {
  display: grid;
  min-width: 0;
  overflow: hidden;
  border-radius: 0.5rem;
  border: 1px solid var(--landing-hairline);
  background: var(--landing-surface-soft);
  box-shadow: none;
}

.trust-card {
  min-height: 5.6rem;
  min-width: 0;
  padding: 1rem 1.25rem;
  position: relative;
}

.trust-card + .trust-card::before {
  content: '';
  position: absolute;
  top: 1.2rem;
  bottom: 1.2rem;
  left: 0;
  width: 1px;
  background: var(--landing-hairline);
}

.trust-card strong {
  display: block;
  color: var(--landing-text-strong);
  font-size: clamp(1.55rem, 2.8vw, 2.25rem);
  font-weight: 780;
  letter-spacing: 0;
}

.trust-card span {
  margin-top: 0.35rem;
}

@media (min-width: 760px) {
  .trust-strip {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.support-showcase {
  border-top: 1px solid var(--theme-border);
  border-bottom: 1px solid var(--theme-border);
  background: color-mix(in srgb, var(--theme-surface) 58%, var(--landing-bg));
}

.support-showcase-panel {
  padding: clamp(2rem, 4vw, 3.25rem) 0;
  color: var(--theme-text);
}

.support-showcase-title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: center;
  gap: 0.35em;
  margin: 0;
  text-align: center;
  font-size: clamp(1.85rem, 4.2vw, 3.45rem);
  font-weight: 780;
  letter-spacing: 0;
  line-height: 1.15;
}

.support-showcase-title strong {
  font-weight: 820;
}

.support-showcase-title em {
  color: var(--theme-primary-hover);
  font-style: normal;
  font-weight: 820;
}

.support-provider-row,
.support-platform-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
}

.support-provider-row {
  gap: 0.75rem 0.85rem;
  margin-top: clamp(1.75rem, 4vw, 3rem);
}

.support-provider-row p {
  margin: 0;
  color: var(--theme-text);
  font-size: clamp(1.1rem, 2.1vw, 1.6rem);
  font-weight: 780;
  line-height: 1.2;
}

.support-provider-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  border: 1px solid var(--landing-hairline);
  border-radius: 0.5rem;
  background: var(--landing-surface-soft);
  padding: 0.48rem 0.72rem;
  color: var(--theme-text-soft);
  font-size: clamp(0.94rem, 1.45vw, 1.12rem);
  font-weight: 760;
  line-height: 1.2;
}

.support-icon-frame {
  display: inline-flex;
  height: clamp(1.75rem, 2.4vw, 2.2rem);
  width: clamp(1.75rem, 2.4vw, 2.2rem);
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 0.45rem;
}

.support-icon-frame-backed {
  border: 1px solid color-mix(in srgb, var(--theme-text) 18%, transparent);
  background: color-mix(in srgb, var(--theme-text) 88%, var(--theme-surface-strong));
  box-shadow:
    0 1px 0 color-mix(in srgb, var(--theme-text) 24%, transparent) inset,
    0 10px 22px rgba(2, 6, 23, 0.2);
}

.support-icon-frame img {
  height: 78%;
  width: 78%;
  object-fit: contain;
}

.support-platform-row {
  gap: 0.85rem 1rem;
  margin-top: clamp(2rem, 4vw, 3rem);
}

.support-platform-row p {
  margin: 0 0.6rem 0 0;
  color: var(--theme-text-muted);
  font-size: clamp(0.9rem, 1.7vw, 1.2rem);
  font-weight: 700;
  line-height: 1.5;
}

.support-platform-chip {
  display: inline-flex;
  min-height: 3.35rem;
  min-width: min(12rem, 100%);
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  border: 1px solid var(--theme-border-strong);
  border-radius: 0.5rem;
  background: var(--landing-surface-soft);
  padding: 0.68rem 1.2rem;
  color: var(--theme-text-soft);
  font-size: clamp(0.96rem, 1.45vw, 1.16rem);
  font-weight: 760;
}

.support-platform-chip .support-icon-frame {
  height: 2rem;
  width: 2rem;
}

.section-pad {
  padding-top: clamp(5.5rem, 8vw, 7.5rem);
  padding-bottom: clamp(5.5rem, 8vw, 7.5rem);
}

.section-heading {
  max-width: 46rem;
}

.section-heading.centered {
  margin: 0 auto;
  text-align: center;
}

.section-heading h2 {
  margin-top: 0.8rem;
  color: var(--landing-text-strong);
  font-size: clamp(2rem, 4.5vw, 3.85rem);
  font-weight: 780;
  letter-spacing: 0;
  line-height: 1.08;
  overflow-wrap: anywhere;
}

.section-heading span {
  margin-top: 1rem;
  display: block;
  color: var(--landing-muted);
  font-size: 1rem;
  line-height: 1.8;
}

.testimonial-section {
  position: relative;
  isolation: isolate;
  background: var(--landing-bg);
  color: var(--landing-text);
  padding-top: clamp(5.5rem, 8vw, 7.5rem);
  padding-bottom: clamp(5.5rem, 8vw, 7.5rem);
}

.testimonial-section .section-heading h2 {
  color: var(--landing-text-strong);
}

.testimonial-section .section-heading span {
  color: var(--landing-muted);
}

.testimonial-marquee {
  margin-top: 2.5rem;
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  overflow: hidden;
  padding: 0.5rem 0 1.75rem;
  position: relative;
}

.testimonial-marquee::before,
.testimonial-marquee::after {
  content: '';
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 2;
  width: min(11rem, 18vw);
  pointer-events: none;
}

.testimonial-marquee::before {
  content: none;
}

.testimonial-marquee::after {
  content: none;
}

.testimonial-track {
  display: flex;
  align-items: center;
  width: max-content;
  gap: 0.9rem;
  padding-left: 1rem;
  animation: testimonial-scroll 52s linear infinite;
  will-change: transform;
}

.testimonial-marquee:hover .testimonial-track {
  animation-play-state: paused;
}

.testimonial-card {
  position: relative;
  display: flex;
  width: min(22rem, calc(100vw - 2.5rem));
  min-width: 0;
  min-height: 16rem;
  flex-direction: column;
  justify-content: space-between;
  flex: 0 0 auto;
  padding: 1.35rem;
  color: var(--landing-text);
  border: 1px solid var(--landing-hairline);
  border-radius: 0.5rem;
  background: var(--landing-surface-soft);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.045) inset,
    0 10px 24px rgba(2, 6, 23, 0.18);
}

.testimonial-card:nth-child(4n + 2) {
  width: min(24rem, calc(100vw - 2.5rem));
  min-height: 17rem;
  background: var(--landing-surface-soft);
}

.testimonial-card:nth-child(4n + 3) {
  transform: translateY(0.9rem);
  background: var(--landing-surface-soft);
}

.testimonial-card:nth-child(4n) {
  width: min(20rem, calc(100vw - 2.5rem));
  min-height: 15rem;
  transform: translateY(-0.65rem);
  background: var(--landing-surface-soft);
}

.testimonial-card::before {
  content: '“';
  position: absolute;
  right: 1rem;
  top: -0.55rem;
  color: var(--landing-accent-tint);
  font-family: Georgia, serif;
  font-size: 5rem;
  line-height: 1;
}

.testimonial-card p {
  position: relative;
  z-index: 1;
  color: var(--landing-text-soft);
  font-size: 0.95rem;
  line-height: 1.85;
}

@keyframes testimonial-scroll {
  from {
    transform: translate3d(0, 0, 0);
  }

  to {
    transform: translate3d(calc(-50% - 0.5rem), 0, 0);
  }
}

@keyframes hero-tag-float {
  0%,
  100% {
    translate: 0 0;
  }

  50% {
    translate: 0 -0.7rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .testimonial-marquee {
    overflow-x: auto;
  }

  .testimonial-track {
    animation: none;
  }

  .floating-tool-tag {
    animation: none;
    transition: none;
    transform: none;
    translate: none;
  }

  .landing-header,
  .landing-header nav,
  .brand-mark {
    transition: none;
  }
}

.reviewer {
  margin-top: 1.3rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  position: relative;
  z-index: 1;
  min-width: 0;
}

.avatar-photo {
  display: inline-flex;
  height: 2.7rem;
  width: 2.7rem;
  border-radius: 0.8rem;
  flex: 0 0 auto;
  background-image: url('/testimonial-avatar-sprite.png');
  background-repeat: no-repeat;
  background-size: 400% 200%;
  box-shadow:
    0 0 0 1px rgba(15, 23, 42, 0.08),
    0 10px 22px rgba(15, 23, 42, 0.14);
}

.reviewer strong,
.reviewer em {
  display: block;
  overflow-wrap: anywhere;
}

.reviewer strong {
  font-size: 0.95rem;
}

.reviewer em {
  color: var(--landing-muted);
  font-size: 0.8rem;
  font-style: normal;
}

.sticky-heading {
  align-self: start;
}

@media (min-width: 1024px) {
  .sticky-heading {
    position: sticky;
    top: 7rem;
  }
}

.faq-list {
  display: grid;
  gap: 0;
}

.faq-item {
  padding: 1.65rem 0;
  border-top: 1px solid var(--landing-border-strong);
}

.faq-item:last-child {
  border-bottom: 1px solid var(--landing-border-strong);
}

.faq-item h3 {
  color: var(--landing-text-strong);
  font-size: 1.1rem;
  font-weight: 760;
}

.faq-item p {
  margin-top: 0.75rem;
  color: var(--landing-text-soft);
  line-height: 1.72;
}

.landing-footer {
  position: relative;
  isolation: isolate;
  color: var(--landing-text-soft);
  background: var(--landing-bg);
  padding-top: clamp(4.5rem, 7vw, 6.5rem);
  padding-bottom: clamp(3.5rem, 6vw, 5rem);
}

.landing-footer::before {
  content: none;
}

.footer-top {
  display: grid;
  min-width: 0;
  gap: 3rem;
}

.footer-description {
  color: var(--landing-subtle);
}

@media (min-width: 900px) {
  .footer-top {
    grid-template-columns: 1fr 1.4fr;
  }
}

.footer-links {
  display: grid;
  min-width: 0;
  gap: 2rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (min-width: 720px) {
  .footer-links {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.footer-links h3 {
  margin-bottom: 0.9rem;
  color: var(--landing-text);
  font-size: 0.9rem;
  font-weight: 800;
}

.footer-links a,
.footer-links span {
  margin-top: 0.7rem;
  display: block;
  color: var(--landing-subtle);
  font-size: 0.88rem;
}

.footer-links a:hover {
  color: var(--landing-text);
}

.footer-bottom {
  margin-top: 3rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border-top: 1px solid var(--landing-border);
  padding-top: 1.5rem;
  color: var(--landing-dim);
  font-size: 0.85rem;
}

@media (min-width: 768px) {
  .footer-bottom {
    flex-direction: row;
    justify-content: space-between;
  }
}

@media (max-width: 1320px) and (min-width: 641px) {
  .hero-stage {
    --hero-copy-safe-width: min(38rem, calc(100vw - 12rem));
    --hero-copy-safe-gap: clamp(2.2rem, 4vw, 3.4rem);
  }

  .floating-tool-tag-1,
  .floating-tool-tag-3,
  .floating-tool-tag-5,
  .floating-tool-tag-6,
  .floating-tool-tag-7 {
    display: none;
  }

  .floating-tool-tag-2 {
    left: -3rem;
    top: clamp(6.8rem, 13vh, 9rem);
    --hero-tag-size: clamp(8rem, 14vw, 11rem);
    --hero-tag-drift-x: 6px;
    --hero-tag-drift-y: 5px;
  }

  .floating-tool-tag-4 {
    right: -2rem;
    left: auto;
    top: clamp(6.8rem, 13vh, 9rem);
    bottom: auto;
    --hero-tag-size: clamp(7.8rem, 13vw, 10.2rem);
    --hero-tag-drift-x: 8px;
    --hero-tag-drift-y: 6px;
  }

  .floating-tool-tag-2 {
    top: clamp(6rem, 16vh, 8.4rem);
  }

  .floating-tool-tag-4 {
    top: auto;
    bottom: clamp(2.6rem, 7vh, 4.5rem);
  }
}

@media (max-width: 640px) {
  .landing-header nav {
    gap: 0.6rem;
    padding-right: 0.75rem;
    padding-left: 0.75rem;
  }

  .landing-header .brand-lockup {
    max-width: none;
  }

  .brand-lockup {
    gap: 0.55rem;
  }

  .brand-mark,
  .landing-header-scrolled .brand-mark {
    height: 2rem;
    width: 2rem;
  }

  .landing-header .brand-tagline {
    display: none;
  }

  .landing-header-actions {
    gap: 0.4rem;
  }

  .landing-docs-action {
    display: none;
  }

  .primary-action {
    padding: 0 0.62rem;
  }

  .hero-button {
    width: 100%;
    padding: 0.8rem 1rem;
  }

  .hero-section {
    min-height: 100svh;
    padding-top: 5.25rem;
    padding-bottom: 2rem;
  }

  .hero-stage {
    min-height: calc(100svh - 7rem);
    align-content: center;
    gap: 1.4rem;
  }

  .hero-floating-tags {
    position: absolute;
    inset: 0;
    display: block;
    max-width: none;
    order: 2;
  }

  .floating-tool-tag,
  .floating-tool-tag-1,
  .floating-tool-tag-2,
  .floating-tool-tag-3,
  .floating-tool-tag-4,
  .floating-tool-tag-5,
  .floating-tool-tag-6 {
    position: absolute;
    --hero-mobile-tag-size: clamp(3.75rem, 20vw, 4.85rem);
    --hero-tag-size: var(--hero-mobile-tag-size);
    --hero-tag-depth: 0px;
    --hero-tag-drift-x: 0px;
    --hero-tag-drift-y: 0px;
    --hero-tag-rotation: 0deg;
    inset: auto;
    min-height: 0;
    font-size: clamp(0.58rem, 2.7vw, 0.7rem);
    transform: translate3d(0, 0, 0) rotate(var(--hero-tag-rotation));
  }

  .floating-tool-tag-1 {
    left: -2.2rem;
    top: 30%;
    --hero-mobile-tag-size: clamp(4.8rem, 21vw, 6rem);
    --hero-tag-rotation: -9deg;
  }

  .floating-tool-tag-2 {
    left: -2.2rem;
    top: -4.4rem;
    --hero-mobile-tag-size: clamp(7rem, 32vw, 8.2rem);
    --hero-tag-rotation: -3deg;
  }

  .floating-tool-tag-3 {
    right: -1.6rem;
    top: 33%;
    --hero-mobile-tag-size: clamp(4.4rem, 20vw, 5.8rem);
    --hero-tag-rotation: 4deg;
  }

  .floating-tool-tag-4 {
    right: -3.2rem;
    top: -4rem;
    --hero-mobile-tag-size: clamp(7.2rem, 34vw, 9.4rem);
    --hero-tag-rotation: -14deg;
  }

  .floating-tool-tag-5 {
    right: -3.6rem;
    top: 68%;
    --hero-mobile-tag-size: clamp(3.75rem, 17vw, 4.8rem);
    --hero-tag-rotation: 10deg;
  }

  .floating-tool-tag-6 {
    left: -1.6rem;
    bottom: 2.6rem;
    --hero-mobile-tag-size: clamp(7.4rem, 34vw, 9.4rem);
    --hero-tag-rotation: -6deg;
  }

  .floating-tool-tag-7 {
    right: -2.8rem;
    bottom: 0.9rem;
    --hero-mobile-tag-size: clamp(5.4rem, 24vw, 6.8rem);
    --hero-tag-rotation: 8deg;
  }

  .floating-tool-tag-1,
  .floating-tool-tag-3,
  .floating-tool-tag-5,
  .floating-tool-tag-6,
  .floating-tool-tag-7 {
    display: none;
  }

  .floating-tool-icon {
    height: 100%;
    width: 100%;
  }

  .floating-tool-name {
    max-width: 88%;
  }

  .hero-copy-centered {
    order: 1;
  }

  .testimonial-card,
  .testimonial-card:nth-child(4n + 2),
  .testimonial-card:nth-child(4n) {
    width: min(20rem, calc(100vw - 2rem));
  }

  .testimonial-card:nth-child(4n + 3),
  .testimonial-card:nth-child(4n) {
    transform: none;
  }

  .support-showcase-panel {
    padding-right: 1.1rem;
    padding-left: 1.1rem;
  }

  .support-provider-row,
  .support-platform-row {
    align-items: stretch;
  }

  .support-provider-row p,
  .support-platform-row p {
    width: 100%;
    text-align: center;
  }

  .support-provider-chip,
  .support-platform-chip {
    flex: 1 1 100%;
  }

  .hero-copy h1 {
    font-size: clamp(2.2rem, 12vw, 3.2rem);
    line-height: 1;
    overflow-wrap: anywhere;
  }

  .hero-copy h1 span {
    white-space: normal;
  }

  .section-pad {
    padding-top: 3.75rem;
    padding-bottom: 3.75rem;
  }

  .section-heading h2 {
    font-size: clamp(1.9rem, 9vw, 2.75rem);
  }

  .footer-links {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 380px) {
  .landing-header nav {
    padding-right: 0.55rem;
    padding-left: 0.55rem;
  }

  .icon-action {
    display: none;
  }

  .hero-section {
    padding-top: 4.8rem;
  }

  .trust-card {
    min-height: 6.4rem;
    padding: 1.1rem 1.15rem;
  }

}
</style>
