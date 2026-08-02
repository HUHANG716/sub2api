<template>
  <div v-if="hasHomeContent" class="min-h-screen">
    <iframe
      v-if="isHomeContentUrl"
      :src="homeContent.trim()"
      class="h-screen w-full border-0"
      allowfullscreen
    ></iframe>
    <div v-else v-html="homeContent"></div>
  </div>

  <div
    v-else-if="compactHomeEnabled"
    data-testid="compact-home"
    class="compact-home-shell flex min-h-screen flex-col"
  >
    <header class="border-b border-gray-200 px-4 py-4 sm:px-6 dark:border-dark-800">
      <nav class="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
        <div class="flex min-w-0 flex-1 items-center gap-3">
          <img
            :src="siteLogo || '/logo.png'"
            :alt="siteName"
            class="h-9 w-9 shrink-0 rounded-lg object-contain"
          />
          <span class="min-w-0 truncate text-base font-semibold">{{ siteName }}</span>
        </div>
        <div class="flex shrink-0 items-center gap-2">
          <LocaleSwitcher />
          <a
            v-if="docUrl"
            :href="docUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="compact-home-muted flex h-10 w-10 items-center justify-center rounded-lg"
            :title="t('home.viewDocs')"
          >
            <Icon name="book" size="md" />
          </a>
          <router-link
            :to="isAuthenticated ? dashboardPath : '/login'"
            class="compact-home-primary inline-flex min-h-10 items-center justify-center rounded-lg px-4 py-2 text-sm font-medium"
          >
            {{ isAuthenticated ? t('home.dashboard') : t('home.login') }}
          </router-link>
        </div>
      </nav>
    </header>

    <main class="flex flex-1 items-center justify-center px-4 py-16 text-center sm:px-6">
      <div class="min-w-0 max-w-2xl">
        <img
          :src="siteLogo || '/logo.png'"
          :alt="siteName"
          class="mx-auto mb-6 h-20 w-20 rounded-2xl object-contain"
        />
        <h1 class="[overflow-wrap:anywhere] text-3xl font-bold md:text-4xl">{{ siteName }}</h1>
        <p class="compact-home-muted mt-4 whitespace-pre-wrap [overflow-wrap:anywhere]">
          {{ siteSubtitle }}
        </p>
        <router-link
          :to="isAuthenticated ? dashboardPath : '/login'"
          class="compact-home-primary mt-8 inline-flex min-h-10 items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium"
        >
          {{ isAuthenticated ? t('home.goToDashboard') : t('home.login') }}
        </router-link>
      </div>
    </main>

    <footer class="compact-home-muted border-t border-gray-200 px-4 py-5 text-center text-sm dark:border-dark-800">
      &copy; {{ currentYear }} {{ siteName }}
    </footer>
  </div>

  <div v-else class="landing-shell min-h-screen">
    <header
      ref="landingHeaderRef"
      class="landing-header"
      :class="{ 'landing-header-scrolled': isHeaderCompact }"
      :style="landingHeaderStyle"
    >
      <nav class="mx-auto flex items-center justify-between gap-4 px-5 py-4 sm:px-6 lg:px-8">
        <router-link to="/home" class="brand-lockup">
            <span class="brand-mark">
              <img :src="siteLogo || '/logo.png'" :alt="siteName" fetchpriority="high" decoding="async" />
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
        ref="heroSectionRef"
        class="hero-section px-5 sm:px-6 lg:px-8"
        data-header-surface="var(--landing-bg)"
        @mousemove="handleHeroPointerMove"
      >
        <div ref="heroStageRef" class="landing-container hero-stage" :style="heroStageStyle">
          <div class="hero-floating-tags" aria-hidden="true">
            <div
              v-for="tool in heroFloatingTags"
              :key="tool.name"
              class="floating-tool-tag"
              :class="`floating-tool-tag-${tool.shape}`"
              :style="heroTagStyle(tool)"
            >
              <span class="floating-tool-depth" :class="{ 'floating-tool-depth-ready': isHeroFloatingToolReady(tool) }">
                <span v-if="tool.icon" class="floating-tool-icon" :class="{ 'floating-tool-icon-backed': tool.needsBadge }">
                  <img
                    :src="tool.icon"
                    :alt="tool.name"
                    decoding="async"
                    @load="markHeroFloatingToolReady(tool.name)"
                    @error="markHeroFloatingToolReady(tool.name)"
                  />
                </span>
                <span class="floating-tool-name">{{ tool.name }}</span>
              </span>
            </div>
          </div>

          <div class="hero-copy hero-copy-centered">
            <h1 ref="heroHeadlineRef">
              <span class="hero-brand-title">{{ siteName }}</span>
              <span>{{ t('home.modern.hero.line1') }}</span>
              <span>{{ t('home.modern.hero.line2') }}</span>
            </h1>
            <p ref="heroLedeRef" class="hero-lede">
              {{ siteSubtitle }}
              <span>{{ t('home.modern.hero.description') }}</span>
            </p>

            <div ref="heroActionsRef" class="hero-actions">
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

      <section class="trust-band px-5 sm:px-6 lg:px-8" data-header-surface="var(--landing-bg)">
        <div class="landing-container trust-strip">
          <div v-for="stat in trustStats" :key="stat.label" class="trust-card">
            <strong>{{ stat.value }}</strong>
            <span>{{ stat.label }}</span>
          </div>
        </div>
      </section>

      <section
        id="features"
        class="support-showcase px-5 sm:px-6 lg:px-8"
        data-header-surface="color-mix(in srgb, var(--theme-surface-strong) 58%, var(--landing-bg))"
      >
        <div class="landing-container support-showcase-panel">
          <div class="support-showcase-copy">
            <h2 class="support-showcase-title">
              <span>{{ t('home.modern.supportShowcase.titlePrefix') }}</span>
              <strong>{{ t('home.modern.supportShowcase.titleCore') }}</strong>
              <em>{{ t('home.modern.supportShowcase.titleAccent') }}</em>
            </h2>
          </div>

          <div class="support-ecosystem">
            <div class="support-ecosystem-hub">
              <span class="support-hub-mark">
                <img :src="siteLogo || '/logo.png'" :alt="siteName" loading="lazy" decoding="async" />
              </span>
              <strong>{{ siteName }}</strong>
              <span>{{ t('home.modern.hero.line1') }}</span>
            </div>

            <div class="support-provider-row">
              <div
                v-for="(provider, index) in supportProviders"
                :key="provider.name"
                class="support-provider-chip"
                :class="`support-provider-chip-${index + 1}`"
              >
                <span class="support-icon-frame" :class="{ 'support-icon-frame-backed': provider.needsBadge }">
                  <img :src="provider.icon" :alt="provider.name" loading="lazy" decoding="async" />
                </span>
                <span>{{ provider.name }}</span>
              </div>
            </div>

            <div class="support-platform-row">
              <p>{{ t('home.modern.supportShowcase.platformIntro') }}</p>
              <div class="support-platform-dock">
                <div
                  v-for="platform in supportPlatforms"
                  :key="platform.name"
                  class="support-platform-chip"
                >
                  <span class="support-icon-frame support-icon-frame-backed">
                    <img :src="platform.icon" :alt="platform.name" loading="lazy" decoding="async" />
                  </span>
                  <span>{{ platform.name }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        ref="testimonialSectionRef"
        id="testimonials"
        class="testimonial-section px-5 py-20 sm:px-6 lg:px-8"
        data-header-surface="var(--landing-bg)"
      >
        <div class="landing-container">
          <div class="section-heading centered">
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

      <section
        id="faq"
        class="faq-section section-pad px-5 sm:px-6 lg:px-8"
        data-header-surface="var(--landing-bg)"
      >
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

    <footer
      id="contact"
      class="landing-footer px-5 py-12 sm:px-6 lg:px-8"
      data-header-surface="var(--landing-bg)"
    >
      <div class="landing-container">
        <div class="footer-top">
          <div>
            <div class="brand-lockup">
              <span class="brand-mark">
              <img :src="siteLogo || '/logo.png'" :alt="siteName" loading="lazy" decoding="async" />
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
import { computed, nextTick, onMounted, onUnmounted, ref, watchEffect, type CSSProperties } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore, useAuthStore } from '@/stores'
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'
import Icon from '@/components/icons/Icon.vue'
import { sanitizeUrl } from '@/utils/url'
import {
  computeHeroTagLayout,
  getHeroLayoutProfile,
  type HeroFloatingTag,
  type HeroRect,
  type HeroTagLayout,
  type HeroViewport
} from './homeHeroLayout'

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
const siteLogo = computed(() =>
  sanitizeUrl(appStore.cachedPublicSettings?.site_logo || appStore.siteLogo || '', {
    allowRelative: true,
    allowDataUrl: true
  })
)
const siteSubtitle = computed(() => appStore.cachedPublicSettings?.site_subtitle || t('home.modern.hero.subtitle'))
const docUrl = computed(() =>
  sanitizeUrl(appStore.cachedPublicSettings?.doc_url || appStore.docUrl || '')
)
const homeContent = computed(() => appStore.cachedPublicSettings?.home_content || '')
const hasHomeContent = computed(() => homeContent.value.trim().length > 0)
const compactHomeEnabled = computed(() => appStore.cachedPublicSettings?.compact_home_enabled === true)

const isHomeContentUrl = computed(() => {
  const content = homeContent.value.trim()
  return content.startsWith('http://') || content.startsWith('https://')
})

const isAuthenticated = computed(() => authStore.isAuthenticated)
const isAdmin = computed(() => authStore.isAdmin)
const dashboardPath = computed(() => (isAdmin.value ? '/admin/dashboard' : '/dashboard'))
const currentYear = computed(() => new Date().getFullYear())
const isHeaderCompact = ref(false)
const headerSurface = ref('var(--landing-bg)')
const heroScrollProgress = ref(0)
const landingHeaderRef = ref<HTMLElement | null>(null)
const heroPointer = ref({ x: 0, y: 0 })
const heroSectionRef = ref<HTMLElement | null>(null)
const heroStageRef = ref<HTMLElement | null>(null)
const heroHeadlineRef = ref<HTMLElement | null>(null)
const heroLedeRef = ref<HTMLElement | null>(null)
const heroActionsRef = ref<HTMLElement | null>(null)
const testimonialSectionRef = ref<HTMLElement | null>(null)
const heroTagLayouts = ref<HeroTagLayout[]>([])
const heroTagFields = ref<HeroTagField[]>([])
const heroReadyToolNames = ref<Set<string>>(new Set())
const shouldLoadTestimonials = ref(false)
let heroResizeObserver: ResizeObserver | null = null
let testimonialObserver: IntersectionObserver | null = null
let heroLayoutFrame = 0
let heroFieldFrame = 0

type HeroPointerState = {
  x: number
  y: number
  stageX: number
  stageY: number
  active: number
}

type HeroTagField = {
  key: string
  fieldX: number
  fieldY: number
}

type HeroFloatingTool = HeroFloatingTag & {
  icon: string
  needsBadge: boolean
  angle: number
}

const heroPointerTarget: HeroPointerState = {
  x: 0,
  y: 0,
  stageX: 0,
  stageY: 0,
  active: 0
}
const heroPointerPhysics: HeroPointerState = {
  x: 0,
  y: 0,
  stageX: 0,
  stageY: 0,
  active: 0
}

const trustStats = computed(() => [
  { value: '10,000+', label: t('home.modern.stats.developers') },
  { value: '99.9%', label: t('home.modern.stats.uptime') },
  { value: t('home.modern.stats.taskValue'), label: t('home.modern.stats.tasks') },
  { value: '1v1', label: t('home.modern.stats.support') }
])

const testimonialAvatarSprite = '/testimonial-avatar-sprite.jpg'
const supportAssetBase = '/landing-support'
const supportProviders = [
  { name: 'Claude Code', icon: `${supportAssetBase}/claude-code.svg`, needsBadge: false },
  { name: 'Codex', icon: `${supportAssetBase}/codex.svg`, needsBadge: false },
  { name: 'Gemini CLI', icon: `${supportAssetBase}/gemini-cli.svg`, needsBadge: false },
  { name: 'OpenClaw', icon: `${supportAssetBase}/openclaw.svg`, needsBadge: false },
  { name: 'Hermes Agent', icon: `${supportAssetBase}/hermes-agent.svg`, needsBadge: true }
] as const
const heroFloatingTags = [
  { ...supportProviders[0], shape: 'round', prominence: 'normal', angle: -7 },
  { ...supportProviders[1], shape: 'round', prominence: 'primary', angle: 4 },
  { ...supportProviders[2], shape: 'round', prominence: 'normal', angle: 6 },
  { name: 'OpenAI', icon: '', needsBadge: false, shape: 'text', prominence: 'normal', angle: -3 },
  { ...supportProviders[3], shape: 'round', prominence: 'compact', angle: 8 },
  { ...supportProviders[4], shape: 'round', prominence: 'compact', angle: -6 },
  { name: 'Codex App', icon: `${supportAssetBase}/codex-app.png`, needsBadge: false, shape: 'round', prominence: 'compact', angle: 5 }
] satisfies readonly HeroFloatingTool[]
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
  '--hero-pointer-y': heroPointer.value.y.toFixed(3),
  '--hero-pointer-active': heroPointerPhysics.active.toFixed(3),
  '--hero-scroll-progress': heroScrollProgress.value.toFixed(3)
}))
const landingHeaderStyle = computed(() => ({
  '--landing-header-surface': headerSurface.value
}) as CSSProperties)

const heroLayoutByKey = computed(() => new Map(heroTagLayouts.value.map((layout) => [layout.key, layout])))
const heroFieldByKey = computed(() => new Map(heroTagFields.value.map((field) => [field.key, field])))

function heroTagStyle(tool: HeroFloatingTool): CSSProperties {
  const layout = heroLayoutByKey.value.get(tool.name)
  if (!layout) return {}
  const field = heroFieldByKey.value.get(tool.name)
  const scroll = computeHeroTagScrollMotion(layout)

  return {
    '--hero-tag-x': `${layout.x.toFixed(1)}px`,
    '--hero-tag-y': `${layout.y.toFixed(1)}px`,
    '--hero-tag-size': `${layout.width.toFixed(1)}px`,
    '--hero-tag-width': `${layout.width.toFixed(1)}px`,
    '--hero-tag-height': `${layout.height.toFixed(1)}px`,
    '--hero-tag-depth': `${layout.depth.toFixed(1)}px`,
    '--hero-tag-drift-x': `${layout.driftX.toFixed(1)}px`,
    '--hero-tag-drift-y': `${layout.driftY.toFixed(1)}px`,
    '--hero-tag-field-x': `${(field?.fieldX ?? 0).toFixed(1)}px`,
    '--hero-tag-field-y': `${(field?.fieldY ?? 0).toFixed(1)}px`,
    '--hero-tag-scroll-x': `${scroll.x.toFixed(1)}px`,
    '--hero-tag-scroll-y': `${scroll.y.toFixed(1)}px`,
    '--hero-tag-scroll-opacity': scroll.opacity.toFixed(3),
    '--hero-tag-scroll-scale': scroll.scale.toFixed(3),
    '--hero-tag-angle': `${tool.angle}deg`,
    '--hero-tag-delay': `${layout.delay}ms`
  } as CSSProperties
}

function computeHeroTagScrollMotion(layout: HeroTagLayout) {
  const progress = heroScrollProgress.value
  const scatterProgress = Math.max(0, Math.min(1, progress / 1.28))
  const scatter = smoothProgress(scatterProgress)
  const scatterX = layout.scatterX ?? 0
  const scatterY = layout.scatterY ?? 0
  const x = scatterX * scatter
  const y = scatterY * scatter
  const fade = smoothProgress(Math.max(0, Math.min(1, (progress - 0.28) / 0.34)))

  return {
    x,
    y,
    opacity: 1 - fade,
    scale: 1 - scatter * 0.28
  }
}

function smoothProgress(value: number): number {
  return value * value * (3 - 2 * value)
}

function avatarStyle(backgroundPosition: string) {
  return {
    '--testimonial-avatar-image': shouldLoadTestimonials.value ? `url(${testimonialAvatarSprite})` : 'none',
    backgroundPosition
  }
}

function isHeroFloatingToolReady(tool: HeroFloatingTool) {
  return !tool.icon || heroReadyToolNames.value.has(tool.name)
}

function markHeroFloatingToolReady(name: string) {
  if (heroReadyToolNames.value.has(name)) return
  heroReadyToolNames.value = new Set([...heroReadyToolNames.value, name])
}

function syncHeaderScrollState() {
  isHeaderCompact.value = window.scrollY > 18
  syncHeroScrollProgress()
  syncHeaderSurface()
}

function syncHeroScrollProgress() {
  const section = heroSectionRef.value
  if (!section) {
    heroScrollProgress.value = 0
    return
  }

  const rect = section.getBoundingClientRect()
  const travel = Math.max(1, rect.height * 0.76)
  const progress = Math.max(0, Math.min(1, -rect.top / travel))
  heroScrollProgress.value = canUseHeroMotion() ? progress : 0
}

function syncHeaderSurface() {
  const header = landingHeaderRef.value
  const headerRect = header?.getBoundingClientRect()
  const sampleY = Math.max(1, Math.min(window.innerHeight - 1, (headerRect?.bottom ?? 64) + 1))
  const sampleX = Math.max(1, Math.min(window.innerWidth - 1, window.innerWidth / 2))
  const elements = typeof document.elementsFromPoint === 'function'
    ? document.elementsFromPoint(sampleX, sampleY)
    : []
  const section = elements.find((element): element is HTMLElement => (
    element instanceof HTMLElement && element.dataset.headerSurface !== undefined
  ))

  headerSurface.value = section?.dataset.headerSurface || 'var(--landing-bg)'
}

function handleHeroPointerMove(event: MouseEvent) {
  const stage = heroStageRef.value
  const rect = stage?.getBoundingClientRect() ?? (event.currentTarget as HTMLElement).getBoundingClientRect()
  const fallbackWidth = window.innerWidth || 1
  const fallbackHeight = window.innerHeight || 1
  const width = rect.width > 0 ? rect.width : fallbackWidth
  const height = rect.height > 0 ? rect.height : fallbackHeight
  const stageX = Math.max(0, Math.min(width, event.clientX - rect.left))
  const stageY = Math.max(0, Math.min(height, event.clientY - rect.top))
  const x = (stageX / width - 0.5) * 2
  const y = (stageY / height - 0.5) * 2

  heroPointer.value = {
    x: Math.max(-1, Math.min(1, x)),
    y: Math.max(-1, Math.min(1, y))
  }
  heroPointerTarget.x = heroPointer.value.x
  heroPointerTarget.y = heroPointer.value.y
  heroPointerTarget.stageX = stageX
  heroPointerTarget.stageY = stageY
  heroPointerTarget.active = canUseHeroField() ? 1 : 0
  scheduleHeroFieldFrame()
}

function rectFromStage(element: HTMLElement, stageRect: DOMRect): HeroRect {
  const rect = element.getBoundingClientRect()

  return {
    x: rect.left - stageRect.left,
    y: rect.top - stageRect.top,
    width: rect.width,
    height: rect.height
  }
}

function scheduleHeroTagLayout() {
  if (typeof window === 'undefined') return

  window.cancelAnimationFrame(heroLayoutFrame)
  heroLayoutFrame = window.requestAnimationFrame(updateHeroTagLayout)
}

function updateHeroTagLayout() {
  const stage = heroStageRef.value
  if (!stage) return

  const stageRect = stage.getBoundingClientRect()
  if (stageRect.width <= 0 || stageRect.height <= 0) return

  const safeElements = [
    heroHeadlineRef.value,
    heroLedeRef.value,
    heroActionsRef.value
  ].filter((element): element is HTMLElement => Boolean(element))
  const viewport: HeroViewport = {
    width: window.innerWidth,
    height: window.innerHeight
  }
  const safeRects = safeElements.map((element) => rectFromStage(element, stageRect))

  heroTagLayouts.value = computeHeroTagLayout({
    tags: heroFloatingTags,
    stageRect: {
      x: stageRect.left,
      y: stageRect.top,
      width: stageRect.width,
      height: stageRect.height
    },
    safeRects,
    viewport,
    profile: getHeroLayoutProfile(viewport)
  })
  scheduleHeroFieldFrame()
}

function scheduleHeroFieldFrame() {
  if (typeof window === 'undefined') return
  if (heroFieldFrame) return

  heroFieldFrame = window.requestAnimationFrame(tickHeroField)
}

function tickHeroField() {
  heroFieldFrame = 0
  const stiffness = 0.42

  heroPointerPhysics.x += (heroPointerTarget.x - heroPointerPhysics.x) * stiffness
  heroPointerPhysics.y += (heroPointerTarget.y - heroPointerPhysics.y) * stiffness
  heroPointerPhysics.stageX += (heroPointerTarget.stageX - heroPointerPhysics.stageX) * stiffness
  heroPointerPhysics.stageY += (heroPointerTarget.stageY - heroPointerPhysics.stageY) * stiffness
  heroPointerPhysics.active += (heroPointerTarget.active - heroPointerPhysics.active) * 0.34

  heroPointer.value = {
    x: heroPointerPhysics.x * heroPointerPhysics.active,
    y: heroPointerPhysics.y * heroPointerPhysics.active
  }
  heroTagFields.value = computeHeroTagFields(heroPointerPhysics)

  const needsMoreFrames = [
    Math.abs(heroPointerTarget.x - heroPointerPhysics.x),
    Math.abs(heroPointerTarget.y - heroPointerPhysics.y),
    Math.abs(heroPointerTarget.stageX - heroPointerPhysics.stageX) / 100,
    Math.abs(heroPointerTarget.stageY - heroPointerPhysics.stageY) / 100,
    Math.abs(heroPointerTarget.active - heroPointerPhysics.active)
  ].some((delta) => delta > 0.004)

  if (needsMoreFrames) {
    scheduleHeroFieldFrame()
  }
}

function canUseHeroField() {
  if (typeof window === 'undefined') return false
  const finePointer = !window.matchMedia || window.matchMedia('(hover: hover) and (pointer: fine)').matches
  const reducedMotion = Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
  return finePointer && !reducedMotion
}

function canUseHeroMotion() {
  if (typeof window === 'undefined') return false
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
}

function computeHeroTagFields(pointer: HeroPointerState): HeroTagField[] {
  if (heroTagLayouts.value.length === 0) return []

  const viewport: HeroViewport = {
    width: window.innerWidth,
    height: window.innerHeight
  }
  const profile = getHeroLayoutProfile(viewport)
  const active = profile.includes('mobile') ? 0 : pointer.active
  if (active < 0.01) {
    return heroTagLayouts.value.map((layout) => ({
      key: layout.key,
      fieldX: 0,
      fieldY: 0
    }))
  }

  return heroTagLayouts.value.map((layout) => {
    const depth = profile.includes('mobile') ? 0 : layout.depth
    const signedDepth = Math.max(-0.95, Math.min(1, depth / 82))
    const depthFactor = Math.max(0.72, Math.min(1.28, 1 + signedDepth * 0.28))
    const parallaxScale = viewport.width <= 640
      ? 0
      : viewport.width <= 960
        ? 0.62
        : 0.95
    const travel = viewport.width <= 960 ? 34 : 46
    const targetFieldX = pointer.x * active * parallaxScale * travel * depthFactor
    const targetFieldY = pointer.y * active * parallaxScale * travel * depthFactor

    return {
      key: layout.key,
      fieldX: targetFieldX,
      fieldY: targetFieldY
    }
  })
}

function setupHeroLayoutObserver() {
  if (typeof window === 'undefined') return

  const observedElements = [
    heroSectionRef.value,
    heroStageRef.value,
    heroHeadlineRef.value,
    heroLedeRef.value,
    heroActionsRef.value
  ].filter((element): element is HTMLElement => Boolean(element))

  if (typeof ResizeObserver !== 'undefined') {
    heroResizeObserver = new ResizeObserver(scheduleHeroTagLayout)
    observedElements.forEach((element) => heroResizeObserver?.observe(element))
  }

  window.addEventListener('resize', scheduleHeroTagLayout, { passive: true })
  nextTick(scheduleHeroTagLayout)
}

function setupTestimonialsObserver() {
  if (typeof window === 'undefined') return
  const section = testimonialSectionRef.value
  if (!section || shouldLoadTestimonials.value) return

  if (typeof IntersectionObserver === 'undefined') {
    shouldLoadTestimonials.value = true
    return
  }

  testimonialObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      shouldLoadTestimonials.value = true
      testimonialObserver?.disconnect()
      testimonialObserver = null
    }
  }, {
    rootMargin: '640px 0px'
  })
  testimonialObserver.observe(section)
}

onMounted(() => {
  authStore.checkAuth()

  if (!appStore.publicSettingsLoaded) {
    appStore.fetchPublicSettings()
  }

  syncHeaderScrollState()
  window.addEventListener('scroll', syncHeaderScrollState, { passive: true })
  setupHeroLayoutObserver()
  nextTick(setupTestimonialsObserver)
})

watchEffect(() => {
  const useLandingCanvas = !homeContent.value
  document.documentElement.classList.toggle('landing-page-active', useLandingCanvas)
  document.body.classList.toggle('landing-page-active', useLandingCanvas)
})

onUnmounted(() => {
  window.cancelAnimationFrame(heroLayoutFrame)
  window.cancelAnimationFrame(heroFieldFrame)
  window.removeEventListener('scroll', syncHeaderScrollState)
  window.removeEventListener('resize', scheduleHeroTagLayout)
  heroResizeObserver?.disconnect()
  heroResizeObserver = null
  testimonialObserver?.disconnect()
  testimonialObserver = null
  document.documentElement.classList.remove('landing-page-active')
  document.body.classList.remove('landing-page-active')
})
</script>

<style scoped>
.compact-home-shell {
  background: var(--theme-bg);
  color: var(--theme-text);
}

.compact-home-muted {
  color: var(--theme-text-muted);
}

.compact-home-primary {
  background: var(--theme-primary);
  color: #fff;
}

.compact-home-primary:hover {
  background: var(--theme-primary-hover);
}

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
  position: sticky;
  top: 0;
  z-index: 30;
  max-width: 100vw;
  overflow-x: clip;
  padding-top: 0;
  transition: padding 180ms ease;
}

.landing-header::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  z-index: -1;
  width: 100%;
  border-radius: 0 0 1.35rem 1.35rem;
  background: var(--landing-header-surface, var(--landing-bg));
  transform: translateX(-50%);
  transition:
    background 180ms ease,
    border-radius 180ms ease,
    top 180ms ease;
}

.landing-header nav {
  width: 100%;
  min-width: 0;
  border: 0;
  border-radius: 0;
  background: var(--landing-header-surface, var(--landing-bg));
  backdrop-filter: none;
  padding-top: 0.625rem;
  padding-bottom: 0.625rem;
  box-shadow: none;
  transition: padding 180ms ease;
}

.brand-mark {
  transition:
    padding 180ms ease,
    height 180ms ease,
    width 180ms ease;
}

.landing-header-scrolled {
  pointer-events: none;
  padding-top: 0;
}

.landing-header-scrolled::before {
  top: 0;
  border-radius: 0 0 1.35rem 1.35rem;
}

.landing-header-scrolled nav {
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  border: 0;
  border-radius: 0;
  background: var(--landing-header-surface, var(--landing-bg));
  box-shadow: none;
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
  overflow: hidden;
  background: var(--landing-bg);
  padding-top: clamp(6.25rem, 8vw, 7.5rem);
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
  --hero-copy-offset-y: clamp(-5rem, -7vh, -2.5rem);
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
  perspective: 46rem;
  perspective-origin:
    calc(50% + var(--hero-pointer-x, 0) * 4%)
    calc(50% + var(--hero-pointer-y, 0) * 3%);
  transform-style: preserve-3d;
  opacity: calc(0.97 + var(--hero-pointer-active, 0) * 0.03);
}

.floating-tool-tag {
  position: absolute;
  --hero-tag-size: 5rem;
  --hero-tag-width: var(--hero-tag-size);
  --hero-tag-height: var(--hero-tag-size);
  --hero-tag-x: 50%;
  --hero-tag-y: 50%;
  --hero-tag-depth: 0px;
  --hero-tag-drift-x: 14px;
  --hero-tag-drift-y: 12px;
  --hero-tag-field-x: 0px;
  --hero-tag-field-y: 0px;
  --hero-tag-scroll-x: 0px;
  --hero-tag-scroll-y: 0px;
  --hero-tag-scroll-opacity: 1;
  --hero-tag-scroll-scale: 1;
  --hero-tag-angle: 0deg;
  display: inline-flex;
  box-sizing: border-box;
  left: 0;
  top: 0;
  width: var(--hero-tag-width);
  height: var(--hero-tag-height);
  aspect-ratio: 1;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  padding: 0;
  font-size: clamp(0.62rem, 0.76vw, 0.78rem);
  isolation: isolate;
  transform-style: preserve-3d;
  transform: translate3d(
      calc(var(--hero-tag-x) - 50% + var(--hero-tag-field-x) + var(--hero-tag-scroll-x)),
      calc(var(--hero-tag-y) - 50% + var(--hero-tag-field-y) + var(--hero-tag-scroll-y)),
      0
    ) rotate(var(--hero-tag-angle)) scale(var(--hero-tag-scroll-scale));
  opacity: var(--hero-tag-scroll-opacity);
  transition: none;
  will-change: transform, translate;
}

.floating-tool-depth {
  display: inline-flex;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: 0.38rem;
  border: clamp(0.18rem, 0.42vw, 0.34rem) solid var(--landing-sticker-border);
  border-radius: inherit;
  background: var(--landing-sticker-bg);
  color: var(--landing-bg);
  font-weight: 800;
  line-height: 1.05;
  text-align: center;
  overflow: hidden;
  box-shadow: none;
  filter: none;
  opacity: 0;
  transform: translateZ(var(--hero-tag-depth));
  transition: opacity 160ms ease;
  transform-style: preserve-3d;
}

.floating-tool-depth-ready {
  opacity: 1;
}

.floating-tool-tag::before {
  content: none;
}

.floating-tool-tag::after {
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
  color: var(--landing-bg);
  font-size: clamp(1.35rem, 2vw, 1.9rem);
  font-weight: 900;
  letter-spacing: 0;
}

.floating-tool-tag-text {
  width: var(--hero-tag-width);
  height: var(--hero-tag-height);
  min-width: 0;
  min-height: 0;
  aspect-ratio: auto;
  border-radius: 999px;
  font-size: clamp(1.2rem, 2vw, 1.8rem);
}

.floating-tool-tag-text .floating-tool-depth {
  padding: 0 clamp(1.25rem, 2vw, 1.85rem);
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
  height: 112%;
  width: 112%;
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
  transform: translateY(var(--hero-copy-offset-y));
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
  padding-top: clamp(0.6rem, 1.2vw, 1rem);
  padding-bottom: clamp(1rem, 2vw, 1.65rem);
}

.trust-strip {
  display: grid;
  min-width: 0;
  overflow: hidden;
  border-radius: 0.5rem;
  border: 1px solid var(--landing-hairline);
  background: color-mix(in srgb, var(--landing-surface-soft) 78%, transparent);
  box-shadow: none;
}

.trust-card {
  min-height: clamp(4.85rem, 8svh, 5.75rem);
  min-width: 0;
  padding: clamp(0.85rem, 1.5vw, 1.1rem) clamp(1rem, 2vw, 1.35rem);
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
  position: relative;
  isolation: isolate;
  min-height: min(100svh, 58rem);
  display: grid;
  align-items: center;
  overflow: hidden;
  border-top: 1px solid var(--theme-border);
  border-bottom: 1px solid var(--theme-border);
  background: color-mix(in srgb, var(--theme-surface-strong) 58%, var(--landing-bg));
}

.support-showcase-panel {
  display: grid;
  min-height: min(100svh, 58rem);
  grid-template-columns: minmax(0, 0.86fr) minmax(28rem, 1.14fr);
  align-items: center;
  gap: clamp(2.4rem, 6vw, 7rem);
  padding: clamp(5.5rem, 9svh, 8rem) 0;
  color: var(--theme-text);
}

.support-showcase-copy {
  position: relative;
  z-index: 2;
  max-width: 45rem;
}

.support-showcase-title {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: flex-start;
  gap: 0.35em;
  margin: 0;
  text-align: left;
  color: var(--landing-text-strong);
  font-size: clamp(2.3rem, 5.2vw, 5.1rem);
  font-weight: 780;
  letter-spacing: 0;
  line-height: 0.98;
}

.support-showcase-title strong {
  font-weight: 820;
}

.support-showcase-title em {
  color: var(--theme-primary-hover);
  font-style: normal;
  font-weight: 820;
}

.support-ecosystem {
  position: relative;
  min-height: clamp(29rem, 70svh, 42rem);
  border: 0;
  border-radius: 0.5rem;
  background: transparent;
  overflow: visible;
  transform-style: preserve-3d;
}

.support-ecosystem::before {
  content: '';
  position: absolute;
  pointer-events: none;
}

.support-ecosystem::before {
  left: 50%;
  top: 43%;
  width: min(29rem, 76%);
  height: min(19rem, 48%);
  border: 1px solid color-mix(in srgb, var(--landing-hairline) 42%, transparent);
  border-radius: 50%;
  transform: translate(-50%, -50%) rotate(-13deg);
}

.support-ecosystem-hub {
  position: absolute;
  left: 50%;
  top: 43%;
  z-index: 3;
  display: grid;
  min-width: min(15.5rem, 58%);
  transform: translate(-50%, -50%);
  justify-items: center;
  gap: 0.45rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  padding: 1rem 1.35rem;
  text-align: center;
  box-shadow: none;
}

.support-hub-mark {
  display: inline-flex;
  height: 2.25rem;
  width: 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.5rem;
  background: var(--landing-text-strong);
}

.support-hub-mark img {
  height: 82%;
  width: 82%;
  object-fit: contain;
}

.support-ecosystem-hub strong {
  color: var(--landing-text-strong);
  font-size: clamp(1rem, 1.5vw, 1.25rem);
  font-weight: 840;
  line-height: 1;
}

.support-ecosystem-hub span:last-child {
  color: var(--landing-muted);
  font-size: 0.78rem;
  font-weight: 720;
}

.support-provider-row {
  position: absolute;
  inset: clamp(1.1rem, 2vw, 1.8rem);
  z-index: 2;
  transform-origin: 50% 43%;
  animation: support-provider-orbit 34s linear infinite;
}

.support-provider-chip {
  position: absolute;
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  border: 1px solid var(--landing-hairline);
  border-radius: 999px;
  background: var(--landing-surface-raised);
  padding: 0.62rem 0.88rem;
  color: var(--theme-text-soft);
  font-size: clamp(0.92rem, 1.2vw, 1.08rem);
  font-weight: 760;
  line-height: 1.2;
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.04) inset,
    0 18px 36px rgba(2, 6, 23, 0.2);
  transform: translate(-50%, -50%) rotate(0deg);
  animation: support-provider-counter-orbit 34s linear infinite;
}

.support-provider-chip-1 {
  left: 22%;
  top: 25%;
}

.support-provider-chip-2 {
  left: 70%;
  top: 24%;
}

.support-provider-chip-3 {
  left: 82%;
  top: 43%;
}

.support-provider-chip-4 {
  left: 23%;
  top: 58%;
}

.support-provider-chip-5 {
  left: 60%;
  top: 62%;
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
  position: absolute;
  left: clamp(1.1rem, 2vw, 1.8rem);
  right: clamp(1.1rem, 2vw, 1.8rem);
  bottom: clamp(1rem, 2vw, 1.5rem);
  z-index: 3;
  display: grid;
  min-width: 0;
  gap: 0.75rem;
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 0;
}

.support-platform-row p {
  margin: 0;
  max-width: none;
  color: var(--theme-text-muted);
  font-size: clamp(0.82rem, 1.05vw, 0.95rem);
  font-weight: 700;
  line-height: 1.35;
  text-align: center;
}

.support-platform-dock {
  display: grid;
  min-width: 0;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
}

.support-platform-chip {
  display: inline-flex;
  min-height: 2.9rem;
  min-width: 0;
  align-items: center;
  justify-content: center;
  gap: 0.72rem;
  border: 1px solid var(--theme-border-strong);
  border-radius: 999px;
  background: var(--landing-surface-soft);
  padding: 0.58rem 0.85rem;
  color: var(--theme-text-soft);
  font-size: clamp(0.96rem, 1.45vw, 1.16rem);
  font-weight: 760;
}

.support-platform-chip .support-icon-frame {
  height: 2rem;
  width: 2rem;
}

@keyframes support-provider-orbit {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@keyframes support-provider-counter-orbit {
  from {
    transform: translate(-50%, -50%) rotate(0deg);
  }

  to {
    transform: translate(-50%, -50%) rotate(-360deg);
  }
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
  padding-top: clamp(4.75rem, 8svh, 7rem);
  padding-bottom: clamp(4.75rem, 8svh, 7rem);
}

.testimonial-section .section-heading h2 {
  color: var(--landing-text-strong);
}

.testimonial-section .section-heading span {
  color: var(--landing-muted);
}

.testimonial-marquee {
  margin-top: clamp(2rem, 4vw, 3.2rem);
  margin-left: calc(50% - 50vw);
  margin-right: calc(50% - 50vw);
  overflow: hidden;
  padding: 0.8rem 0 2rem;
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
  gap: clamp(0.9rem, 1.4vw, 1.3rem);
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
  min-height: clamp(15.5rem, 31svh, 18rem);
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
  min-height: clamp(16.5rem, 34svh, 19rem);
  background: var(--landing-surface-soft);
}

.testimonial-card:nth-child(4n + 3) {
  transform: translateY(0.9rem);
  background: var(--landing-surface-soft);
}

.testimonial-card:nth-child(4n) {
  width: min(20rem, calc(100vw - 2.5rem));
  min-height: clamp(14.5rem, 29svh, 16.5rem);
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

@media (prefers-reduced-motion: reduce) {
  .testimonial-marquee {
    overflow-x: auto;
  }

  .testimonial-track {
    animation: none;
  }

  .support-provider-row,
  .support-provider-chip {
    animation: none;
  }

  .floating-tool-tag {
    transition: none;
    opacity: 1;
    transform: translate3d(
        calc(var(--hero-tag-x) - 50% + var(--hero-tag-field-x)),
        calc(var(--hero-tag-y) - 50% + var(--hero-tag-field-y)),
        0
      ) rotate(var(--hero-tag-angle));
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
  --testimonial-avatar-image: none;
  display: inline-flex;
  height: 2.7rem;
  width: 2.7rem;
  border-radius: 0.8rem;
  flex: 0 0 auto;
  background-image: var(--testimonial-avatar-image);
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

.faq-section {
  padding-top: clamp(4.75rem, 8svh, 6.5rem);
  padding-bottom: clamp(4.75rem, 8svh, 6.5rem);
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
  .hero-section {
    min-height: calc(100svh - clamp(4.25rem, 8vh, 5.4rem));
    padding-top: clamp(3.75rem, 6vh, 4.75rem);
    padding-bottom: clamp(1.4rem, 3.5vh, 2.25rem);
  }

  .hero-stage {
    --hero-copy-safe-width: min(36rem, calc(100vw - 10rem));
    --hero-copy-safe-gap: clamp(1.2rem, 3vw, 2.5rem);
    --hero-copy-offset-y: clamp(-7.25rem, -11svh, -5.25rem);
    min-height: calc(100svh - clamp(8.5rem, 15vh, 10.25rem));
    width: min(100%, calc(100vw - clamp(4.5rem, 8vw, 7rem)));
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
    min-height: calc(100svh - 3.625rem);
    padding-top: 3.75rem;
    padding-bottom: 0;
  }

  .hero-stage {
    --hero-copy-offset-y: clamp(-7rem, -12svh, -5rem);
    min-height: calc(100svh - 7.375rem);
    align-items: center;
    padding-top: clamp(0.75rem, 3.5svh, 2rem);
    padding-bottom: clamp(1rem, 3svh, 2rem);
  }

  .floating-tool-tag {
    --hero-tag-depth: 0px;
    --hero-tag-drift-x: 0px;
    --hero-tag-drift-y: 0px;
    font-size: clamp(0.58rem, 2.7vw, 0.7rem);
    transition: none;
  }

  .floating-tool-tag-text {
    min-width: 0;
    min-height: 0;
    font-size: clamp(0.88rem, 3.6vw, 1.15rem);
  }

  .floating-tool-tag-text .floating-tool-depth {
    padding: 0 clamp(0.78rem, 2.6vw, 1rem);
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
    grid-row: 2;
    grid-column: 1 / -1;
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

  .trust-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .trust-card + .trust-card::before {
    content: none;
  }

  .trust-card {
    min-height: 4.35rem;
  }

  .support-showcase {
    min-height: auto;
  }

  .support-showcase-panel {
    min-height: auto;
    grid-template-columns: minmax(0, 1fr);
    gap: 2rem;
    padding: 4rem 0;
  }

  .support-showcase-copy {
    max-width: none;
  }

  .support-showcase-title {
    font-size: clamp(2rem, 11vw, 3.4rem);
  }

  .support-ecosystem {
    min-height: auto;
    overflow: visible;
    padding: 1rem;
  }

  .support-ecosystem::before,
  .support-ecosystem::after {
    content: none;
  }

  .support-ecosystem-hub {
    position: static;
    min-width: 0;
    transform: none;
    margin-block-end: 0.8rem;
  }

  .support-provider-row {
    position: static;
    display: grid;
    gap: 0.7rem;
    animation: none;
  }

  .support-provider-chip {
    position: static;
    justify-content: center;
    transform: none;
    animation: none;
  }

  .support-platform-row {
    position: static;
    margin-top: 1rem;
  }

  .support-platform-row p {
    max-width: none;
    text-align: center;
  }

  .support-platform-dock {
    grid-template-columns: minmax(0, 1fr);
  }

  .support-platform-chip {
    width: 100%;
  }

  .hero-copy h1 {
    font-size: clamp(2rem, 10vw, 2.85rem);
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

@media (max-width: 640px) and (max-height: 720px) {
  .hero-section {
    padding-top: 3.6rem;
    padding-bottom: 0;
  }

  .hero-stage {
    --hero-copy-offset-y: clamp(-6.25rem, -12svh, -4.5rem);
    min-height: calc(100svh - 7.225rem);
    padding-top: clamp(0.75rem, 3.5svh, 1.5rem);
    padding-bottom: clamp(0.75rem, 3svh, 1.25rem);
  }

  .floating-tool-tag-text {
    min-width: 0;
    min-height: 0;
    font-size: clamp(0.82rem, 3.25vw, 1.02rem);
  }

  .hero-copy h1 {
    margin-top: 0.5rem;
    font-size: clamp(1.8rem, 9.1vw, 2.45rem);
  }

  .hero-lede {
    margin-top: 0.75rem;
    font-size: 0.94rem;
    line-height: 1.5;
  }

  .hero-actions {
    margin-top: 1rem;
    width: 100%;
    flex-wrap: nowrap;
    gap: 0.55rem;
  }

  .hero-button {
    width: auto;
    flex: 1 1 0;
    min-height: 2.8rem;
    padding: 0 0.62rem;
    font-size: 0.86rem;
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
    padding-top: 3.6rem;
  }

  .hero-stage {
    --hero-copy-offset-y: clamp(-5.5rem, -10svh, -4.25rem);
  }

  .trust-card {
    min-height: 6.4rem;
    padding: 1.1rem 1.15rem;
  }

}
</style>
