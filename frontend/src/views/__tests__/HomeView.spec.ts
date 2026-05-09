import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import HomeView from '@/views/HomeView.vue'

const homeViewSourcePath = path.resolve(process.cwd(), 'src/views/HomeView.vue')

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
      t: (key: string) => key
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
    expect(wrapper.get('.landing-shell').classes()).toContain('text-white')
    expect(wrapper.get('.landing-nav-links').classes()).toContain('text-slate-300')
    expect(wrapper.get('.landing-footer').classes()).toContain('text-slate-300')
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

  it('keeps the fixed dark landing theme softer than pure black', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')

    expect(source).not.toContain('#0a0a0a')
    expect(source).not.toContain('#111111')
    expect(source).not.toContain('#171717')
    expect(source).toContain('#111827')
    expect(source).toContain('#1f2937')
  })

  it('uses varied section treatments instead of one repeated bordered card pattern', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')

    expect(source).not.toContain('.feature-card,\n.testimonial-card')
    expect(source).not.toContain('.testimonial-card,\n.faq-item')
    expect(source).not.toMatch(/\.feature-card,\s*[\s\S]*?border:\s*1px solid/)
    expect(source).toContain('feature-layout')
    expect(source).toContain('feature-panel')
  })

  it('uses generated landing assets for atmosphere and visual detail', () => {
    const source = readFileSync(homeViewSourcePath, 'utf-8')

    expect(source).toContain('/landing-assets/hero-texture.png')
    expect(source).toContain('/landing-assets/testimonial-texture.png')
    expect(source).toContain('/landing-assets/footer-texture.png')
    expect(source).toContain('/landing-assets/object-sprite.png')
  })
})
