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

  <div v-else class="landing-shell min-h-screen text-white">
    <header class="landing-header">
      <nav class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8">
        <router-link to="/home" class="brand-lockup">
            <span class="brand-mark">
              <img :src="siteLogo || '/logo.png'" :alt="siteName" />
            </span>
            <span class="min-w-0">
              <span class="block truncate text-base font-semibold tracking-tight">{{ siteName }}</span>
            <span class="block truncate text-xs text-slate-400">{{ t('home.modern.navTagline') }}</span>
          </span>
        </router-link>

        <div class="landing-nav-links hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
          <a href="#features" class="transition hover:text-white">{{ t('home.modern.nav.features') }}</a>
          <a href="#testimonials" class="transition hover:text-white">{{ t('home.modern.nav.testimonials') }}</a>
          <a href="#faq" class="transition hover:text-white">{{ t('home.modern.nav.faq') }}</a>
          <a href="#contact" class="transition hover:text-white">{{ t('home.modern.nav.contact') }}</a>
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
            <span class="object-accent command" :style="assetSpriteStyle(objectSprite, '0% 0%')" aria-hidden="true"></span>
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

            <div class="hero-points" :aria-label="t('home.modern.hero.pointsLabel')">
              <div v-for="item in heroPoints" :key="item.title">
                <span>{{ item.title }}</span>
                <strong>{{ item.text }}</strong>
              </div>
            </div>
          </div>

          <div class="hero-console" :aria-label="t('home.modern.console.previewLabel')">
            <span class="object-accent key" :style="assetSpriteStyle(objectSprite, '100% 0%')" aria-hidden="true"></span>
            <div class="console-topbar">
              <span></span>
              <span></span>
              <span></span>
              <strong>{{ siteName }} Console</strong>
            </div>
            <div class="console-grid">
              <div class="command-panel">
                <p class="prompt">$ deploy-ai-workflow --team product</p>
                <div class="code-lines">
                  <span v-for="line in consoleLines" :key="line">{{ line }}</span>
                </div>
              </div>
              <div class="metric-panel">
                <span>{{ t('home.modern.console.tasksLabel') }}</span>
                <strong>24,819</strong>
                <em>{{ t('home.modern.console.tasksCaption') }}</em>
              </div>
              <div class="metric-panel accent">
                <span>{{ t('home.modern.console.statusLabel') }}</span>
                <strong>99.9%</strong>
                <em>{{ t('home.modern.console.statusCaption') }}</em>
              </div>
              <div class="route-panel">
                <div v-for="route in routingRows" :key="route.name">
                  <span>{{ route.name }}</span>
                  <strong>{{ route.status }}</strong>
                </div>
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

    <footer id="contact" class="landing-footer px-5 py-12 text-slate-300 sm:px-6 lg:px-8">
      <div class="mx-auto max-w-7xl">
        <div class="footer-top">
          <div>
            <div class="brand-lockup">
              <span class="brand-mark">
                <img :src="siteLogo || '/logo.png'" :alt="siteName" />
              </span>
              <span>
                <span class="block text-base font-semibold">{{ siteName }}</span>
                <span class="block text-xs text-slate-400">{{ t('home.modern.footer.tagline') }}</span>
              </span>
            </div>
            <p class="mt-5 max-w-md text-sm leading-7 text-slate-400">
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
import { computed, onMounted, onUnmounted, watchEffect } from 'vue'
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

const heroPoints = computed(() => [
  { title: t('home.modern.hero.points.workspace.title'), text: t('home.modern.hero.points.workspace.text') },
  { title: t('home.modern.hero.points.reliability.title'), text: t('home.modern.hero.points.reliability.text') },
  { title: t('home.modern.hero.points.support.title'), text: t('home.modern.hero.points.support.text') }
])

const consoleLines = computed(() => [
  t('home.modern.console.lines.connected'),
  t('home.modern.console.lines.policy'),
  t('home.modern.console.lines.routing'),
  t('home.modern.console.lines.report')
])

const routingRows = computed(() => [
  { name: t('home.modern.console.routes.codeAssist'), status: t('home.modern.console.status.active') },
  { name: t('home.modern.console.routes.teamKeys'), status: t('home.modern.console.status.synced') },
  { name: t('home.modern.console.routes.usageGuard'), status: t('home.modern.console.status.online') }
])

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

onMounted(() => {
  authStore.checkAuth()

  if (!appStore.publicSettingsLoaded) {
    appStore.fetchPublicSettings()
  }
})

watchEffect(() => {
  const useLandingCanvas = !homeContent.value
  document.documentElement.classList.toggle('landing-page-active', useLandingCanvas)
  document.body.classList.toggle('landing-page-active', useLandingCanvas)
})

onUnmounted(() => {
  document.documentElement.classList.remove('landing-page-active')
  document.body.classList.remove('landing-page-active')
})
</script>

<style scoped>
:global(html.landing-page-active),
:global(body.landing-page-active) {
  background: linear-gradient(180deg, #1d2026 0%, #14161a 46%, #0f1115 100%);
}

:global(html.landing-page-active),
:global(body.landing-page-active) {
  overflow-x: clip;
  overscroll-behavior-x: none;
}

:global(html.landing-page-active #app) {
  min-height: 100vh;
  background: linear-gradient(180deg, #1d2026 0%, #14161a 46%, #0f1115 100%);
}

.landing-shell {
  --landing-bg: #14161a;
  --landing-bg-soft: #1d2026;
  --landing-surface: #1d2026;
  --landing-surface-muted: #252931;
  --landing-border: rgba(148, 163, 184, 0.16);
  --landing-text: #f5f5f5;
  --landing-muted: #a7adb7;
  width: 100%;
  max-width: 100vw;
  overflow-x: clip;
  background: linear-gradient(180deg, #1d2026 0%, #14161a 46%, #0f1115 100%);
}

.landing-header {
  position: sticky;
  top: 0;
  z-index: 30;
  max-width: 100vw;
  overflow-x: clip;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(20, 22, 26, 0.86);
  backdrop-filter: blur(18px);
}

.brand-lockup {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.75rem;
}

.brand-mark {
  display: inline-flex;
  height: 2.75rem;
  width: 2.75rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 0.75rem;
  background: #252931;
}

.brand-mark img {
  height: 100%;
  width: 100%;
  object-fit: contain;
  padding: 0.25rem;
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
  border: 1px solid rgba(148, 163, 184, 0.2);
  color: #a3a3a3;
  background: rgba(37, 41, 49, 0.74);
}

.icon-action:hover {
  border-color: rgba(249, 115, 22, 0.38);
  color: #fb923c;
  background: rgba(124, 45, 18, 0.18);
}

.icon-action:hover,
.primary-action:hover,
.hero-button:hover {
  transform: translateY(-1px);
}

.primary-action {
  min-height: 2.5rem;
  background: #f97316;
  padding: 0 1rem;
  color: #ffffff;
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
  background:
    linear-gradient(90deg, rgba(20, 22, 26, 0.2) 0%, rgba(20, 22, 26, 0.18) 42%, rgba(20, 22, 26, 0.5) 100%);
  opacity: 0.44;
  pointer-events: none;
}

.hero-copy {
  position: relative;
}

.hero-copy h1 {
  margin-top: 1rem;
  max-width: 48rem;
  color: #ffffff;
  font-size: clamp(3rem, 7vw, 5.7rem);
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
  color: #f97316;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.hero-lede {
  margin-top: 1.5rem;
  max-width: 42rem;
  color: #d4d4d4;
  font-size: 1.08rem;
  line-height: 1.9;
}

.hero-lede span {
  display: block;
}

.hero-button {
  min-height: 3.5rem;
  gap: 0.625rem;
  background: #f97316;
  padding: 0 1.5rem;
  color: #ffffff;
  font-weight: 800;
}

.hero-button.secondary {
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: #252931;
  color: #f5f5f5;
}

.hero-points {
  margin-top: 2.25rem;
  display: grid;
  gap: 0.75rem;
}

.hero-points div {
  border-left: 2px solid #f97316;
  padding-left: 1rem;
}

.hero-points span,
.trust-card span,
.metric-panel span {
  display: block;
  color: #a3a3a3;
  font-size: 0.8rem;
}

.hero-points strong {
  margin-top: 0.2rem;
  display: block;
  color: #f5f5f5;
  font-size: 0.95rem;
}

.hero-console {
  position: relative;
  border: 1px solid rgba(148, 163, 184, 0.2);
  border-radius: 0.75rem;
  background: #1d2026;
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
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
  padding: 1rem;
}

.console-topbar span {
  height: 0.7rem;
  width: 0.7rem;
  border-radius: 999px;
  background: #fb7185;
}

.console-topbar span:nth-child(2) {
  background: #fbbf24;
}

.console-topbar span:nth-child(3) {
  background: #34d399;
}

.console-topbar strong {
  margin-left: 0.5rem;
  color: #64748b;
  font-size: 0.75rem;
}

.console-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  padding: 1rem;
}

.command-panel,
.metric-panel,
.route-panel {
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 0.5rem;
  background: #252931;
}

.command-panel {
  grid-column: span 2;
  min-height: 18rem;
  padding: 1.25rem;
  background: #14161a;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.prompt {
  color: #fdba74;
  font-size: 0.85rem;
}

.code-lines {
  margin-top: 1.2rem;
  display: grid;
  gap: 0.8rem;
}

.code-lines span {
  display: block;
  border-left: 2px solid rgba(249, 115, 22, 0.52);
  padding-left: 0.8rem;
  color: #cbd5e1;
  font-size: 0.85rem;
}

.metric-panel {
  padding: 1rem;
}

.metric-panel strong {
  margin-top: 0.45rem;
  display: block;
  color: #ffffff;
  font-size: 2rem;
}

.metric-panel em {
  display: block;
  color: #f97316;
  font-size: 0.78rem;
  font-style: normal;
}

.metric-panel.accent strong {
  color: #f97316;
}

.route-panel {
  grid-column: span 2;
  padding: 1rem;
}

.route-panel div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.7rem 0;
}

.route-panel div + div {
  border-top: 1px solid rgba(148, 163, 184, 0.12);
}

.route-panel span {
  color: #d4d4d4;
}

.route-panel strong {
  color: #f97316;
  font-size: 0.8rem;
  text-transform: uppercase;
}

.trust-band {
  border-top: 1px solid rgba(148, 163, 184, 0.16);
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
  background:
    linear-gradient(90deg, rgba(249, 115, 22, 0.08), transparent 24%),
    rgba(29, 32, 38, 0.74);
}

.trust-strip {
  display: grid;
  overflow: hidden;
  border-radius: 0.5rem;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.045), transparent),
    rgba(37, 41, 49, 0.46);
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
  background: linear-gradient(180deg, transparent, rgba(148, 163, 184, 0.24), transparent);
}

.trust-card strong {
  display: block;
  color: #ffffff;
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
  color: #ffffff;
  font-size: clamp(2.2rem, 5vw, 4.3rem);
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1.04;
}

.section-heading span {
  margin-top: 1rem;
  display: block;
  color: #a3a3a3;
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
  color: #ffffff;
  font-size: 1.2rem;
  font-weight: 800;
}

.feature-card p {
  position: relative;
  z-index: 1;
  margin-top: 0.8rem;
  color: #d4d4d4;
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
  border-top: 1px solid var(--landing-border);
  border-bottom: 1px solid var(--landing-border);
  background:
    linear-gradient(180deg, rgba(20, 22, 26, 0.96), rgba(29, 32, 38, 0.92) 54%, rgba(20, 22, 26, 0.98)),
    var(--landing-bg);
  color: var(--landing-text);
}

.testimonial-section .section-heading h2 {
  color: #ffffff;
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
  left: 0;
  background: linear-gradient(90deg, rgba(20, 22, 26, 0.98) 0%, rgba(20, 22, 26, 0) 100%);
}

.testimonial-marquee::after {
  right: 0;
  background: linear-gradient(270deg, rgba(20, 22, 26, 0.98) 0%, rgba(20, 22, 26, 0) 100%);
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
  color: rgba(249, 115, 22, 0.18);
  font-family: Georgia, serif;
  font-size: 5rem;
  line-height: 1;
}

.testimonial-card p {
  position: relative;
  z-index: 1;
  color: #d4d4d4;
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

@media (prefers-reduced-motion: reduce) {
  .testimonial-marquee {
    overflow-x: auto;
  }

  .testimonial-track {
    animation: none;
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
  border-top: 1px solid rgba(148, 163, 184, 0.18);
}

.faq-item:last-child {
  border-bottom: 1px solid rgba(148, 163, 184, 0.18);
}

.faq-item h3 {
  color: #ffffff;
  font-size: 1.1rem;
  font-weight: 800;
}

.faq-item p {
  margin-top: 0.75rem;
  color: #d4d4d4;
  line-height: 1.8;
}

.landing-footer {
  position: relative;
  isolation: isolate;
  border-top: 1px solid rgba(148, 163, 184, 0.16);
  background:
    linear-gradient(180deg, rgba(20, 22, 26, 0.86), rgba(20, 22, 26, 0.96)),
    #14161a;
}

.landing-footer::before {
  content: none;
}

.footer-top {
  display: grid;
  gap: 3rem;
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
  color: #f8fafc;
  font-size: 0.9rem;
  font-weight: 800;
}

.footer-links a,
.footer-links span {
  margin-top: 0.7rem;
  display: block;
  color: #94a3b8;
  font-size: 0.88rem;
}

.footer-links a:hover {
  color: #f8fafc;
}

.footer-bottom {
  margin-top: 3rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  border-top: 1px solid rgba(148, 163, 184, 0.14);
  padding-top: 1.5rem;
  color: #64748b;
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

  .command-panel,
  .route-panel {
    grid-column: span 1;
  }

  .hero-copy h1 {
    font-size: clamp(2.25rem, 10vw, 2.75rem);
  }

  .hero-copy h1 span {
    white-space: normal;
  }
}
</style>
