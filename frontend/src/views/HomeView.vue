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
      <nav class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8">
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

        <div class="flex items-center gap-2">
          <LocaleSwitcher />
          <a
            v-if="docUrl"
            :href="docUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="icon-action"
            :title="t('home.viewDocs')"
          >
            <Icon name="book" size="md" />
          </a>
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
      <section class="hero-section px-5 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8">
        <div class="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div class="hero-copy">
            <p class="eyebrow">{{ t('home.modern.hero.eyebrow') }}</p>
            <h1>
              <span class="hero-brand-title">{{ siteName }}</span>
              <span>{{ t('home.modern.hero.line1') }}</span>
              <span>{{ t('home.modern.hero.line2') }}</span>
            </h1>
            <p class="hero-lede">
              {{ siteSubtitle }}
              <span>{{ t('home.modern.hero.description') }}</span>
            </p>

            <div class="mt-8 flex flex-col gap-3 sm:flex-row">
              <router-link :to="isAuthenticated ? dashboardPath : '/login'" class="hero-button">
                {{ isAuthenticated ? t('home.goToDashboard') : t('home.getStarted') }}
                <Icon name="arrowRight" size="sm" />
              </router-link>
              <a v-if="docUrl" :href="docUrl" target="_blank" rel="noopener noreferrer" class="hero-button secondary">
                {{ t('home.viewDocs') }}
                <Icon name="externalLink" size="sm" />
              </a>
            </div>
          </div>

          <div class="hero-console" :aria-label="t('home.modern.console.previewLabel')">
            <span class="object-accent key" :style="assetSpriteStyle(objectSprite, '100% 0%')" aria-hidden="true"></span>
            <div class="console-topbar">
              <span></span>
              <span></span>
              <span></span>
              <strong>terminal</strong>
            </div>
            <div class="console-grid">
              <div class="command-panel">
                <p class="terminal-line terminal-command" style="--terminal-steps: 28; --terminal-delay: 80ms">
                  <span class="terminal-prompt">$</span>
                  <span class="terminal-curl">curl</span>
                  <span class="terminal-flag">-X POST</span>
                  <span class="terminal-path">/v1/messages</span>
                </p>
                <p class="terminal-line terminal-comment" style="--terminal-steps: 24; --terminal-delay: 920ms">
                  {{ terminalComment }}
                </p>
                <p class="terminal-line terminal-response" style="--terminal-steps: 34; --terminal-delay: 1640ms">
                  <span class="terminal-status-badge">{{ terminalStatus }}</span>
                  <span class="terminal-json">{{ terminalResponse }}</span>
                </p>
                <p class="terminal-line terminal-final-prompt" style="--terminal-steps: 2; --terminal-delay: 2460ms">
                  <span class="terminal-prompt">$</span>
                  <span class="terminal-cursor" aria-hidden="true"></span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="trust-band px-5 py-8 sm:px-6 lg:px-8">
        <div class="trust-strip mx-auto max-w-7xl">
          <div v-for="stat in trustStats" :key="stat.label" class="trust-card">
            <strong>{{ stat.value }}</strong>
            <span>{{ stat.label }}</span>
          </div>
        </div>
      </section>

      <section id="features" class="section-pad px-5 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-7xl">
          <div class="section-heading">
            <p>{{ t('home.modern.features.eyebrow') }}</p>
            <h2>{{ t('home.modern.features.title') }}</h2>
          </div>
          <div class="feature-layout">
            <article v-for="feature in featureCards" :key="feature.title" class="feature-card">
              <div class="feature-panel">
                <span class="feature-index">{{ feature.index }}</span>
                <span class="feature-icon-sprite" :style="assetSpriteStyle(iconSprite, feature.iconPosition)"></span>
                <div class="feature-copy">
                  <h3>{{ feature.title }}</h3>
                  <p>{{ feature.description }}</p>
                </div>
                <span class="feature-visual-sprite" :style="assetSpriteStyle(featureVisualSprite, feature.visualPosition)"></span>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section id="testimonials" class="testimonial-section px-5 py-20 sm:px-6 lg:px-8">
        <div class="mx-auto max-w-7xl">
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
        <div class="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.75fr_1.25fr]">
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
      <div class="mx-auto max-w-7xl">
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
const docUrl = computed(() => appStore.cachedPublicSettings?.doc_url || appStore.docUrl || '')
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

const terminalComment = computed(() => t('home.modern.console.lines.connected'))
const terminalStatus = computed(() => t('home.modern.console.lines.policy'))
const terminalResponse = computed(() => t('home.modern.console.lines.report'))

const trustStats = computed(() => [
  { value: '10,000+', label: t('home.modern.stats.developers') },
  { value: '99.9%', label: t('home.modern.stats.uptime') },
  { value: t('home.modern.stats.taskValue'), label: t('home.modern.stats.tasks') },
  { value: '1v1', label: t('home.modern.stats.support') }
])

const testimonialAvatarSprite = '/testimonial-avatar-sprite.png'
const iconSprite = '/landing-assets/icon-sprite.png'
const featureVisualSprite = '/landing-assets/feature-visual-sprite.png'
const objectSprite = '/landing-assets/object-sprite.png'

const featureCards = computed<Array<{
  iconPosition: string
  visualPosition: string
  index: string
  title: string
  description: string
}>>(() => [
  {
    iconPosition: '0% 0%',
    visualPosition: '0% 0%',
    index: '01',
    title: t('home.modern.featureCards.tools.title'),
    description: t('home.modern.featureCards.tools.description')
  },
  {
    iconPosition: '33.333% 0%',
    visualPosition: '100% 0%',
    index: '02',
    title: t('home.modern.featureCards.team.title'),
    description: t('home.modern.featureCards.team.description')
  },
  {
    iconPosition: '66.666% 0%',
    visualPosition: '0% 100%',
    index: '03',
    title: t('home.modern.featureCards.reliability.title'),
    description: t('home.modern.featureCards.reliability.description')
  },
  {
    iconPosition: '100% 33.333%',
    visualPosition: '100% 100%',
    index: '04',
    title: t('home.modern.featureCards.usage.title'),
    description: t('home.modern.featureCards.usage.description')
  }
])

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
      ...(docUrl.value ? [{ label: t('home.docs'), href: docUrl.value }] : [])
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

function avatarStyle(backgroundPosition: string) {
  return {
    backgroundImage: `url(${testimonialAvatarSprite})`,
    backgroundPosition
  }
}

function assetSpriteStyle(backgroundImage: string, backgroundPosition: string) {
  return {
    backgroundImage: `url(${backgroundImage})`,
    backgroundPosition
  }
}

function syncHeaderScrollState() {
  isHeaderCompact.value = window.scrollY > 18
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
:global(html.landing-page-active),
:global(body.landing-page-active) {
  --theme-bg: #14161a;
  --theme-bg-soft: #1d2026;
  --theme-bg-deep: #0f1115;
  --theme-surface: rgba(29, 32, 38, 0.88);
  --theme-surface-strong: #1d2026;
  --theme-surface-muted: rgba(37, 41, 49, 0.74);
  --theme-main-surface: #252931;
  --theme-border: rgba(148, 163, 184, 0.16);
  --theme-border-strong: rgba(148, 163, 184, 0.22);
  --theme-text-muted: #a7adb7;
  --theme-shadow: 0 1px 0 rgba(255, 255, 255, 0.04);
  --theme-shadow-hover: 0 1px 0 rgba(255, 255, 255, 0.07);
  --theme-scrollbar-track: #14161a;
  --theme-scrollbar-thumb: rgba(148, 163, 184, 0.34);
  --theme-scrollbar-thumb-hover: rgba(148, 163, 184, 0.56);
  color-scheme: dark;
  background: #14161a;
}

:global(.landing-page-active ::selection) {
  background: var(--landing-accent-selection, rgba(249, 115, 22, 0.28));
  color: var(--landing-text-inverse, #ffffff);
}

:global(html.landing-page-active),
:global(body.landing-page-active) {
  overflow-x: clip;
  overscroll-behavior-x: none;
}

:global(html.landing-page-active #app) {
  min-height: 100vh;
  background: #14161a;
}

.landing-shell {
  --landing-bg: #14161a;
  --landing-bg-soft: #1d2026;
  --landing-surface: #1d2026;
  --landing-surface-muted: #252931;
  --landing-surface-subtle: rgba(37, 41, 49, 0.74);
  --landing-border: rgba(148, 163, 184, 0.16);
  --landing-border-strong: rgba(148, 163, 184, 0.22);
  --landing-text: #f5f5f5;
  --landing-text-strong: #ffffff;
  --landing-text-soft: #d4d4d4;
  --landing-muted: #a7adb7;
  --landing-subtle: #94a3b8;
  --landing-dim: #64748b;
  --landing-accent: #f97316;
  --landing-accent-hover: #fb923c;
  --landing-accent-soft: #fdba74;
  --landing-accent-tint: rgba(249, 115, 22, 0.16);
  --landing-accent-border: rgba(249, 115, 22, 0.38);
  --landing-accent-selection: rgba(249, 115, 22, 0.28);
  --landing-text-inverse: #ffffff;
  --theme-bg: #14161a;
  --theme-bg-soft: #1d2026;
  --theme-bg-deep: #0f1115;
  --theme-surface: rgba(29, 32, 38, 0.88);
  --theme-surface-strong: #1d2026;
  --theme-surface-muted: rgba(37, 41, 49, 0.74);
  --theme-main-surface: #252931;
  --theme-border: rgba(148, 163, 184, 0.16);
  --theme-border-strong: rgba(148, 163, 184, 0.22);
  --theme-text-muted: #a7adb7;
  --theme-shadow: 0 1px 0 rgba(255, 255, 255, 0.04);
  --theme-shadow-hover: 0 1px 0 rgba(255, 255, 255, 0.07);
  color-scheme: dark;
  width: 100%;
  max-width: 100vw;
  overflow-x: clip;
  color: var(--landing-text);
  background: var(--landing-bg);
}

.landing-shell :deep(.locale-switcher) {
  --locale-text: #e2e8f0;
  --locale-text-strong: var(--landing-text-strong);
  --locale-code-bg: rgba(148, 163, 184, 0.14);
  --locale-hover-bg: rgba(37, 41, 49, 0.92);
  --locale-active-bg: var(--landing-accent-tint);
  --locale-active-text: #fed7aa;
}

.landing-header {
  position: sticky;
  top: 0;
  z-index: 30;
  max-width: 100vw;
  overflow-x: clip;
  background: rgba(20, 22, 26, 0.92);
  backdrop-filter: blur(18px);
  box-shadow: 0 1px 0 rgba(148, 163, 184, 0.05);
  transition:
    background-color 180ms ease,
    box-shadow 180ms ease;
}

.landing-header nav,
.brand-mark {
  transition:
    padding 180ms ease,
    height 180ms ease,
    width 180ms ease;
}

.landing-header-scrolled {
  background: rgba(20, 22, 26, 0.98);
  box-shadow:
    0 1px 0 rgba(148, 163, 184, 0.14),
    0 12px 28px rgba(2, 6, 23, 0.2);
}

.landing-header-scrolled nav {
  padding-top: 0.65rem;
  padding-bottom: 0.65rem;
}

.brand-lockup {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.75rem;
  color: var(--landing-text);
}

.brand-tagline {
  color: var(--landing-subtle);
}

.brand-mark {
  display: inline-flex;
  height: 2.75rem;
  width: 2.75rem;
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
  height: 2.4rem;
  width: 2.4rem;
}

.landing-nav-links {
  color: var(--landing-text-soft);
}

.landing-nav-links a:hover {
  color: var(--landing-text-strong);
}

.icon-action,
.primary-action,
.hero-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  transition:
    transform 160ms ease,
    border-color 160ms ease,
    background 160ms ease;
}

.icon-action {
  height: 2.5rem;
  width: 2.5rem;
  border: 1px solid var(--landing-border-strong);
  color: var(--landing-muted);
  background: var(--landing-surface-subtle);
}

.icon-action:hover {
  border-color: var(--landing-accent-border);
  color: var(--landing-accent-hover);
  background: var(--landing-accent-tint);
}

.icon-action:hover,
.primary-action:hover,
.hero-button:hover {
  transform: translateY(-1px);
}

.primary-action {
  min-height: 2.5rem;
  background: var(--landing-accent);
  padding: 0 1rem;
  color: var(--landing-text-inverse);
  font-size: 0.875rem;
  font-weight: 700;
}

.hero-section {
  position: relative;
  isolation: isolate;
  max-width: 100vw;
  overflow-x: clip;
}

.hero-section::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: rgba(20, 22, 26, 0.2);
  opacity: 0.44;
  pointer-events: none;
}

.hero-copy {
  position: relative;
}

.hero-copy h1 {
  margin-top: 0.9rem;
  max-width: 42rem;
  color: var(--landing-text-strong);
  font-size: clamp(2.65rem, 5.6vw, 4.8rem);
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1;
}

.hero-copy h1 span {
  display: block;
  white-space: nowrap;
}

.hero-brand-title {
  margin-bottom: 0.1em;
}

.eyebrow,
.section-heading p {
  color: var(--landing-accent);
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.hero-lede {
  margin-top: 1.25rem;
  max-width: 36rem;
  color: var(--landing-text-soft);
  font-size: 1rem;
  line-height: 1.75;
}

.hero-lede span {
  display: block;
}

.hero-button {
  min-height: 3.5rem;
  gap: 0.625rem;
  background: var(--landing-accent);
  padding: 0 1.5rem;
  color: var(--landing-text-inverse);
  font-weight: 800;
}

.hero-button.secondary {
  border: 1px solid var(--landing-border-strong);
  background: var(--landing-surface-muted);
  color: var(--landing-text);
}

.trust-card span {
  display: block;
  color: var(--landing-muted);
  font-size: 0.8rem;
}

.hero-console {
  position: relative;
  border: 1px solid var(--landing-border-strong);
  border-radius: 0.75rem;
  background: var(--landing-surface);
  overflow: visible;
}

.object-accent {
  position: absolute;
  z-index: 3;
  display: block;
  background-repeat: no-repeat;
  background-size: 300% 200%;
  opacity: 0.78;
  pointer-events: none;
}

.object-accent.command {
  bottom: 1.4rem;
  right: 2.4rem;
  height: 4.2rem;
  width: 5.8rem;
  opacity: 0.42;
}

.object-accent.key {
  right: -2rem;
  top: -2.2rem;
  height: 5.6rem;
  width: 5.6rem;
}

.console-topbar {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  border-bottom: 1px solid var(--landing-border);
  padding: 1rem;
}

.console-topbar span {
  height: 0.7rem;
  width: 0.7rem;
  border-radius: 999px;
  background: var(--landing-accent);
}

.console-topbar span:nth-child(2) {
  background: var(--landing-subtle);
}

.console-topbar span:nth-child(3) {
  background: var(--landing-dim);
}

.console-topbar strong {
  margin-left: 0.5rem;
  color: var(--landing-dim);
  font-size: 0.75rem;
}

.console-grid {
  padding: 1.35rem 1.45rem 1.55rem;
}

.command-panel {
  min-height: 15.4rem;
  padding: 1.4rem 1.45rem;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: clamp(0.96rem, 1.7vw, 1.15rem);
  line-height: 1.7;
}

.terminal-line {
  margin: 0;
  width: fit-content;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  clip-path: inset(0 100% 0 0);
  animation: terminal-type 720ms steps(var(--terminal-steps, 24), end) var(--terminal-delay, 0ms) forwards;
  will-change: clip-path;
}

.terminal-line + .terminal-line {
  margin-top: 0.8rem;
}

.terminal-prompt {
  color: var(--landing-accent-soft);
  font-weight: 800;
}

.terminal-command {
  display: flex;
  align-items: baseline;
  gap: 0.72rem;
}

.terminal-curl {
  color: var(--landing-text);
}

.terminal-flag {
  color: var(--landing-muted);
}

.terminal-path {
  color: var(--landing-accent-soft);
}

.terminal-comment {
  color: var(--landing-dim);
  font-style: italic;
}

.terminal-response {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.terminal-status-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 0.28rem;
  background: var(--landing-accent-tint);
  padding: 0.28rem 0.55rem;
  color: var(--landing-accent-soft);
  font-weight: 800;
}

.terminal-json {
  color: var(--landing-text-soft);
}

.terminal-final-prompt {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.terminal-cursor {
  display: inline-block;
  height: 1.15em;
  width: 0.48em;
  background: var(--landing-accent-soft);
  transform: translateY(0.16em);
  animation: terminal-cursor-blink 960ms steps(2, end) infinite;
}

.trust-band {
  background: rgba(29, 32, 38, 0.74);
}

.trust-strip {
  display: grid;
  overflow: hidden;
  border-radius: 0.5rem;
  background: rgba(37, 41, 49, 0.46);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.trust-card {
  min-height: 7.5rem;
  padding: 1.35rem 1.5rem;
  position: relative;
}

.trust-card + .trust-card::before {
  content: '';
  position: absolute;
  bottom: 1.25rem;
  left: 0;
  top: 1.25rem;
  width: 1px;
  background: var(--landing-border-strong);
}

.trust-card strong {
  display: block;
  color: var(--landing-text-strong);
  font-size: clamp(2rem, 4vw, 3rem);
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

.section-pad {
  padding-top: 5rem;
  padding-bottom: 5rem;
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
  font-size: clamp(2.2rem, 5vw, 4.3rem);
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1.04;
}

.section-heading span {
  margin-top: 1rem;
  display: block;
  color: var(--landing-muted);
  font-size: 1rem;
  line-height: 1.8;
}

.feature-layout {
  margin-top: 3rem;
  display: grid;
  gap: 1.15rem;
}

@media (min-width: 768px) {
  .feature-layout {
    grid-template-columns: repeat(6, minmax(0, 1fr));
    align-items: start;
  }
}

.feature-card {
  min-width: 0;
}

@media (min-width: 768px) {
  .feature-card {
    grid-column: span 3;
  }

  .feature-card:nth-child(2),
  .feature-card:nth-child(4) {
    transform: translateY(2rem);
  }
}

.feature-panel {
  position: relative;
  min-height: 18rem;
  overflow: hidden;
  border-radius: 0.5rem;
  padding: 1.5rem;
  border: 1px solid var(--landing-border);
  background: var(--landing-surface);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 18px 42px rgba(2, 6, 23, 0.16);
}

.feature-index {
  position: absolute;
  right: 1rem;
  top: 0.35rem;
  color: rgba(255, 255, 255, 0.06);
  font-size: 4.5rem;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1;
}

.feature-icon-sprite {
  position: relative;
  z-index: 1;
  display: inline-flex;
  height: 4.25rem;
  width: 4.25rem;
  border-radius: 0.5rem;
  background-repeat: no-repeat;
  background-size: 400% 300%;
}

.feature-copy {
  position: relative;
  z-index: 2;
  max-width: 22rem;
}

.feature-card h3 {
  position: relative;
  z-index: 1;
  margin-top: 1.2rem;
  color: var(--landing-text-strong);
  font-size: 1.2rem;
  font-weight: 800;
}

.feature-card p {
  position: relative;
  z-index: 1;
  margin-top: 0.8rem;
  color: var(--landing-text-soft);
  font-size: 0.94rem;
  line-height: 1.8;
}

.feature-visual-sprite {
  position: absolute;
  bottom: -3rem;
  right: -3.2rem;
  z-index: 0;
  height: 13rem;
  width: 17rem;
  background-repeat: no-repeat;
  background-size: 200% 200%;
  opacity: 0.68;
}

.testimonial-section {
  position: relative;
  isolation: isolate;
  background: var(--landing-bg);
  color: var(--landing-text);
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
  gap: 1rem;
  padding-left: 1rem;
  animation: testimonial-scroll 44s linear infinite;
  will-change: transform;
}

.testimonial-marquee:hover .testimonial-track {
  animation-play-state: paused;
}

.testimonial-card {
  position: relative;
  display: flex;
  width: min(22rem, calc(100vw - 3rem));
  min-height: 16rem;
  flex-direction: column;
  justify-content: space-between;
  flex: 0 0 auto;
  padding: 1.4rem;
  color: var(--landing-text);
  border: 1px solid var(--landing-border);
  border-radius: 0.5rem;
  background: var(--landing-surface);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.04),
    0 18px 42px rgba(2, 6, 23, 0.2);
}

.testimonial-card:nth-child(4n + 2) {
  width: min(24rem, calc(100vw - 3rem));
  min-height: 18rem;
  background: var(--landing-surface);
}

.testimonial-card:nth-child(4n + 3) {
  transform: translateY(1.25rem);
  background: var(--landing-surface);
}

.testimonial-card:nth-child(4n) {
  width: min(20rem, calc(100vw - 3rem));
  min-height: 15rem;
  transform: translateY(-0.9rem);
  background: var(--landing-surface);
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

@keyframes terminal-type {
  to {
    clip-path: inset(0 0 0 0);
  }
}

@keyframes terminal-cursor-blink {
  0%,
  42% {
    opacity: 1;
  }

  43%,
  100% {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .testimonial-marquee {
    overflow-x: auto;
  }

  .testimonial-track {
    animation: none;
  }

  .terminal-line {
    animation: none;
    clip-path: inset(0 0 0 0);
  }

  .terminal-cursor {
    animation: none;
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
  padding: 1.45rem 0;
  border-top: 1px solid var(--landing-border-strong);
}

.faq-item:last-child {
  border-bottom: 1px solid var(--landing-border-strong);
}

.faq-item h3 {
  color: var(--landing-text-strong);
  font-size: 1.1rem;
  font-weight: 800;
}

.faq-item p {
  margin-top: 0.75rem;
  color: var(--landing-text-soft);
  line-height: 1.8;
}

.landing-footer {
  position: relative;
  isolation: isolate;
  color: var(--landing-text-soft);
  background: var(--landing-bg);
}

.landing-footer::before {
  content: none;
}

.footer-top {
  display: grid;
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

@media (max-width: 640px) {
  .console-grid {
    grid-template-columns: 1fr;
  }

  .testimonial-card,
  .testimonial-card:nth-child(4n + 2),
  .testimonial-card:nth-child(4n) {
    width: min(20rem, calc(100vw - 3rem));
  }

  .testimonial-card:nth-child(4n + 3),
  .testimonial-card:nth-child(4n) {
    transform: none;
  }

  .object-accent {
    display: none;
  }

  .feature-visual-sprite {
    bottom: -2.4rem;
    right: -5.5rem;
    opacity: 0.42;
  }

  .hero-copy h1 {
    font-size: clamp(2.25rem, 10vw, 2.75rem);
  }

  .hero-copy h1 span {
    white-space: normal;
  }
}
</style>
