import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import HomeView from '@/views/HomeView.vue'

const homeViewSourcePath = path.resolve(process.cwd(), 'src/views/HomeView.vue')
const globalStyleSourcePath = path.resolve(process.cwd(), 'src/style.css')

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
          'home.modern.hero.eyebrow': 'AI Code Workspace',
          'home.modern.hero.line1': '重构您的',
          'home.modern.hero.line2': 'AI 编程体验',
          'home.modern.hero.subtitle': '稳定、清晰、适合团队协作的 AI 编程平台。',
          'home.modern.hero.description': '把 AI 编程、使用管理与团队协作整合到一个软件平台，让团队专注产品本身。',
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
          'home.modern.features.eyebrow': 'Developer Platform',
          'home.modern.features.title': '一个入口，组织起日常 AI 研发工作',
          'home.modern.featureCards.tools.title': '统一接入开发工具',
          'home.modern.featureCards.tools.description': '把常用 AI 编程工具接到一个入口，减少账号、密钥和配置在团队间散落。',
          'home.modern.featureCards.team.title': '团队协作更清晰',
          'home.modern.featureCards.team.description': '围绕成员、权限、分组和使用记录建立共享视图，协作时少一点猜测。',
          'home.modern.featureCards.reliability.title': '稳定性优先',
          'home.modern.featureCards.reliability.description': '通过通道监控、失败切换和用量保护，让高频开发场景更稳。',
          'home.modern.featureCards.usage.title': '用量透明可追踪',
          'home.modern.featureCards.usage.description': '关键消耗、调用状态与趋势沉淀为可读报表，方便复盘和管理。',
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
    expect(wrapper.findAll('.feature-icon-sprite')).toHaveLength(4)
    expect(wrapper.findAll('.feature-visual-sprite')).toHaveLength(4)
    expect(wrapper.html()).toContain('/landing-assets/icon-sprite.png')
    expect(wrapper.html()).toContain('/landing-assets/feature-visual-sprite.png')
  })

  it('keeps the hero terminal preview simple without dashboard metric panels', () => {
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

    expect(wrapper.find('.hero-console').exists()).toBe(true)
    expect(wrapper.find('.command-panel').exists()).toBe(true)
    expect(wrapper.get('.console-topbar strong').text()).toBe('terminal')
    expect(wrapper.get('.terminal-prompt').text()).toBe('$')
    expect(wrapper.get('.terminal-curl').text()).toBe('curl')
    expect(wrapper.get('.terminal-flag').text()).toBe('-X POST')
    expect(wrapper.get('.terminal-path').text()).toBe('/v1/messages')
    expect(wrapper.get('.terminal-comment').text()).toBe('# Routing to upstream...')
    expect(wrapper.get('.terminal-status-badge').text()).toBe('200 OK')
    expect(wrapper.get('.terminal-json').text()).toBe('{ "content": "Hello!" }')
    expect(wrapper.find('.terminal-cursor').exists()).toBe(true)
    expect(wrapper.findAll('.terminal-line')).toHaveLength(4)
    expect(wrapper.find('.code-lines').exists()).toBe(false)
    expect(wrapper.find('.metric-panel').exists()).toBe(false)
    expect(wrapper.find('.route-panel').exists()).toBe(false)
  })

  it('keeps the terminal preview typewriter animation available', () => {
    const source = readFileSync(homeViewSourcePath, 'utf8')

    expect(source).toContain('@keyframes terminal-type')
    expect(source).toContain('animation: terminal-type')
    expect(source).toContain('@keyframes terminal-cursor-blink')
    expect(source).toContain('.terminal-cursor')
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

  it('narrows the landing nav width when the scrolled header state is active', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')
    const headerNavBlock = source.match(/\.landing-header nav\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const scrolledNavBlock = source.match(/\.landing-header-scrolled nav\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(headerNavBlock).toContain('max-width: 80rem')
    expect(headerNavBlock).toMatch(/transition:[\s\S]*max-width 180ms ease/)
    expect(scrolledNavBlock).toContain('max-width: min(68rem, calc(100vw - 1.5rem))')
  })

  it('keeps the visible landing nav shell on the narrowing nav instead of the full-width header', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')
    const headerBlock = source.match(/\.landing-header\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const headerNavBlock = source.match(/\.landing-header nav\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const scrolledHeaderBlock = source.match(/\.landing-header-scrolled\s*\{[\s\S]*?\n\}/)?.[0] ?? ''
    const scrolledNavBlock = source.match(/\.landing-header-scrolled nav\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(headerBlock).not.toMatch(/\bbackground:/)
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

  it('isolates the landing page from the global light theme by forcing dark theme variables', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')
    const landingActiveBlock = source.match(/:global\(html\.landing-page-active\),\n:global\(body\.landing-page-active\) \{[\s\S]*?\n\}/)?.[0] ?? ''
    const landingShellBlock = source.match(/\.landing-shell\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(landingActiveBlock).toContain('color-scheme: dark')
    expect(landingActiveBlock).toContain('--theme-bg: #14161a')
    expect(landingActiveBlock).toContain('--theme-surface-strong: #1d2026')
    expect(landingActiveBlock).toContain('--theme-text-muted: #a7adb7')
    expect(landingShellBlock).toContain('color-scheme: dark')
    expect(source).toContain('::selection')
    expect(source).toContain('landing-page-active')
  })

  it('keeps the landing locale switcher readable without the global dark class', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')
    const localeSwitcherBlock = source.match(/\.landing-shell :deep\(\.locale-switcher\)\s*\{[\s\S]*?\n\}/)?.[0] ?? ''

    expect(localeSwitcherBlock).toContain('--locale-text: #e2e8f0')
    expect(localeSwitcherBlock).toContain('--locale-text-strong: var(--landing-text-strong)')
    expect(localeSwitcherBlock).toContain('--locale-active-text: #fed7aa')
  })

  it('uses landing color tokens instead of template-level Tailwind color utilities', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')

    expect(source).not.toContain('text-white')
    expect(source).not.toContain('text-slate-300')
    expect(source).not.toContain('text-slate-400')
    expect(source).toContain('--landing-accent: #f97316')
    expect(source).toContain('--landing-text-soft: #d4d4d4')
    expect(source).toContain('color: var(--landing-text-soft)')
    expect(source).toContain('color: var(--landing-accent-soft)')
  })

  it('themes scrollbars through theme variables so the gutter follows the active canvas', () => {
    const homeSource = readFileSync(homeViewSourcePath, 'utf-8')
    const globalStyleSource = readFileSync(globalStyleSourcePath, 'utf-8')

    expect(globalStyleSource).toContain('--theme-scrollbar-track')
    expect(globalStyleSource).toContain('scrollbar-color: var(--theme-scrollbar-thumb) var(--theme-scrollbar-track)')
    expect(globalStyleSource).toContain('background: var(--theme-scrollbar-track)')
    expect(homeSource).toContain('--theme-scrollbar-track: #14161a')
    expect(homeSource).toContain('--theme-scrollbar-thumb: rgba(148, 163, 184, 0.34)')
  })

  it('keeps the fixed dark landing theme softer than pure black', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')

    expect(source).not.toContain('#0a0a0a')
    expect(source).not.toContain('#111111')
    expect(source).not.toContain('#171717')
    expect(source).toContain('#14161a')
    expect(source).toContain('#252931')
  })

  it('uses varied section treatments instead of one repeated bordered card pattern', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')

    expect(source).not.toContain('.feature-card,\n.testimonial-card')
    expect(source).not.toContain('.testimonial-card,\n.faq-item')
    expect(source).not.toMatch(/\.feature-card,\s*[\s\S]*?border:\s*1px solid/)
    expect(source).toContain('feature-layout')
    expect(source).toContain('feature-panel')
  })

  it('uses generated landing assets for visual detail without texture backgrounds', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')

    expect(source).not.toContain('/landing-assets/hero-texture.png')
    expect(source).not.toContain('/landing-assets/testimonial-texture.png')
    expect(source).not.toContain('/landing-assets/footer-texture.png')
    expect(source).toContain('/landing-assets/object-sprite.png')
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
    expect(headerBlock).toContain('background: rgba(20, 22, 26, 0.92)')
    expect(source).toContain('.landing-header-scrolled')
    expect(trustBandBlock).toContain('background: rgba(29, 32, 38, 0.74)')
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
})
