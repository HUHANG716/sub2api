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
            <span class="block truncate text-xs text-slate-400">AI 开发者工作台</span>
          </span>
        </router-link>

        <div class="landing-nav-links hidden items-center gap-8 text-sm font-medium text-slate-300 md:flex">
          <a href="#features" class="transition hover:text-white">能力</a>
          <a href="#testimonials" class="transition hover:text-white">用户评价</a>
          <a href="#faq" class="transition hover:text-white">常见问题</a>
          <a href="#contact" class="transition hover:text-white">联系我们</a>
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
            {{ isAuthenticated ? t('home.dashboard') : '登录' }}
          </router-link>
        </div>
      </nav>
    </header>

    <main>
      <section class="hero-section px-5 pb-16 pt-14 sm:px-6 sm:pb-20 sm:pt-20 lg:px-8">
        <div class="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div class="hero-copy">
            <span class="object-accent command" :style="assetSpriteStyle(objectSprite, '0% 0%')" aria-hidden="true"></span>
            <p class="eyebrow">AI Code Workspace</p>
            <h1>
              <span class="hero-brand-title">{{ siteName }}</span>
              <span>重构您的</span>
              <span>AI 编程体验</span>
            </h1>
            <p class="hero-lede">
              {{ siteSubtitle }}
              <span>把 AI 编程、使用管理与团队协作整合到一个软件平台，让团队专注产品本身。</span>
            </p>

            <div class="mt-8 flex flex-col gap-3 sm:flex-row">
              <router-link :to="isAuthenticated ? dashboardPath : '/login'" class="hero-button">
                {{ isAuthenticated ? '进入工作台' : '立即体验' }}
                <Icon name="arrowRight" size="sm" />
              </router-link>
              <a v-if="docUrl" :href="docUrl" target="_blank" rel="noopener noreferrer" class="hero-button secondary">
                查看文档
                <Icon name="externalLink" size="sm" />
              </a>
            </div>

            <div class="hero-points" aria-label="服务亮点">
              <div v-for="item in heroPoints" :key="item.title">
                <span>{{ item.title }}</span>
                <strong>{{ item.text }}</strong>
              </div>
            </div>
          </div>

          <div class="hero-console" aria-label="AI 开发者工作台预览">
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
                <span>今日任务</span>
                <strong>24,819</strong>
                <em>稳定处理中</em>
              </div>
              <div class="metric-panel accent">
                <span>响应状态</span>
                <strong>99.9%</strong>
                <em>服务可用</em>
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
            <p>Developer Platform</p>
            <h2>一个入口，组织起日常 AI 研发工作</h2>
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
            <p>用户评价</p>
            <h2>用户怎么说</h2>
            <span>来自开发者、架构师和研发负责人的真实使用反馈。</span>
          </div>

          <div class="testimonial-marquee" aria-label="用户评价列表">
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
            <h2>有疑问？我们来解答</h2>
            <span>围绕接入、稳定性、团队管理和上手体验整理了最常见的问题。</span>
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
                <span class="block text-xs text-slate-400">面向开发者的 AI 编程工作台</span>
              </span>
            </div>
            <p class="mt-5 max-w-md text-sm leading-7 text-slate-400">
              为个人开发者和团队提供统一的 AI 开发入口、使用管理、稳定保障与技术支持。
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
          <span>Operated for AI developer workflows</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
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

const siteName = computed(() => appStore.cachedPublicSettings?.site_name || appStore.siteName || 'Sub2API')
const siteLogo = computed(() => appStore.cachedPublicSettings?.site_logo || appStore.siteLogo || '')
const siteSubtitle = computed(() => appStore.cachedPublicSettings?.site_subtitle || '稳定、清晰、适合团队协作的 AI 编程平台。')
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

const heroPoints = [
  { title: '高效工作台', text: '统一管理 AI 编码任务、密钥与使用体验' },
  { title: '稳定体验', text: '流畅响应、可靠交付，适合日常开发协作' },
  { title: '专业服务', text: '工程师支持与方案建议，问题有人接住' }
]

const consoleLines = [
  'connected: claude-code / codex / gemini-cli',
  'workspace policy synced',
  'routing requests through healthy channels',
  'usage report generated in 312ms'
]

const routingRows = [
  { name: 'Code Assist', status: 'active' },
  { name: 'Team Keys', status: 'synced' },
  { name: 'Usage Guard', status: 'online' }
]

const trustStats = [
  { value: '10,000+', label: '开发者用户' },
  { value: '99.9%', label: '服务稳定性' },
  { value: '500 万+', label: '任务处理次数' },
  { value: '1v1', label: '专属技术支持' }
]

const testimonialAvatarSprite = '/testimonial-avatar-sprite.png'
const iconSprite = '/landing-assets/icon-sprite.png'
const featureVisualSprite = '/landing-assets/feature-visual-sprite.png'
const objectSprite = '/landing-assets/object-sprite.png'

const featureCards: Array<{
  iconPosition: string
  visualPosition: string
  index: string
  title: string
  description: string
}> = [
  {
    iconPosition: '0% 0%',
    visualPosition: '0% 0%',
    index: '01',
    title: '统一接入开发工具',
    description: '把常用 AI 编程工具接到一个入口，减少账号、密钥和配置在团队间散落。'
  },
  {
    iconPosition: '33.333% 0%',
    visualPosition: '100% 0%',
    index: '02',
    title: '团队协作更清晰',
    description: '围绕成员、权限、分组和使用记录建立共享视图，协作时少一点猜测。'
  },
  {
    iconPosition: '66.666% 0%',
    visualPosition: '0% 100%',
    index: '03',
    title: '稳定性优先',
    description: '通过通道监控、失败切换和用量保护，让高频开发场景更稳。'
  },
  {
    iconPosition: '100% 33.333%',
    visualPosition: '100% 100%',
    index: '04',
    title: '用量透明可追踪',
    description: '关键消耗、调用状态与趋势沉淀为可读报表，方便复盘和管理。'
  }
]

const testimonials = [
  {
    quote: '接入之后，团队里的 AI 编程流程终于统一了。大家不用反复问密钥和通道配置，开发节奏明显顺了。',
    name: '周予',
    avatarPosition: '0% 0%',
    role: '研发团队负责人 @ SaaS 公司'
  },
  {
    quote: '我最喜欢的是稳定性和可观测性。出问题时能快速定位，日常使用也不会因为工具切换打断思路。',
    name: 'Mia Chen',
    avatarPosition: '33.333% 0%',
    role: '全栈工程师 @ 出海团队'
  },
  {
    quote: '对独立开发者很友好。配置简单，文档清楚，把更多精力留给产品本身，而不是维护一堆零散工具。',
    name: '林川',
    avatarPosition: '66.666% 0%',
    role: '独立开发者'
  },
  {
    quote: '团队成员的使用情况变得可见，权限边界也更清楚。对研发管理来说，这是很踏实的基础设施。',
    name: 'Eva Liu',
    avatarPosition: '100% 0%',
    role: 'AI 产品经理 @ 科技公司'
  },
  {
    quote: '客服和技术支持响应很快，遇到接入细节可以直接沟通。上线前后都有人帮忙兜住关键问题。',
    name: '何工',
    avatarPosition: '0% 100%',
    role: '前端架构师 @ 本地生活平台'
  },
  {
    quote: '我们把多个开发工具的调用收敛到这里后，团队协作成本下降很多，财务和技术侧都更容易对齐。',
    name: 'Kevin Zhao',
    avatarPosition: '33.333% 100%',
    role: '后端工程师 @ 电商平台'
  },
  {
    quote: '高峰期也能保持稳定，路由和监控能力很实用。它不像玩具，更像能长期放进工作流里的系统。',
    name: '吴可',
    avatarPosition: '66.666% 100%',
    role: '研发总监 @ 金融科技公司'
  },
  {
    quote: '新同事上手速度快了很多。我们只维护一套入口和说明，团队里的 AI 编程习惯也更一致。',
    name: 'Sarah Lin',
    avatarPosition: '100% 100%',
    role: '移动端负责人 @ 创业公司'
  }
]

const faqItems = [
  {
    question: `${siteName.value} 适合什么团队？`,
    answer: '适合已经在日常研发中使用 AI 编程工具，希望统一入口、权限、使用记录和稳定性保障的个人开发者或团队。'
  },
  {
    question: '为什么不直接让每个人各自配置工具？',
    answer: '个人配置在小规模时很快，但团队协作会遇到密钥分散、权限不清、消耗不可见和排障困难等问题。统一入口能降低这些长期成本。'
  },
  {
    question: '服务稳定性如何保障？',
    answer: '平台围绕通道状态、请求路由、失败处理和用量记录做持续监控，让高频调用场景更可控。'
  },
  {
    question: '如何开始使用？',
    answer: '登录后进入工作台，按文档完成基础配置即可开始接入。团队场景可以先整理成员、分组和常用开发工具。'
  }
]

const footerGroups = computed<FooterGroup[]>(() => [
  {
    title: '产品',
    items: [
      { label: '能力', href: '#features' },
      { label: '用户评价', href: '#testimonials' },
      ...(docUrl.value ? [{ label: '文档', href: docUrl.value }] : [])
    ]
  },
  {
    title: '支持',
    items: [
      { label: '常见问题', href: '#faq' },
      { label: '登录工作台', to: '/login' },
      { label: '联系我们', href: '#contact' }
    ]
  },
  {
    title: '场景',
    items: [
      { label: 'AI 编程协作' },
      { label: '团队用量管理' },
      { label: '开发工具接入' }
    ]
  },
  {
    title: '法律',
    items: [
      { label: '隐私政策', to: '/legal/privacy' },
      { label: '服务条款', to: '/legal/terms' },
      { label: '退款政策', to: '/legal/refund' }
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
</script>

<style scoped>
.landing-shell {
  background:
    radial-gradient(circle at 14% 8%, rgba(249, 115, 22, 0.14), transparent 24rem),
    linear-gradient(180deg, #172033 0%, #111827 46%, #162033 100%);
}

.landing-header {
  position: sticky;
  top: 0;
  z-index: 30;
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(17, 24, 39, 0.86);
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
  background: #1f2937;
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
  background: rgba(31, 41, 55, 0.72);
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
  box-shadow: 0 8px 24px rgba(249, 115, 22, 0.24);
}

.hero-section {
  position: relative;
  isolation: isolate;
}

.hero-section::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background:
    linear-gradient(90deg, rgba(17, 24, 39, 0.2) 0%, rgba(17, 24, 39, 0.18) 42%, rgba(17, 24, 39, 0.5) 100%),
    url('/landing-assets/hero-texture.png') center / cover no-repeat;
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
  box-shadow: 0 16px 34px rgba(249, 115, 22, 0.26);
}

.hero-button.secondary {
  border: 1px solid rgba(148, 163, 184, 0.2);
  background: #1f2937;
  color: #f5f5f5;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
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
  background: #172033;
  box-shadow: 0 24px 70px rgba(17, 24, 39, 0.28);
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
  filter: drop-shadow(0 18px 26px rgba(15, 23, 42, 0.32));
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
  background: #1f2937;
}

.command-panel {
  grid-column: span 2;
  min-height: 18rem;
  padding: 1.25rem;
  background: #111827;
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
    rgba(23, 32, 51, 0.74);
}

.trust-strip {
  display: grid;
  overflow: hidden;
  border-radius: 0.5rem;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.045), transparent),
    rgba(31, 41, 55, 0.46);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 18px 46px rgba(15, 23, 42, 0.2);
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
  background:
    radial-gradient(circle at 14% 16%, rgba(249, 115, 22, 0.22), transparent 14rem),
    linear-gradient(135deg, rgba(31, 41, 55, 0.95), rgba(23, 32, 51, 0.72));
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.07),
    0 22px 52px rgba(15, 23, 42, 0.22);
}

.feature-panel::after {
  content: '';
  position: absolute;
  inset: auto -18% -42% 44%;
  height: 12rem;
  border-radius: 999px;
  background: rgba(249, 115, 22, 0.12);
  filter: blur(28px);
}

.feature-card:nth-child(2) .feature-panel {
  background:
    radial-gradient(circle at 82% 12%, rgba(56, 189, 248, 0.18), transparent 13rem),
    linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(31, 41, 55, 0.8));
}

.feature-card:nth-child(3) .feature-panel {
  background:
    radial-gradient(circle at 12% 84%, rgba(52, 211, 153, 0.16), transparent 13rem),
    linear-gradient(140deg, rgba(22, 32, 51, 0.96), rgba(30, 41, 59, 0.78));
}

.feature-card:nth-child(4) .feature-panel {
  background:
    radial-gradient(circle at 80% 76%, rgba(251, 191, 36, 0.16), transparent 13rem),
    linear-gradient(135deg, rgba(31, 41, 55, 0.93), rgba(17, 24, 39, 0.78));
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
  filter: drop-shadow(0 14px 24px rgba(15, 23, 42, 0.24));
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
  filter: drop-shadow(0 28px 40px rgba(15, 23, 42, 0.3));
}

.testimonial-section {
  position: relative;
  isolation: isolate;
  border-top: 1px solid rgba(148, 163, 184, 0.16);
  border-bottom: 1px solid rgba(148, 163, 184, 0.16);
  background:
    linear-gradient(180deg, rgba(24, 34, 53, 0.82), rgba(24, 34, 53, 0.9)),
    url('/landing-assets/testimonial-texture.png') center / cover no-repeat,
    #182235;
  color: #f5f5f5;
}

.testimonial-section .section-heading h2 {
  color: #ffffff;
}

.testimonial-section .section-heading span {
  color: #a3a3a3;
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
  background: linear-gradient(90deg, rgba(24, 34, 53, 0.96) 0%, rgba(24, 34, 53, 0) 100%);
}

.testimonial-marquee::after {
  right: 0;
  background: linear-gradient(270deg, rgba(24, 34, 53, 0.96) 0%, rgba(24, 34, 53, 0) 100%);
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
  color: #f5f5f5;
  border-radius: 0.5rem;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.06), transparent 38%),
    rgba(31, 41, 55, 0.68);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.06),
    0 18px 42px rgba(15, 23, 42, 0.2);
}

.testimonial-card:nth-child(4n + 2) {
  width: min(24rem, calc(100vw - 3rem));
  min-height: 18rem;
  background:
    radial-gradient(circle at 12% 18%, rgba(249, 115, 22, 0.16), transparent 12rem),
    rgba(23, 32, 51, 0.76);
}

.testimonial-card:nth-child(4n + 3) {
  transform: translateY(1.25rem);
  background:
    linear-gradient(180deg, rgba(15, 23, 42, 0.26), transparent),
    rgba(30, 41, 59, 0.62);
}

.testimonial-card:nth-child(4n) {
  width: min(20rem, calc(100vw - 3rem));
  min-height: 15rem;
  transform: translateY(-0.9rem);
  background:
    radial-gradient(circle at 88% 78%, rgba(56, 189, 248, 0.13), transparent 11rem),
    rgba(31, 41, 55, 0.62);
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
  color: #a3a3a3;
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
    linear-gradient(180deg, rgba(17, 24, 39, 0.86), rgba(17, 24, 39, 0.96)),
    url('/landing-assets/footer-texture.png') center / cover no-repeat,
    #111827;
}

.landing-footer::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: -1;
  background: radial-gradient(circle at 16% 20%, rgba(249, 115, 22, 0.12), transparent 20rem);
  pointer-events: none;
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
    font-size: 2.75rem;
  }
}
</style>
