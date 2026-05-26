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
          <LocaleSwitcher />
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
      <section class="hero-section px-5 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8">
        <div class="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
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
              <router-link to="/docs" class="hero-button secondary">
                {{ t('home.viewDocs') }}
                <Icon name="book" size="sm" />
              </router-link>
            </div>
          </div>

          <div class="hero-console" :aria-label="t('home.modern.console.previewLabel')">
            <div class="console-topbar">
              <span></span>
              <span></span>
              <span></span>
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
        <div class="trust-strip">
          <div v-for="stat in trustStats" :key="stat.label" class="trust-card">
            <strong>{{ stat.value }}</strong>
            <span>{{ stat.label }}</span>
          </div>
        </div>
      </section>

      <section id="features" class="support-showcase px-5 py-12 sm:px-6 lg:px-8">
        <div class="support-showcase-panel mx-auto">
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
        <div>
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
        <div class="grid gap-10 lg:grid-cols-[0.75fr_1.25fr]">
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
      <div>
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
const supportAssetBase = '/landing-support'
const supportProviders = [
  { name: 'Claude Code', icon: `${supportAssetBase}/claude-code.svg`, needsBadge: false },
  { name: 'Codex', icon: `${supportAssetBase}/codex.svg`, needsBadge: false },
  { name: 'Gemini CLI', icon: `${supportAssetBase}/gemini-cli.svg`, needsBadge: false },
  { name: 'OpenClaw', icon: `${supportAssetBase}/openclaw.svg`, needsBadge: false },
  { name: 'Hermes Agent', icon: `${supportAssetBase}/hermes-agent.svg`, needsBadge: true }
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

function avatarStyle(backgroundPosition: string) {
  return {
    backgroundImage: `url(${testimonialAvatarSprite})`,
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
  --theme-primary: #f97316;
  --theme-primary-hover: #fb923c;
  --theme-primary-soft: rgba(249, 115, 22, 0.18);
  --theme-accent: #f97316;
  --theme-accent-soft: rgba(249, 115, 22, 0.1);
  --theme-shadow: 0 1px 0 rgba(255, 255, 255, 0.035);
  --theme-shadow-hover: 0 10px 30px rgba(0, 0, 0, 0.22);
  --theme-scrollbar-track: #171717;
  --theme-scrollbar-thumb: rgba(148, 163, 184, 0.34);
  --theme-scrollbar-thumb-hover: rgba(148, 163, 184, 0.56);
  color-scheme: dark;
  background: #171717;
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
  background: #171717;
}

.landing-shell {
  --landing-bg: #171717;
  --landing-bg-soft: #1c1c1c;
  --landing-surface: #242424;
  --landing-surface-muted: #262626;
  --landing-surface-subtle: rgba(38, 38, 38, 0.84);
  --landing-border: rgba(255, 255, 255, 0.08);
  --landing-border-strong: rgba(255, 255, 255, 0.14);
  --landing-text: #f8fafc;
  --landing-text-strong: #ffffff;
  --landing-text-soft: #e2e8f0;
  --landing-muted: #c4cfdc;
  --landing-subtle: #aeb9c8;
  --landing-dim: #8fa0b3;
  --landing-accent: #f97316;
  --landing-accent-hover: #fb923c;
  --landing-accent-soft: #fed7aa;
  --landing-accent-tint: rgba(249, 115, 22, 0.18);
  --landing-accent-border: rgba(249, 115, 22, 0.38);
  --landing-accent-selection: rgba(249, 115, 22, 0.28);
  --landing-support: #f97316;
  --landing-support-soft: rgba(249, 115, 22, 0.1);
  --landing-control-radius: 0.375rem;
  --landing-nav-control-height: 2.25rem;
  --landing-nav-control-radius: 0.375rem;
  --landing-control-border: rgba(148, 163, 184, 0.18);
  --landing-control-shadow: 0 1px 0 rgba(255, 255, 255, 0.06) inset, 0 10px 24px rgba(2, 6, 23, 0.2);
  --landing-control-shadow-hover: 0 1px 0 rgba(255, 255, 255, 0.08) inset, 0 14px 30px rgba(2, 6, 23, 0.28);
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
  --theme-primary: #f97316;
  --theme-primary-hover: #fb923c;
  --theme-primary-soft: rgba(249, 115, 22, 0.18);
  --theme-accent: #f97316;
  --theme-accent-soft: rgba(249, 115, 22, 0.1);
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

.landing-shell :deep(.locale-switcher) {
  --locale-text: #e2e8f0;
  --locale-text-strong: var(--landing-text-strong);
  --locale-code-bg: rgba(148, 163, 184, 0.14);
  --locale-hover-bg: var(--theme-surface-muted);
  --locale-active-bg: var(--landing-accent-tint);
  --locale-active-text: #fed7aa;
}

.landing-shell :deep(.locale-trigger) {
  min-height: var(--landing-nav-control-height);
  border-color: var(--landing-control-border);
  border-radius: var(--landing-nav-control-radius);
  background: var(--theme-surface-muted);
  padding: 0 0.55rem;
  box-shadow: var(--landing-control-shadow);
}

.landing-shell :deep(.locale-trigger-value) {
  font-size: 0.78rem;
}

.landing-shell :deep(.locale-trigger-icon) {
  color: var(--landing-support);
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
    0 14px 32px rgba(2, 6, 23, 0.24);
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
  border-right: 1px solid var(--theme-border-strong);
  border-left: 1px solid var(--theme-border-strong);
  border-radius: 0.9rem;
  background: var(--theme-surface-strong);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.06) inset,
    0 16px 34px rgba(2, 6, 23, 0.3);
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
  max-width: 8.5rem;
  border-radius: var(--landing-nav-control-radius);
  border: 1px solid color-mix(in srgb, var(--landing-support) 34%, var(--landing-control-border));
  background: color-mix(in srgb, var(--landing-support) 10%, var(--theme-surface-muted));
  padding: 0 0.7rem;
  color: var(--landing-support);
  font-size: 0.8125rem;
  font-weight: 800;
  line-height: 1.15;
  white-space: nowrap;
}

.landing-docs-action span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.landing-docs-action:hover {
  border-color: color-mix(in srgb, var(--landing-support) 58%, transparent);
  background: color-mix(in srgb, var(--landing-support) 16%, var(--theme-surface-strong));
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
  padding: 0 0.8rem;
  color: var(--landing-text-inverse);
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.15;
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
  overflow-x: clip;
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
  opacity: 0.44;
  pointer-events: none;
}

.hero-copy {
  position: relative;
  min-width: 0;
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
  min-height: 3.125rem;
  min-width: 0;
  gap: 0.625rem;
  border: 1px solid var(--landing-accent-border);
  border-radius: calc(var(--landing-control-radius) + 0.125rem);
  background: var(--landing-button-bg);
  padding: 0 1.25rem;
  color: var(--landing-text-inverse);
  font-size: 0.9375rem;
  font-weight: 800;
  line-height: 1.25;
  text-align: center;
}

.hero-button:hover {
  border-color: color-mix(in srgb, var(--landing-accent-hover) 58%, transparent);
  background: var(--landing-button-bg-hover);
  box-shadow: var(--landing-control-shadow-hover);
}

.hero-button.secondary {
  border: 1px solid var(--landing-control-border);
  background: var(--theme-surface-muted);
  color: var(--landing-text-soft);
}

.hero-button.secondary:hover {
  border-color: color-mix(in srgb, var(--landing-support) 42%, transparent);
  background: var(--theme-surface-strong);
  color: var(--landing-support);
}

.trust-card span {
  display: block;
  color: var(--landing-muted);
  font-size: 0.8rem;
}

.hero-console {
  position: relative;
  min-width: 0;
  border-radius: 0.75rem;
  background: var(--landing-surface);
  box-shadow: 0 18px 42px rgba(2, 6, 23, 0.18);
  overflow: visible;
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
  background: #ff5f57;
  box-shadow: inset 0 0 0 1px rgba(2, 6, 23, 0.16);
}

.console-topbar span:nth-child(2) {
  background: #ffbd2e;
}

.console-topbar span:nth-child(3) {
  background: #28c840;
}

.console-grid {
  min-width: 0;
  padding: clamp(0.85rem, 4vw, 1.45rem);
}

.command-panel {
  min-width: 0;
  min-height: clamp(12.75rem, 44vw, 15.4rem);
  padding: clamp(0.85rem, 4vw, 1.45rem);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: clamp(0.78rem, 2.8vw, 1.15rem);
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
  min-width: 0;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.3rem 0.72rem;
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
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1rem;
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
  min-width: 0;
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
  background: var(--landing-bg);
}

.trust-strip {
  display: grid;
  min-width: 0;
  overflow: hidden;
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--theme-surface-muted) 46%, transparent);
  box-shadow: none;
}

.trust-card {
  min-height: 7.5rem;
  min-width: 0;
  padding: 1.35rem 1.5rem;
  position: relative;
}

.trust-card + .trust-card::before {
  content: none;
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

.support-showcase {
  border-top: 1px solid var(--theme-border);
  border-bottom: 1px solid var(--theme-border);
  background: color-mix(in srgb, var(--theme-surface) 72%, var(--landing-bg));
}

.support-showcase-panel {
  padding: clamp(1.25rem, 3.2vw, 2.4rem) 0;
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
  font-size: clamp(2rem, 5vw, 4rem);
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1.15;
}

.support-showcase-title strong {
  font-weight: 900;
}

.support-showcase-title em {
  color: var(--theme-primary-hover);
  font-style: normal;
  font-weight: 900;
}

.support-provider-row,
.support-platform-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
}

.support-provider-row {
  gap: 1rem 1.45rem;
  margin-top: clamp(2rem, 5vw, 3.8rem);
}

.support-provider-row p {
  margin: 0;
  color: var(--theme-text);
  font-size: clamp(1.25rem, 2.5vw, 2rem);
  font-weight: 900;
  line-height: 1.2;
}

.support-provider-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  color: var(--theme-text-soft);
  font-size: clamp(1rem, 1.7vw, 1.35rem);
  font-weight: 900;
  line-height: 1.2;
}

.support-icon-frame {
  display: inline-flex;
  height: clamp(2.05rem, 3vw, 2.75rem);
  width: clamp(2.05rem, 3vw, 2.75rem);
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
    0 10px 22px rgba(2, 6, 23, 0.16);
}

.support-icon-frame img {
  height: 78%;
  width: 78%;
  object-fit: contain;
}

.support-platform-row {
  gap: 0.85rem 1rem;
  margin-top: clamp(2.4rem, 5vw, 4rem);
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
  min-height: 4rem;
  min-width: min(13.4rem, 100%);
  align-items: center;
  justify-content: center;
  gap: 0.8rem;
  border: 1px solid var(--theme-border-strong);
  border-radius: 0.5rem;
  background: var(--theme-surface-strong);
  padding: 0.8rem 1.5rem;
  color: var(--theme-text-soft);
  font-size: clamp(1rem, 1.7vw, 1.4rem);
  font-weight: 800;
}

.support-platform-chip .support-icon-frame {
  height: 2.35rem;
  width: 2.35rem;
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
  width: min(22rem, calc(100vw - 2.5rem));
  min-width: 0;
  min-height: 16rem;
  flex-direction: column;
  justify-content: space-between;
  flex: 0 0 auto;
  padding: 1.4rem;
  color: var(--landing-text);
  border-radius: 0.5rem;
  background: var(--landing-surface);
  box-shadow: 0 18px 42px rgba(2, 6, 23, 0.2);
}

.testimonial-card:nth-child(4n + 2) {
  width: min(24rem, calc(100vw - 2.5rem));
  min-height: 18rem;
  background: var(--landing-surface);
}

.testimonial-card:nth-child(4n + 3) {
  transform: translateY(1.25rem);
  background: var(--landing-surface);
}

.testimonial-card:nth-child(4n) {
  width: min(20rem, calc(100vw - 2.5rem));
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

  .landing-shell :deep(.locale-trigger) {
    padding: 0 0.48rem;
  }

  .primary-action {
    max-width: 5.75rem;
    padding: 0 0.62rem;
    white-space: normal;
  }

  .hero-button {
    width: 100%;
    padding: 0.8rem 1rem;
  }

  .hero-console {
    overflow: hidden;
  }

  .console-grid {
    grid-template-columns: 1fr;
  }

  .console-topbar {
    padding: 0.78rem;
  }

  .terminal-line {
    width: 100%;
    white-space: normal;
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
    font-size: clamp(2rem, 10vw, 2.75rem);
    line-height: 1.04;
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

  .landing-shell :deep(.locale-trigger-value),
  .landing-shell :deep(.locale-chevron) {
    display: none;
  }

  .icon-action {
    display: none;
  }

  .primary-action {
    max-width: 4.8rem;
    font-size: 0.76rem;
  }

  .hero-section {
    padding-top: 2.5rem;
  }

  .command-panel {
    line-height: 1.6;
  }

  .terminal-status-badge {
    padding: 0.22rem 0.42rem;
  }

  .trust-card {
    min-height: 6.4rem;
    padding: 1.1rem 1.15rem;
  }

}
</style>
