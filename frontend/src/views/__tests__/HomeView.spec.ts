import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import HomeView from '@/views/HomeView.vue'

const homeViewSourcePath = path.resolve(process.cwd(), 'src/views/HomeView.vue')
const globalStyleSourcePath = path.resolve(process.cwd(), 'src/style.css')
const indexHtmlSourcePath = path.resolve(process.cwd(), 'index.html')

const { authState, appState } = vi.hoisted(() => ({
  authState: {
    isAuthenticated: false,
    isAdmin: false,
    user: null,
    checkAuth: vi.fn()
  },
  appState: {
    cachedPublicSettings: {
      site_name: 'Hahacode',
      site_logo: '',
      site_subtitle: 'AI 编程开发工作台',
      doc_url: 'https://docs.example.com',
      home_content: ''
    },
    siteName: 'Hahacode',
    siteLogo: '',
    docUrl: 'https://docs.example.com',
    publicSettingsLoaded: true,
    fetchPublicSettings: vi.fn()
  }
}))

vi.mock('@/stores', () => ({
  useAuthStore: () => authState,
  useAppStore: () => appState
}))

vi.mock('vue-i18n', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-i18n')>()
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, params?: Record<string, string>) => {
        const messages: Record<string, string> = {
          'home.viewDocs': '查看文档',
          'home.dashboard': '控制台',
          'home.login': '登录',
          'home.getStarted': '立即开始',
          'home.goToDashboard': '进入控制台',
          'home.docs': '文档',
          'home.footer.allRightsReserved': '保留所有权利',
          'home.modern.navTagline': 'AI 开发者工作台',
          'home.modern.nav.features': '能力',
          'home.modern.nav.testimonials': '用户评价',
          'home.modern.nav.faq': '常见问题',
          'home.modern.nav.contact': '联系我们',
          'home.modern.hero.eyebrow': 'AI API Gateway',
          'home.modern.hero.line1': '一个入口',
          'home.modern.hero.line2': '接入主流 AI 模型',
          'home.modern.hero.subtitle': 'OpenAI 兼容接口，统一接入 Claude、GPT、Gemini 等模型。',
          'home.modern.hero.description': '一个 API Key 连接 Claude Code、Codex、Gemini CLI 等开发工具，密钥、用量和账单都在同一处管理。',
          'home.modern.hero.pointsLabel': '服务亮点',
          'home.modern.hero.points.workspace.title': '高效工作台',
          'home.modern.hero.points.workspace.text': '统一管理 AI 编码任务、密钥与使用体验',
          'home.modern.hero.points.reliability.title': '稳定体验',
          'home.modern.hero.points.reliability.text': '流畅响应、可靠交付，适合日常开发协作',
          'home.modern.hero.points.support.title': '专业服务',
          'home.modern.hero.points.support.text': '工程师支持与方案建议，问题有人接住',
          'home.modern.console.previewLabel': 'AI 开发者工作台预览',
          'home.modern.console.tasksLabel': '今日任务',
          'home.modern.console.tasksCaption': '稳定处理中',
          'home.modern.console.statusLabel': '响应状态',
          'home.modern.console.statusCaption': '服务可用',
          'home.modern.console.lines.connected': '# Routing to upstream...',
          'home.modern.console.lines.policy': '200 OK',
          'home.modern.console.lines.routing': '',
          'home.modern.console.lines.report': '{ "content": "Hello!" }',
          'home.modern.console.routes.codeAssist': '代码辅助',
          'home.modern.console.routes.teamKeys': '团队密钥',
          'home.modern.console.routes.usageGuard': '用量保护',
          'home.modern.console.status.active': '运行中',
          'home.modern.console.status.synced': '已同步',
          'home.modern.console.status.online': '在线',
          'home.modern.stats.developers': '开发者用户',
          'home.modern.stats.uptime': '服务稳定性',
          'home.modern.stats.taskValue': '500 万+',
          'home.modern.stats.tasks': '任务处理次数',
          'home.modern.stats.support': '专属技术支持',
          'home.modern.supportShowcase.titlePrefix': '智能时代的',
          'home.modern.supportShowcase.titleCore': 'Harness Engineering',
          'home.modern.supportShowcase.titleAccent': '聚焦创意的实现',
          'home.modern.supportShowcase.supports': '同时支持',
          'home.modern.supportShowcase.platformIntro': '一键轻松在以下平台体验：',
          'home.modern.testimonials.eyebrow': '用户评价',
          'home.modern.testimonials.title': '用户怎么说',
          'home.modern.testimonials.description': '来自开发者、架构师和研发负责人的真实使用反馈。',
          'home.modern.testimonials.listLabel': '用户评价列表',
          'home.modern.reviews.one.quote': '接入之后，团队里的 AI 编程流程终于统一了。',
          'home.modern.reviews.one.name': '周予',
          'home.modern.reviews.one.role': '研发团队负责人 @ SaaS 公司',
          'home.modern.reviews.two.quote': '我最喜欢的是稳定性和可观测性。',
          'home.modern.reviews.two.name': 'Mia Chen',
          'home.modern.reviews.two.role': '全栈工程师 @ 出海团队',
          'home.modern.reviews.three.quote': '对独立开发者很友好。',
          'home.modern.reviews.three.name': '林川',
          'home.modern.reviews.three.role': '独立开发者',
          'home.modern.reviews.four.quote': '团队成员的使用情况变得可见。',
          'home.modern.reviews.four.name': 'Eva Liu',
          'home.modern.reviews.four.role': 'AI 产品经理 @ 科技公司',
          'home.modern.reviews.five.quote': '客服和技术支持响应很快。',
          'home.modern.reviews.five.name': '何工',
          'home.modern.reviews.five.role': '前端架构师 @ 本地生活平台',
          'home.modern.reviews.six.quote': '团队协作成本下降很多。',
          'home.modern.reviews.six.name': 'Kevin Zhao',
          'home.modern.reviews.six.role': '后端工程师 @ 电商平台',
          'home.modern.reviews.seven.quote': '高峰期也能保持稳定。',
          'home.modern.reviews.seven.name': '吴可',
          'home.modern.reviews.seven.role': '研发总监 @ 金融科技公司',
          'home.modern.reviews.eight.quote': '新同事上手速度快了很多。',
          'home.modern.reviews.eight.name': 'Sarah Lin',
          'home.modern.reviews.eight.role': '移动端负责人 @ 创业公司',
          'home.modern.faq.title': '有疑问？我们来解答',
          'home.modern.faq.description': '围绕接入、稳定性、团队管理和上手体验整理了最常见的问题。',
          'home.modern.faq.items.fit.question': `${params?.siteName ?? 'Hahacode'} 适合什么团队？`,
          'home.modern.faq.items.fit.answer': '适合已经在日常研发中使用 AI 编程工具的团队。',
          'home.modern.faq.items.individual.question': '为什么不直接让每个人各自配置工具？',
          'home.modern.faq.items.individual.answer': '统一入口能降低长期成本。',
          'home.modern.faq.items.stability.question': '服务稳定性如何保障？',
          'home.modern.faq.items.stability.answer': '平台围绕通道状态和请求路由做持续监控。',
          'home.modern.faq.items.start.question': '如何开始使用？',
          'home.modern.faq.items.start.answer': '登录后进入工作台，按文档完成基础配置即可开始接入。',
          'home.modern.footer.tagline': '面向开发者的 AI 编程工作台',
          'home.modern.footer.description': '为个人开发者和团队提供统一的 AI 开发入口。',
          'home.modern.footer.operator': '为 AI 开发工作流而运营',
          'home.modern.footer.loginWorkspace': '登录工作台',
          'home.modern.footer.groups.product': '产品',
          'home.modern.footer.groups.support': '支持',
          'home.modern.footer.groups.scenes': '场景',
          'home.modern.footer.groups.legal': '法律',
          'home.modern.footer.scenes.coding': 'AI 编程协作',
          'home.modern.footer.scenes.usage': '团队用量管理',
          'home.modern.footer.scenes.tools': '开发工具接入',
          'home.modern.footer.legal.privacy': '隐私政策',
          'home.modern.footer.legal.terms': '服务条款',
          'home.modern.footer.legal.refund': '退款政策'
        }
        return messages[key] ?? key
      }
    })
  }
})

describe('HomeView', () => {
  beforeEach(() => {
    authState.checkAuth.mockClear()
    appState.fetchPublicSettings.mockClear()
    appState.cachedPublicSettings.home_content = ''
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn()
      }))
    })
    document.documentElement.classList.remove('dark')
    document.documentElement.classList.remove('landing-page-active')
    document.body.classList.remove('landing-page-active')
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 0
    })
    localStorage.clear()
  })

  it('renders the landing page with testimonials and footer while omitting pricing sections', () => {
    const wrapper = mount(HomeView, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a><slot /></a>'
          },
          LocaleSwitcher: true,
          Icon: true
        }
      }
    })

    const text = wrapper.text()

    expect(text).toContain('用户怎么说')
    expect(text).toContain('研发团队')
    expect(text).toContain('©')
    expect(text).not.toContain('套餐订阅')
    expect(text).not.toContain('灵活额度')
    expect(wrapper.get('.landing-shell').classes()).not.toContain('text-white')
    expect(wrapper.get('.landing-nav-links').classes()).not.toContain('text-slate-300')
    expect(wrapper.get('.landing-footer').classes()).not.toContain('text-slate-300')
    expect(wrapper.findAll('.brand-tagline')).toHaveLength(2)
    expect(wrapper.find('.footer-description').exists()).toBe(true)
    expect(wrapper.html()).not.toContain('home.switchToDark')
    expect(wrapper.html()).not.toContain('home.switchToLight')
    expect(wrapper.html()).not.toContain('text-gray-900')
    expect(wrapper.html()).not.toContain('text-gray-600')
    expect(wrapper.find('.testimonial-marquee').exists()).toBe(true)
    expect(wrapper.find('[aria-hidden="true"]').exists()).toBe(true)
    expect(wrapper.findAll('.avatar-photo')).toHaveLength(16)
    expect(wrapper.html()).toContain('testimonial-avatar-sprite.png')
    expect(wrapper.html()).not.toContain('/landing-assets/icon-sprite.png')
    expect(wrapper.html()).not.toContain('/landing-assets/feature-visual-sprite.png')
    expect(wrapper.html()).not.toContain('/landing-assets/object-sprite.png')
    expect(wrapper.find('.support-showcase').exists()).toBe(true)
    expect(wrapper.get('#features').classes()).toContain('support-showcase')
    expect(wrapper.findAll('.support-provider-chip')).toHaveLength(5)
    expect(wrapper.findAll('.support-platform-chip')).toHaveLength(3)
    expect(wrapper.html()).toContain('/landing-support/claude-code.svg')
    expect(wrapper.html()).toContain('/landing-support/codex.svg')
    expect(wrapper.html()).toContain('/landing-support/gemini-cli.svg')
    expect(wrapper.html()).toContain('/landing-support/openclaw.svg')
    expect(wrapper.html()).toContain('/landing-support/hermes-agent.svg')
    expect(wrapper.html()).toContain('/landing-support/macos.svg')
    expect(wrapper.html()).toContain('/landing-support/windows.svg')
    expect(wrapper.html()).toContain('/landing-support/linux.svg')
    expect(wrapper.findAll('.support-provider-chip .support-icon-frame-backed')).toHaveLength(1)
    expect(wrapper.findAll('.support-platform-chip .support-icon-frame-backed')).toHaveLength(3)
  })

  it('keeps compact dashboard and docs entrances in the landing header', () => {
    const wrapper = mount(HomeView, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>'
          },
          LocaleSwitcher: true,
          Icon: true
        }
      }
    })

    const headerActions = wrapper.get('.landing-header-actions')
    const heroLinks = wrapper.findAll('.hero-button')
    const headerDocsLink = headerActions.get('.landing-docs-action')
    const headerPrimaryLink = headerActions.get('.primary-action')

    expect(headerDocsLink.text()).toContain('查看文档')
    expect(headerDocsLink.attributes('href')).toBe('/docs')
    expect(headerPrimaryLink.text().trim()).not.toBe('')
    expect(headerPrimaryLink.attributes('href')).toBe('/login')
    expect(heroLinks).toHaveLength(2)
    expect(heroLinks[0].text().trim()).not.toBe('')
    expect(heroLinks[0].attributes('href')).toBe('/login')
    expect(heroLinks[1].text()).toContain('查看文档')
    expect(heroLinks[1].attributes('href')).toBe('/docs')
  })

  it('keeps restored landing header actions compact and secondary to the hero CTAs', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')
    const docsActionBlock = source.match(/\.landing-docs-action\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const primaryActionBlock = source.match(/\.primary-action\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const mobileBlock = source.match(/@media \(max-width: 640px\)\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(docsActionBlock).toContain('min-height: var(--landing-nav-control-height)')
    expect(docsActionBlock).toContain('padding: 0 0.62rem')
    expect(docsActionBlock).toContain('background: transparent')
    expect(primaryActionBlock).toContain('padding: 0 0.78rem')
    expect(primaryActionBlock).toContain('font-size: 0.8125rem')
    expect(mobileBlock).toContain('.landing-docs-action')
    expect(mobileBlock).toContain('display: none')
  })

  it('keeps hero action icons vertically centered with their labels', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')
    const heroButtonBlocks = Array.from(source.matchAll(/\.hero-button\s*\{[\s\S]*?\n\}/g), (match) => match[0])
    const heroButtonBlock = heroButtonBlocks.find((block) => block.includes('min-height: 3.125rem')) ?? ''
    const heroActionsBlock = source.match(/\.hero-actions\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const heroButtonIconBlock = source.match(/\.hero-button :deep\(svg\)\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const heroButtonTextBlock = source.match(/\.hero-button span\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(source).toContain('<span>{{ isAuthenticated ? t(\'home.goToDashboard\') : t(\'home.getStarted\') }}</span>')
    expect(source).toContain('<span>{{ t(\'home.viewDocs\') }}</span>')
    expect(heroActionsBlock).toContain('justify-self: center')
    expect(heroActionsBlock).toContain('align-items: center')
    expect(heroActionsBlock).toContain('width: fit-content')
    expect(heroButtonBlock).toContain('display: inline-flex')
    expect(heroButtonBlock).toContain('align-items: center')
    expect(heroButtonBlock).toContain('justify-content: center')
    expect(heroButtonBlock).toContain('line-height: 1')
    expect(heroButtonIconBlock).toContain('display: block')
    expect(heroButtonIconBlock).toContain('flex: 0 0 auto')
    expect(heroButtonTextBlock).toContain('line-height: 1')
  })

  it('renders a fullscreen hero with floating AI tool tags instead of the terminal preview', () => {
    const wrapper = mount(HomeView, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a><slot /></a>'
          },
          LocaleSwitcher: true,
          Icon: true
        }
      }
    })

    const floatingTags = wrapper.findAll('.floating-tool-tag')

    expect(wrapper.find('.hero-stage').exists()).toBe(true)
    expect(wrapper.find('.hero-floating-tags').exists()).toBe(true)
    expect(wrapper.find('.hero-copy .eyebrow').exists()).toBe(false)
    expect(wrapper.text()).not.toContain('AI API Gateway')
    expect(floatingTags).toHaveLength(7)
    expect(floatingTags.map((tag) => tag.text())).toEqual([
      'Claude Code',
      'Codex',
      'Gemini CLI',
      'OpenAI',
      'OpenClaw',
      'Hermes Agent',
      'Codex App'
    ])
    expect(wrapper.html()).toContain('/landing-support/claude-code.svg')
    expect(wrapper.html()).toContain('/landing-support/codex.svg')
    expect(wrapper.html()).toContain('/landing-support/gemini-cli.svg')
    expect(wrapper.html()).toContain('/landing-support/codex-app.png')
    expect(wrapper.get('.floating-tool-tag-4').classes()).toContain('floating-tool-tag-text')
    expect(wrapper.get('.floating-tool-tag-4').find('img').exists()).toBe(false)
    expect(wrapper.find('.hero-console').exists()).toBe(false)
    expect(wrapper.find('.command-panel').exists()).toBe(false)
    expect(wrapper.find('.code-lines').exists()).toBe(false)
    expect(wrapper.find('.metric-panel').exists()).toBe(false)
    expect(wrapper.find('.route-panel').exists()).toBe(false)
  })

  it('moves the floating hero tool field with the mouse direction without shifting individual collision boxes', async () => {
    const wrapper = mount(HomeView, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a><slot /></a>'
          },
          LocaleSwitcher: true,
          Icon: true
        }
      }
    })

    await wrapper.get('.hero-section').trigger('mousemove', {
      clientX: 900,
      clientY: 540
    })
    await nextTick()

    const stageStyle = wrapper.get('.hero-stage').attributes('style') ?? ''
    const source = readFileSync(homeViewSourcePath, 'utf8')
    const floatingFieldBlock = source.match(/\.hero-floating-tags\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const floatingTagBlock = source.match(/\.floating-tool-tag\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const tagStyle = wrapper.get('.floating-tool-tag').attributes('style') ?? ''

    expect(stageStyle).toContain('--hero-pointer-x:')
    expect(stageStyle).toContain('--hero-pointer-y:')
    expect(stageStyle).not.toContain('--hero-pointer-x: 0.000')
    expect(floatingFieldBlock).not.toContain('calc(var(--hero-pointer-x) * var(--hero-field-pull-x))')
    expect(floatingTagBlock).toContain('calc(var(--hero-pointer-x) * var(--hero-tag-drift-x))')
    expect(floatingTagBlock).toContain('calc(var(--hero-pointer-y) * var(--hero-tag-drift-y))')
    expect(tagStyle).toBe('')

    await wrapper.get('.hero-section').trigger('mouseleave')
    await nextTick()

    expect(wrapper.get('.hero-stage').attributes('style')).toContain('--hero-pointer-x: 0.000')
    expect(wrapper.get('.hero-stage').attributes('style')).toContain('--hero-pointer-y: 0.000')
  })

  it('keeps hero sticker collision boxes stable with depth-based parallax lanes', () => {
    const source = readFileSync(homeViewSourcePath, 'utf8')
    const floatingTagBlock = source.match(/\.floating-tool-tag\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const floatingFieldBlock = source.match(/\.hero-floating-tags\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const mobileBlock = source.match(/@media \(max-width: 640px\)[\s\S]*?\n\}/)?.[0] ?? ''

    expect(source).not.toContain(':style="heroTagStyle(index)"')
    expect(source).not.toContain('const heroTagParallax')
    expect(source).not.toContain('function heroTagStyle')
    expect(floatingTagBlock).toContain('transform: translate3d(')
    expect(floatingTagBlock).toContain('var(--hero-pointer-x) * var(--hero-tag-drift-x')
    expect(floatingTagBlock).toContain('var(--hero-pointer-y) * var(--hero-tag-drift-y')
    expect(floatingTagBlock).toContain('animation: hero-tag-float')
    expect(floatingTagBlock).toContain('animation-delay: var(--hero-tag-delay, 0ms)')
    expect(floatingFieldBlock).not.toContain('--hero-field-pull-x')
    expect(floatingFieldBlock).not.toContain('--hero-field-pull-y')
    expect(floatingFieldBlock).not.toContain('transform: translate3d(')
    expect(source).toContain('width: min(100%, calc(100vw - 2rem))')
    expect(source).toContain('max-width: none')
    expect(source).toContain('min-height: calc(100svh - 5.5rem)')
    expect(source).toContain('left: clamp(-1.1rem, -0.6vw, -0.5rem)')
    expect(source).toContain('right: calc(100% - var(--hero-copy-safe-left) + var(--hero-copy-safe-gap))')
    expect(source).toContain('top: clamp(10.5rem, 28vh, 19rem)')
    expect(source).toContain('top: clamp(4.75rem, 13vh, 8.5rem)')
    expect(source).toContain('right: calc(100% - var(--hero-copy-safe-left) + var(--hero-copy-safe-gap))')
    expect(source).toContain('bottom: clamp(7.25rem, 12vh, 9.5rem)')
    expect(source).toContain('right: clamp(0.75rem, 3vw, 5rem)')
    expect(source).toContain('left: calc(var(--hero-copy-safe-right) + var(--hero-copy-safe-gap))')
    expect(source).toContain('top: clamp(1.5rem, 6vh, 4rem)')
    expect(source).toContain('top: clamp(14rem, 32vh, 21rem)')
    expect(source).toContain('bottom: clamp(16rem, 31vh, 21rem)')
    expect(source).toContain('.floating-tool-tag-7')
    expect(source).toContain('--hero-tag-drift-x: 34px')
    expect(source).toContain('--hero-tag-drift-x: 9px')
    expect(source).toContain('--hero-tag-drift-y: 28px')
    expect(source).not.toContain('left: clamp(-10rem, -7vw, -4rem)')
    expect(source).not.toContain('top: 34%')
    expect(source).not.toContain('bottom: clamp(0.9rem, 2vw, 1.5rem)')
    expect(source).not.toContain('top: clamp(18rem, 38vh, 24rem)')
    expect(source).not.toContain('bottom: clamp(1.5rem, 5vh, 3.5rem)')
    expect(mobileBlock).toContain('left: -2.2rem')
    expect(mobileBlock).toContain('top: -4.4rem')
    expect(mobileBlock).toContain('top: 30%')
    expect(mobileBlock).toContain('right: -3.2rem')
    expect(mobileBlock).toContain('top: 68%')
    expect(mobileBlock).toContain('left: -1.6rem')
    expect(mobileBlock).toContain('bottom: 2.6rem')
    expect(mobileBlock).not.toContain('left: -3.6rem')
    expect(mobileBlock).not.toContain('right: -4.4rem')
    expect(mobileBlock).not.toContain('bottom: 2.4rem')
  })

  it('keeps desktop floating tags outside the hero copy reading lane', () => {
    const source = readFileSync(homeViewSourcePath, 'utf8')

    expect(source).toContain('--hero-copy-safe-width: clamp(46rem, 58vw, 62rem)')
    expect(source).toContain('--hero-copy-safe-left: calc((100% - var(--hero-copy-safe-width)) / 2)')
    expect(source).toContain('--hero-copy-safe-right: calc(var(--hero-copy-safe-left) + var(--hero-copy-safe-width))')
    expect(source).toContain('--hero-copy-safe-gap: clamp(3.5rem, 6vw, 5rem)')
    expect(source).toContain('right: calc(100% - var(--hero-copy-safe-left) + var(--hero-copy-safe-gap))')
    expect(source).toContain('left: calc(var(--hero-copy-safe-right) + var(--hero-copy-safe-gap))')
    expect(source).not.toContain('left: clamp(14rem, 19vw, 24rem)')
    expect(source).not.toContain('right: clamp(1rem, 3vw, 4rem)')
  })

  it('falls back to edge-only hero tags when the viewport cannot fit side lanes', () => {
    const source = readFileSync(homeViewSourcePath, 'utf8')
    const protectedViewportBlock = source.match(
      /@media \(max-width: 1320px\) and \(min-width: 641px\)\s*\{[\s\S]*?\n\}/
    )?.[0] ?? ''
    const shortViewportBlock = source.match(
      /@media \(max-height: 820px\) and \(min-width: 641px\)\s*\{[\s\S]*?\n\}/
    )?.[0] ?? ''
    const mobileBlock = source.match(/@media \(max-width: 640px\)[\s\S]*?\n\}/)?.[0] ?? ''

    expect(protectedViewportBlock).toContain('--hero-copy-safe-width: min(38rem, calc(100vw - 12rem))')
    expect(protectedViewportBlock).toContain('.floating-tool-tag-1,')
    expect(protectedViewportBlock).toContain('.floating-tool-tag-3,')
    expect(protectedViewportBlock).toContain('.floating-tool-tag-5')
    expect(protectedViewportBlock).toContain('display: none')
    expect(protectedViewportBlock).toContain('.floating-tool-tag-6,')
    expect(protectedViewportBlock).toContain('.floating-tool-tag-7')
    expect(protectedViewportBlock).toContain('right: -2rem')
    expect(protectedViewportBlock).toContain('left: -3rem')
    expect(protectedViewportBlock).toContain('top: clamp(6rem, 16vh, 8.4rem)')
    expect(shortViewportBlock).toBe('')
    expect(mobileBlock).toContain('.floating-tool-tag-1,')
    expect(mobileBlock).toContain('.floating-tool-tag-3,')
    expect(mobileBlock).toContain('.floating-tool-tag-5,')
    expect(mobileBlock).toContain('.floating-tool-tag-6,')
    expect(mobileBlock).toContain('.floating-tool-tag-7')
    expect(mobileBlock).toContain('display: none')
  })

  it('styles the hero tool tags as oversized sticker logos that follow one light direction', () => {
    const source = readFileSync(homeViewSourcePath, 'utf8')
    const heroSectionBlock = source.match(/\.hero-section\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const floatingTagBlock = source.match(/\.floating-tool-tag\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const floatingTagsBlock = source.match(/\.hero-floating-tags\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const floatingIconImageBlock = source.match(/\.floating-tool-icon img\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const floatingRoundBlock = source.match(/\.floating-tool-tag-round\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const floatingLabelBaseBlock = source.match(/\.floating-tool-tag-pill,\n\.floating-tool-tag-text\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const floatingTextBlock = Array.from(
      source.matchAll(/\.floating-tool-tag-text\s*\{[\s\S]*?\n\}/g),
      (match) => match[0]
    ).find((block) => block.includes('width: auto')) ?? ''

    expect(heroSectionBlock).toContain('background: var(--landing-bg)')
    expect(floatingTagsBlock).toContain('perspective:')
    expect(floatingTagsBlock).toContain('transform-style: preserve-3d')
    expect(floatingTagsBlock).not.toContain('transform: translate3d(')
    expect(floatingTagBlock).toContain('width: var(--hero-tag-size)')
    expect(floatingTagBlock).toContain('height: var(--hero-tag-size)')
    expect(floatingTagBlock).toContain('aspect-ratio: 1')
    expect(floatingTagBlock).toContain('border: clamp(0.32rem, 0.8vw, 0.56rem) solid var(--landing-sticker-border)')
    expect(floatingTagBlock).toContain('rgba(217, 119, 50')
    expect(floatingTagBlock).toContain('box-shadow:')
    expect(floatingTagBlock).toContain('filter: drop-shadow')
    expect(floatingTagBlock).toContain('var(--hero-tag-depth')
    expect(floatingTagBlock).toContain('var(--hero-tag-drift-x')
    expect(floatingTagBlock).toContain('var(--hero-tag-drift-y')
    expect(floatingTagBlock).toContain('rotate(var(--hero-tag-rotation')
    expect(floatingTagBlock).not.toContain('rotateX(calc(var(--hero-pointer-y)')
    expect(floatingTagBlock).not.toContain('rotateY(calc(var(--hero-pointer-x)')
    expect(floatingIconImageBlock).toContain('height: 86%')
    expect(floatingIconImageBlock).toContain('width: 86%')
    expect(floatingRoundBlock).toContain('border-radius: 999px')
    expect(floatingLabelBaseBlock).toContain('border-radius: 999px')
    expect(floatingLabelBaseBlock).toContain('width: var(--hero-tag-size)')
    expect(floatingLabelBaseBlock).toContain('height: var(--hero-tag-size)')
    expect(floatingTextBlock).toContain('width: auto')
    expect(floatingTextBlock).toContain('height: auto')
    expect(floatingTextBlock).toContain('min-width: clamp(8rem, 12vw, 11rem)')
    expect(floatingTextBlock).toContain('min-height: clamp(3.25rem, 5vw, 4.25rem)')
    expect(source).toContain("{ name: 'OpenAI', icon: '', needsBadge: false, shape: 'text' }")
    expect(source).toContain("codex-app.png")
    expect(source).toContain('floating-tool-tag-${tool.shape}')
    expect(source).toContain('--hero-tag-size:')
    expect(source).toContain('--hero-tag-rotation:')
    expect(source).toContain('--hero-mobile-tag-size:')
    expect(source).toContain('right: clamp(0.75rem, 3vw, 5rem)')
    expect(source).toContain('right: calc(100% - var(--hero-copy-safe-left) + var(--hero-copy-safe-gap))')
    expect(source).toContain('left: clamp(-1.1rem, -0.6vw, -0.5rem)')
    expect(source).toContain('top: clamp(14rem, 32vh, 21rem)')
    expect(source).toContain('top: clamp(4.75rem, 13vh, 8.5rem)')
    expect(source).toContain('bottom: clamp(7.25rem, 12vh, 9.5rem)')
    expect(source).toContain('bottom: clamp(16rem, 31vh, 21rem)')
    expect(source).toContain('--hero-tag-size: clamp(8.5rem, 12.5vw, 12rem)')
    expect(source).toContain('18.5rem')
    expect(source).toContain('6rem')
    expect(source).toContain('calc(var(--hero-pointer-x) * var(--hero-tag-drift-x)')
    expect(source).not.toContain('border-radius: 0.55rem')
  })

  it('keeps the floating hero tool tags gently animated', () => {
    const source = readFileSync(homeViewSourcePath, 'utf8')
    const floatingTagBlock = source.match(/\.floating-tool-tag\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const floatingIconImageBlock = source.match(/\.floating-tool-icon img\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(source).toContain('@keyframes hero-tag-float')
    expect(floatingTagBlock).toContain('animation: hero-tag-float')
    expect(floatingTagBlock).toContain('animation-delay: var(--hero-tag-delay, 0ms)')
    expect(floatingIconImageBlock).not.toContain('animation: hero-tag-float')
    expect(source).toContain('.floating-tool-tag')
    expect(source).not.toContain('@keyframes terminal-type')
    expect(source).not.toContain('animation: terminal-type')
  })

  it('keeps the hero copy lean without a stacked points list', () => {
    const wrapper = mount(HomeView, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a><slot /></a>'
          },
          LocaleSwitcher: true,
          Icon: true
        }
      }
    })

    expect(wrapper.find('.hero-copy').exists()).toBe(true)
    expect(wrapper.find('.hero-points').exists()).toBe(false)
  })

  it('uses the dark landing canvas on html and body while the default home page is mounted', () => {
    const wrapper = mount(HomeView, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a><slot /></a>'
          },
          LocaleSwitcher: true,
          Icon: true
        }
      }
    })

    expect(document.documentElement.classList.contains('landing-page-active')).toBe(true)
    expect(document.body.classList.contains('landing-page-active')).toBe(true)

    wrapper.unmount()

    expect(document.documentElement.classList.contains('landing-page-active')).toBe(false)
    expect(document.body.classList.contains('landing-page-active')).toBe(false)
  })

  it('tightens the landing header after the user scrolls down', async () => {
    const wrapper = mount(HomeView, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a><slot /></a>'
          },
          LocaleSwitcher: true,
          Icon: true
        }
      }
    })

    expect(wrapper.get('.landing-header').classes()).not.toContain('landing-header-scrolled')

    window.scrollY = 48
    window.dispatchEvent(new Event('scroll'))
    await nextTick()

    expect(wrapper.get('.landing-header').classes()).toContain('landing-header-scrolled')

    window.scrollY = 0
    window.dispatchEvent(new Event('scroll'))
    await nextTick()

    expect(wrapper.get('.landing-header').classes()).not.toContain('landing-header-scrolled')
  })

  it('narrows the landing nav while keeping main sections on a shared max-width container', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')
    const headerNavBlock = source.match(/\.landing-header nav\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const scrolledHeaderBlock = source.match(/\.landing-header-scrolled\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const scrolledNavBlock = source.match(/\.landing-header-scrolled nav\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const landingContainerBlock = source.match(/\.landing-container\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(headerNavBlock).toContain('width: var(--landing-header-width)')
    expect(headerNavBlock).toContain('background: var(--theme-surface)')
    expect(headerNavBlock).toContain('border: 1px solid var(--theme-border)')
    expect(headerNavBlock).toContain('border-radius: 0')
    expect(headerNavBlock).toMatch(/transition:[\s\S]*width 240ms cubic-bezier\(0\.22, 1, 0\.36, 1\)/)
    expect(scrolledHeaderBlock).toContain('--landing-header-width: min(72rem, calc(100vw - 1.5rem))')
    expect(scrolledNavBlock).toContain('background: var(--theme-surface-strong)')
    expect(scrolledNavBlock).toContain('border-color: var(--theme-border-strong)')
    expect(scrolledNavBlock).toContain('border-right: 0')
    expect(scrolledNavBlock).toContain('border-left: 0')
    expect(scrolledNavBlock).toContain('border-radius: 0.9rem')
    expect(source).not.toContain('max-w-7xl')
    expect(landingContainerBlock).toContain('width: min(100%, 78rem)')
    expect(landingContainerBlock).toContain('margin: 0 auto')
    expect(source).toContain('<div class="landing-container grid gap-10')
    expect(source).toContain('<div class="landing-container trust-strip">')
    expect(source).toContain('<div class="landing-container">')
    expect(source).toContain('<div class="landing-container grid gap-10')
  })

  it('keeps the visible landing nav shell on the narrowing nav instead of the full-width header', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')
    const headerBlock = source.match(/\.landing-header\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const headerNavBlock = source.match(/\.landing-header nav\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const scrolledHeaderBlock = source.match(/\.landing-header-scrolled\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const scrolledNavBlock = source.match(/\.landing-header-scrolled nav\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(headerBlock).not.toContain('background: var(--theme-surface)')
    expect(headerBlock).not.toContain('background: var(--theme-surface-strong)')
    expect(headerBlock).not.toMatch(/\bbackdrop-filter:/)
    expect(headerBlock).not.toMatch(/\bbox-shadow:/)
    expect(headerNavBlock).toMatch(/\bbackground:/)
    expect(headerNavBlock).toMatch(/\bbackdrop-filter:/)
    expect(headerNavBlock).toMatch(/\bbox-shadow:/)
    expect(scrolledHeaderBlock).not.toMatch(/\bbackground:/)
    expect(scrolledHeaderBlock).not.toMatch(/\bbox-shadow:/)
    expect(scrolledNavBlock).toMatch(/\bbackground:/)
    expect(scrolledNavBlock).toMatch(/\bbox-shadow:/)
  })

  it('keeps the landing header canvas transparent while the nav narrows', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')
    const headerBlock = source.match(/\.landing-header\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const headerNavBlock = source.match(/\.landing-header nav\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const scrolledHeaderBlock = source.match(/\.landing-header-scrolled\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(headerBlock).not.toMatch(/\bbackground:/)
    expect(headerBlock).not.toMatch(/\bbackdrop-filter:/)
    expect(headerBlock).not.toMatch(/\bbox-shadow:/)
    expect(scrolledHeaderBlock).not.toMatch(/\bbackground:/)
    expect(headerNavBlock).toContain('background: var(--theme-surface)')
  })

  it('isolates the landing page from the global light theme by forcing dark theme variables', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')
    const landingActiveBlock = source.match(/:global\(html\.landing-page-active\),\n:global\(body\.landing-page-active\) \{[\s\S]*?\n\}/)?.[0] ?? ''
    const landingShellBlock = source.match(/\.landing-shell\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(landingActiveBlock).toContain('color-scheme: dark')
    expect(landingActiveBlock).toContain('--theme-bg: #171717')
    expect(landingActiveBlock).toContain('--theme-surface-strong: #242424')
    expect(landingActiveBlock).toContain('--theme-text-muted: #c4cfdc')
    expect(landingShellBlock).toContain('color-scheme: dark')
    expect(source).toContain('::selection')
    expect(source).toContain('landing-page-active')
  })

  it('uses an icon-only landing locale switcher without the global dark class', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')
    const localeSwitcherBlock = source.match(/\.landing-shell :deep\(\.locale-switcher\)\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const localeTriggerBlock = source.match(/\.landing-shell :deep\(\.locale-trigger\)\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const localeTriggerIconBlock = source.match(/\.landing-shell :deep\(\.locale-trigger-icon\)\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const localeHiddenBlock = source.match(/\.landing-shell :deep\(\.locale-trigger-value\),\n\.landing-shell :deep\(\.locale-chevron\)\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(localeSwitcherBlock).toContain('--locale-text: #e2e8f0')
    expect(localeSwitcherBlock).toContain('--locale-text-strong: var(--landing-text-strong)')
    expect(localeSwitcherBlock).toContain('--locale-hover-bg: var(--theme-surface-muted)')
    expect(localeSwitcherBlock).toContain('--locale-active-text: var(--landing-text-strong)')
    expect(localeTriggerBlock).toContain('width: var(--landing-nav-control-height)')
    expect(localeTriggerBlock).toContain('min-width: var(--landing-nav-control-height)')
    expect(localeTriggerBlock).toContain('border: 0')
    expect(localeTriggerBlock).toContain('background: transparent')
    expect(localeTriggerBlock).toContain('padding: 0')
    expect(localeTriggerBlock).toContain('box-shadow: none')
    expect(localeTriggerIconBlock).toContain('display: grid')
    expect(localeTriggerIconBlock).toContain('place-items: center')
    expect(localeTriggerIconBlock).toContain('color: var(--landing-text-soft)')
    expect(localeTriggerIconBlock).not.toContain('var(--landing-support)')
    expect(localeHiddenBlock).toContain('display: none')
  })

  it('uses landing color tokens instead of template-level Tailwind color utilities', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')

    expect(source).not.toContain('text-white')
    expect(source).not.toContain('text-slate-300')
    expect(source).not.toContain('text-slate-400')
    expect(source).toMatch(/--landing-accent:\s*#[0-9a-fA-F]{6}/)
    expect(source).toContain('--landing-text-soft: #e2e8f0')
    expect(source).toContain('color: var(--landing-text-soft)')
    expect(source).toContain('color: var(--landing-accent)')
  })

  it('calibrates the landing surfaces with finer dark layers and quieter shadows', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')
    const landingShellBlock = source.match(/\.landing-shell\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const floatingTagBlock = source.match(/\.floating-tool-tag\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const testimonialCardBlock = source.match(/\.testimonial-card\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(landingShellBlock).toContain('--landing-surface-raised: #292929')
    expect(landingShellBlock).toContain('--landing-surface-soft: rgba(255, 255, 255, 0.035)')
    expect(landingShellBlock).toContain('--landing-hairline: rgba(255, 255, 255, 0.055)')
    expect(landingShellBlock).toContain('--landing-control-shadow: 0 1px 0 rgba(255, 255, 255, 0.055) inset')
    expect(landingShellBlock).toContain('--landing-sticker-bg: color-mix(in srgb, var(--landing-accent-soft) 18%, var(--landing-text-strong))')
    expect(landingShellBlock).toContain('--landing-sticker-border: color-mix(in srgb, var(--landing-text-strong) 84%, var(--landing-accent-soft))')
    expect(floatingTagBlock).toContain('border: clamp(0.32rem, 0.8vw, 0.56rem) solid var(--landing-sticker-border)')
    expect(floatingTagBlock).toContain('background: var(--landing-sticker-bg)')
    expect(floatingTagBlock).toContain('box-shadow:')
    expect(floatingTagBlock).toContain('rgba(217, 119, 50')
    expect(source).not.toContain('rgba(15, 47, 70')
    expect(source).not.toContain('--landing-sticker-bg: #ffffff')
    expect(floatingTagBlock).not.toContain('0 18px 42px rgba(2, 6, 23, 0.18)')
    expect(testimonialCardBlock).toContain('border: 1px solid var(--landing-hairline)')
    expect(testimonialCardBlock).not.toContain('0 18px 42px rgba(2, 6, 23, 0.2)')
  })

  it('uses a calmer type scale and weights for the preserve redesign', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')
    const heroTitleBlock = source.match(/\.hero-copy h1\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const heroBrandBlock = source.match(/\.hero-brand-title\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const sectionTitleBlock = source.match(/\.section-heading h2\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const supportTitleBlock = source.match(/\.support-showcase-title\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const trustValueBlock = source.match(/\.trust-card strong\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(heroTitleBlock).toContain('font-size: clamp(2.65rem, 6.6vw, 5.15rem)')
    expect(heroTitleBlock).toContain('font-weight: 820')
    expect(heroTitleBlock).toContain('line-height: 0.98')
    expect(heroBrandBlock).toContain('color: color-mix(in srgb, var(--landing-text-strong) 92%, var(--landing-accent-soft))')
    expect(sectionTitleBlock).toContain('font-size: clamp(2rem, 4.5vw, 3.85rem)')
    expect(sectionTitleBlock).toContain('font-weight: 780')
    expect(supportTitleBlock).toContain('font-weight: 780')
    expect(trustValueBlock).toContain('font-weight: 780')
  })

  it('themes scrollbars through theme variables so the gutter follows the active canvas', () => {
    const homeSource = readFileSync(homeViewSourcePath, 'utf-8')
    const globalStyleSource = readFileSync(globalStyleSourcePath, 'utf-8')

    expect(globalStyleSource).toContain('--theme-scrollbar-track')
    expect(globalStyleSource).toContain('scrollbar-color: var(--theme-scrollbar-thumb) var(--theme-scrollbar-track)')
    expect(globalStyleSource).toContain('background: var(--theme-scrollbar-track)')
    expect(homeSource).toContain('--theme-scrollbar-track: #171717')
    expect(homeSource).toContain('--theme-scrollbar-thumb: rgba(148, 163, 184, 0.34)')
  })

  it('preloads a small landing font subset without falling through to the async global webfont', () => {
    const homeSource = readFileSync(homeViewSourcePath, 'utf-8')
    const indexHtmlSource = readFileSync(indexHtmlSourcePath, 'utf-8')
    const landingShellBlock = homeSource.match(/\.landing-shell\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(indexHtmlSource).toContain('/fonts/hahacode-landing-sc.woff2')
    expect(indexHtmlSource).toContain('rel="preload"')
    expect(indexHtmlSource).toContain('as="font"')
    expect(indexHtmlSource).toContain('crossorigin')
    expect(homeSource).toContain("font-family: 'Hahacode Landing SC'")
    expect(homeSource).toContain("font-display: optional")
    expect(homeSource).toContain("url('/fonts/hahacode-landing-sc.woff2')")
    expect(landingShellBlock).not.toContain("'Noto Sans SC Variable'")
    expect(landingShellBlock).toContain("'PingFang SC'")
    expect(landingShellBlock).toContain("'Microsoft YaHei'")
  })

  it('keeps the fixed dark landing theme aligned with the console dark tokens', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')

    expect(source).not.toContain('#0a0a0a')
    expect(source).not.toContain('#111111')
    expect(source).not.toContain('#181614')
    expect(source).not.toContain('#2a2622')
    expect(source).not.toContain('#ece4d8')
    expect(source).not.toContain('rgba(185, 168, 150')
    expect(source).toContain('#171717')
    expect(source).toContain('#242424')
    expect(source).toContain('#e2e8f0')
  })

  it('removes the old staggered feature card section', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')

    expect(source).not.toContain('featureCards')
    expect(source).not.toContain('.feature-layout')
    expect(source).not.toContain('.feature-panel')
    expect(source).not.toContain('.feature-icon')
    expect(source).not.toContain('.feature-visual')
    expect(source).not.toContain('.feature-card,\n.testimonial-card')
    expect(source).not.toContain('.testimonial-card,\n.faq-item')
    expect(source).not.toMatch(/\.feature-card,\s*[\s\S]*?border:\s*1px solid/)
  })

  it('uses local support icons instead of generated landing asset sprites', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')

    expect(source).not.toContain('/landing-assets/hero-texture.png')
    expect(source).not.toContain('/landing-assets/testimonial-texture.png')
    expect(source).not.toContain('/landing-assets/footer-texture.png')
    expect(source).not.toContain('/landing-assets/icon-sprite.png')
    expect(source).not.toContain('/landing-assets/feature-visual-sprite.png')
    expect(source).not.toContain('/landing-assets/object-sprite.png')
    expect(source).toContain("const supportAssetBase = '/landing-support'")
    expect(source).toContain('hermes-agent.svg')
  })

  it('themes the support showcase through the global dark tokens', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')
    const supportShowcaseBlock = source.match(/\.support-showcase\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const supportPanelBlock = source.match(/\.support-showcase-panel\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const supportTitleAccentBlock = source.match(/\.support-showcase-title em\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const supportPlatformBlock = source.match(/\.support-platform-chip\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const supportIconBackedBlock = source.match(/\.support-icon-frame-backed\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(supportShowcaseBlock).toContain('background: color-mix(in srgb, var(--theme-surface) 58%, var(--landing-bg))')
    expect(supportShowcaseBlock).toContain('border-top: 1px solid var(--theme-border)')
    expect(supportShowcaseBlock).toContain('border-bottom: 1px solid var(--theme-border)')
    expect(supportPanelBlock).toContain('color: var(--theme-text)')
    expect(supportPanelBlock).not.toContain('width: min(100%, 104rem)')
    expect(supportPanelBlock).not.toMatch(/\bborder-radius:/)
    expect(supportPanelBlock).not.toMatch(/\bbox-shadow:/)
    expect(supportPanelBlock).not.toMatch(/\bborder:/)
    expect(supportTitleAccentBlock).toContain('color: var(--theme-primary-hover)')
    expect(supportPlatformBlock).toContain('background: var(--landing-surface-soft)')
    expect(supportPlatformBlock).toContain('border: 1px solid var(--theme-border-strong)')
    expect(supportIconBackedBlock).toContain('var(--theme-text)')
    expect(supportIconBackedBlock).toContain('var(--theme-surface-strong)')
    expect(source).not.toContain('background: #d5d5d5')
    expect(source).not.toContain('background: #aca89f')
    expect(source).not.toContain('color: #000000')
  })

  it('turns trust stats and compatibility chips into lighter product rails', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')
    const trustBandBlock = source.match(/\.trust-band\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const trustStripBlock = source.match(/\.trust-strip\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const trustCardBlock = source.match(/\.trust-card\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const trustCardDividerBlock = source.match(/\.trust-card \+ \.trust-card::before\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const supportProviderChipBlock = source.match(/\.support-provider-chip\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const supportPlatformChipBlock = source.match(/\.support-platform-chip\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(trustBandBlock).toContain('padding-top: clamp(0.75rem, 1.6vw, 1.4rem)')
    expect(trustStripBlock).toContain('border: 1px solid var(--landing-hairline)')
    expect(trustStripBlock).toContain('background: var(--landing-surface-soft)')
    expect(trustCardBlock).toContain('min-height: 5.6rem')
    expect(trustCardDividerBlock).toContain('background: var(--landing-hairline)')
    expect(supportProviderChipBlock).toContain('border: 1px solid var(--landing-hairline)')
    expect(supportProviderChipBlock).toContain('background: var(--landing-surface-soft)')
    expect(supportPlatformChipBlock).toContain('min-height: 3.35rem')
    expect(supportPlatformChipBlock).toContain('background: var(--landing-surface-soft)')
  })

  it('shows the home page logo without a framed brand mark', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')
    const brandMarkBlock = source.match(/\.brand-mark\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const brandMarkImageBlock = source.match(/\.brand-mark img\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(brandMarkBlock).not.toMatch(/\bborder:/)
    expect(brandMarkBlock).not.toMatch(/\bbackground:/)
    expect(brandMarkImageBlock).not.toMatch(/\bpadding:/)
  })

  it('keeps landing sections flat without visible gradient washes', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')
    const headerBlock = source.match(/\.landing-header\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const trustBandBlock = source.match(/\.trust-band\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const testimonialBlock = source.match(/\.testimonial-section\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const footerBlock = source.match(/\.landing-footer\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(headerBlock).not.toMatch(/\bborder-bottom:/)
    expect(trustBandBlock).not.toMatch(/\bborder-(top|bottom):/)
    expect(testimonialBlock).not.toMatch(/\bborder-(top|bottom):/)
    expect(footerBlock).not.toMatch(/\bborder-top:/)
    expect(source).not.toContain('linear-gradient')
    expect(source).not.toContain('radial-gradient')
    expect(headerBlock).not.toContain('background: var(--theme-surface)')
    expect(headerBlock).not.toContain('background: var(--theme-surface-strong)')
    expect(source).toContain('.landing-header-scrolled')
    expect(trustBandBlock).toContain('background: var(--landing-bg)')
    expect(testimonialBlock).toContain('background: var(--landing-bg)')
    expect(footerBlock).toContain('background: var(--landing-bg)')
  })

  it('keeps landing marketing copy in locale files instead of hardcoding Chinese text in the component', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')

    expect(source).not.toContain('用户怎么说')
    expect(source).not.toContain('统一接入开发工具')
    expect(source).not.toContain('适合已经在日常研发中使用 AI 编程工具')
    expect(source).not.toContain('面向开发者的 AI 编程工作台')
  })

  it('allows the hero title to wrap on narrow screens to avoid horizontal page overflow', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')

    expect(source).toMatch(/@media \(max-width: 640px\)[\s\S]*?\.hero-copy h1 span\s*\{[\s\S]*?white-space:\s*normal;/)
  })

  it('keeps floating stickers out of the mobile hero copy reading lane', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')
    const mobileBlock = source.match(/@media \(max-width: 640px\)[\s\S]*?\n\}/)?.[0] ?? ''

    expect(mobileBlock).toContain('left: -2.2rem')
    expect(mobileBlock).toContain('top: 30%')
    expect(mobileBlock).toContain('top: -4.4rem')
    expect(mobileBlock).toContain('--hero-mobile-tag-size: clamp(7rem, 32vw, 8.2rem)')
    expect(mobileBlock).toContain('right: -3.2rem')
    expect(mobileBlock).toContain('top: -4rem')
    expect(mobileBlock).toContain('right: -1.6rem')
    expect(mobileBlock).toContain('top: 33%')
    expect(mobileBlock).toContain('right: -3.6rem')
    expect(mobileBlock).toContain('top: 68%')
    expect(mobileBlock).toContain('left: -1.6rem')
    expect(mobileBlock).toContain('bottom: 2.6rem')
    expect(mobileBlock).toContain('--hero-mobile-tag-size: clamp(7.4rem, 34vw, 9.4rem)')
    expect(mobileBlock).toContain('--hero-mobile-tag-size: clamp(7rem, 32vw, 8.2rem)')
    expect(mobileBlock).not.toContain('bottom: -5.4rem')
    expect(mobileBlock).not.toContain('bottom: 0.8rem')
    expect(mobileBlock).not.toContain('right: 7%')
    expect(mobileBlock).not.toContain('right: -1.4rem')
    expect(mobileBlock).not.toContain('left: -9.4rem')
    expect(mobileBlock).not.toContain('left: -10.6rem')
    expect(mobileBlock).not.toContain('left: -3.6rem')
    expect(mobileBlock).not.toContain('right: -6.4rem')
  })

  it('expands the landing hero into a centered fullscreen hero section', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')
    const heroTemplate = source.match(/<section[\s\S]*?class="hero-section[\s\S]*?<\/section>/)?.[0] ?? ''
    const heroSectionBlock = source.match(/\.hero-section\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const heroStageBlock = source.match(/\.hero-stage\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const heroFloatingBlock = source.match(/\.hero-floating-tags\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(heroTemplate).toContain('hero-stage')
    expect(heroTemplate).toContain('hero-floating-tags')
    expect(heroTemplate).toContain('hero-copy hero-copy-centered')
    expect(heroSectionBlock).toContain('min-height: 100svh')
    expect(heroSectionBlock).toContain('display: grid')
    expect(heroSectionBlock).toContain('place-items: center')
    expect(heroStageBlock).toContain('min-height: calc(100svh - 5.5rem)')
    expect(heroStageBlock).toContain('display: grid')
    expect(heroStageBlock).toContain('place-items: center')
    expect(heroFloatingBlock).toContain('position: absolute')
    expect(source).not.toContain('.hero-console')
    expect(source).not.toContain('.command-panel')
  })
})
