import { mount } from '@vue/test-utils'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { OPENAI_CC_SWITCH_CODEX_MODEL } from '@/utils/ccswitchImport'
import DocsView from '@/views/DocsView.vue'

const docsViewSourcePath = path.resolve(process.cwd(), 'src/views/DocsView.vue')
const routerSourcePath = path.resolve(process.cwd(), 'src/router/index.ts')
const ccswitchImportSourcePath = path.resolve(process.cwd(), 'src/utils/ccswitchImport.ts')

const { appState, copyToClipboard } = vi.hoisted(() => ({
  appState: {
    cachedPublicSettings: {
      site_name: 'Hahacode',
      site_logo: '',
      site_subtitle: 'AI 编程开发工作台',
      api_base_url: 'https://code.hahacode.work',
      doc_url: 'https://docs.example.com',
      contact_info: '售后群请添加微信: HH__64',
      custom_endpoints: []
    },
    siteName: 'Hahacode',
    siteLogo: '',
    apiBaseUrl: 'https://code.hahacode.work',
    docUrl: 'https://docs.example.com',
    publicSettingsLoaded: true,
    fetchPublicSettings: vi.fn()
  },
  copyToClipboard: vi.fn().mockResolvedValue(true)
}))

vi.mock('@/stores', () => ({
  useAppStore: () => appState
}))

vi.mock('@/composables/useClipboard', () => ({
  useClipboard: () => ({
    copyToClipboard
  })
}))

describe('DocsView', () => {
  beforeEach(() => {
    appState.fetchPublicSettings.mockClear()
    copyToClipboard.mockClear()
  })

  it('renders a first-party docs page with the approved directory structure', async () => {
    const wrapper = mount(DocsView, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>'
          },
          Icon: true
        }
      }
    })

    const text = wrapper.text()

    expect(text).toContain('Hahacode 文档中心')
    expect(text).not.toContain('Developer Docs')
    expect(text).not.toContain('从创建 API Key 到接入 CC-Switch、Claude Code、Codex、Gemini CLI，把常用配置和排查步骤集中到一个页面。')
    expect(text).toContain('快速开始')
    expect(text).not.toContain('工具配置教程')
    expect(text).toContain('常见问题')
    expect(text).not.toContain('API Key 与额度')
    expect(text).not.toContain('模型与渠道')
    expect(text).not.toContain('条款与合规')
    expect(text).toContain('https://code.hahacode.work')
    expect(text).toContain('Claude Code')
    expect(text).toContain('Codex')
    expect(text).toContain('Gemini CLI')
    expect(text).toContain('OpenAI 兼容')
    expect(text).toContain('CC-Switch')
    expect(text).toContain('还没有 API Key？')
    expect(text).toContain('点击“创建密钥”')
    expect(wrapper.find('#quick-start').exists()).toBe(false)
    expect(wrapper.get('.docs-toc a[href="#tools"] .docs-toc-number').text()).toBe('1')
    expect(wrapper.get('.docs-toc a[href="#tools"]').text()).toContain('快速开始')
    expect(wrapper.get('.docs-toc a[href="#faq"] .docs-toc-number').text()).toBe('2')
    expect(wrapper.get('.docs-toc a[href="#faq"]').text()).toContain('常见问题 FAQ')
    expect(wrapper.find('.docs-toc a[href="#api-key"]').exists()).toBe(false)
    expect(wrapper.find('.docs-toc a[href="#models"]').exists()).toBe(false)
    expect(wrapper.find('.docs-toc a[href="#legal"]').exists()).toBe(false)
    expect(wrapper.get('#tools .docs-section-heading span').text()).toBe('01')
    expect(wrapper.get('#faq .docs-section-heading span').text()).toBe('02')
    expect(wrapper.find('#api-key').exists()).toBe(false)
    expect(wrapper.find('#models').exists()).toBe(false)
    expect(wrapper.find('#legal').exists()).toBe(false)
    expect(wrapper.find('.docs-endpoint-panel p').exists()).toBe(false)
    expect(wrapper.get('.docs-related-links a[href="/keys"]').text()).toContain('我的密钥')
    expect(wrapper.get('.docs-related-links a[href="/subscriptions"]').text()).toContain('订阅套餐')
    expect(wrapper.get('.docs-related-links a[href="/usage"]').text()).toContain('用量记录')
    expect(wrapper.find('.docs-related-links a[href="/available-channels"]').exists()).toBe(false)
    expect(wrapper.find('.docs-related-links a[href="/monitor"]').exists()).toBe(false)
    expect(wrapper.get('.docs-footer a[href="/legal/terms"]').text()).toContain('服务条款')
    expect(wrapper.get('.docs-footer a[href="/legal/usage-policy"]').text()).toContain('使用政策')
    expect(wrapper.get('.docs-footer a[href="/legal/supported-regions"]').text()).toContain('支持地区')
    expect(wrapper.get('.docs-footer-contact').text()).toBe('联系支持：售后群请添加微信: HH__64')
    expect(wrapper.find('.docs-footer a[href^="mailto:"]').exists()).toBe(false)
    expect(wrapper.find('.docs-faq a[href="/available-channels"]').exists()).toBe(false)
    expect(text).not.toContain('模型不存在或请求被拒绝怎么办？')
    expect(text).not.toContain('到可用渠道确认模型是否开放')
    const faqNumbers = wrapper.findAll('.docs-faq-number').map((number) => number.text())
    expect(faqNumbers).toEqual(['01', '02', '03', '04'])
    const capacityFaqTitle = wrapper
      .findAll('.docs-faq h3')
      .find((title) => title.text().includes('Selected model is at capacity'))
    expect(capacityFaqTitle?.find('.docs-faq-number').text()).toBe('03')
    expect(capacityFaqTitle?.find('.docs-faq-question').exists()).toBe(true)
    expect(capacityFaqTitle?.text()).toContain('遇到Selected model is at capacity. Please try a different model.怎么办？')
    expect(capacityFaqTitle?.find('code.docs-inline-code').text()).toBe('Selected model is at capacity. Please try a different model.')
    expect(text).toContain('这是 OpenAI 官方侧的模型容量问题')
    expect(text).toContain('高峰期可能会出现')
    expect(text).toContain('通常不是 Hahacode 密钥、余额或订阅配置异常')
    expect(text).toContain('建议先重试请求')
    expect(text).toContain('如持续失败，可切换至其他可用模型或其他可用分组')
    for (const link of wrapper.findAll('.docs-inline-link')) {
      expect(link.text()).not.toMatch(/[“”]/)
    }

    await wrapper.get('[data-testid="docs-tool-option-claude"]').trigger('click')
    await nextTick()
    expect(wrapper.html()).toContain('ANTHROPIC_BASE_URL')
    expect(wrapper.html()).toContain('CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC')

    await wrapper.get('[data-testid="docs-tool-option-codex"]').trigger('click')
    await nextTick()
    expect(wrapper.html()).toContain('OPENAI_API_KEY')

    await wrapper.get('[data-testid="docs-tool-option-gemini"]').trigger('click')
    await nextTick()
    expect(wrapper.html()).toContain('GOOGLE_GEMINI_BASE_URL')

    expect(wrapper.find('a[href="https://docs.example.com"]').exists()).toBe(false)
    expect(text).not.toContain('外部详细文档')
  })

  it('documents CC-Switch as a recommended one-click import flow without exposing deeplink parameters', async () => {
    const wrapper = mount(DocsView, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>'
          },
          Icon: true
        }
      }
    })

    await wrapper.get('[data-testid="docs-tool-option-cc-switch"]').trigger('click')
    await nextTick()

    const panel = wrapper.get('.docs-tool-panel')
    const text = panel.text()
    expect(text).toContain('推荐方案')
    expect(text).toContain('下载 CC-Switch')
    expect(text).toContain('Windows / macOS / Linux')
    expect(text).toContain('下载并打开 CC-Switch 后')
    expect(text).toContain('回到“我的密钥”点击“导入到 CCS”')
    expect(text).not.toContain('自动唤起')
    expect(text).toContain('我的密钥')
    expect(text).toContain('导入到 CCS')
    expect(text).toContain('如果还没有 API Key')
    expect(text).toContain('点击“创建密钥”并选择可用分组')
    expect(wrapper.get('.docs-download-icon img').attributes('src')).toBe('/landing-support/cc-switch.png')
    expect(wrapper.get('.docs-download-icon img').attributes('alt')).toBe('CC-Switch Logo')
    expect(wrapper.find('.docs-recommendation-grid').exists()).toBe(false)
    expect(wrapper.find('.docs-recommendation-card').exists()).toBe(false)
    expect(text).not.toContain('无需手动维护多套环境变量')
    expect(text).not.toContain('推荐 CC-Switch')
    expect(text).not.toContain('验证请求')
    expect(text).not.toContain('Antigravity')
    expect(text).not.toContain('Claude Messages')
    expect(text).not.toContain('OpenAI Responses')
    expect(text).not.toContain('Gemini v1beta')
    expect(wrapper.get('a[href="https://ccswitch.io"]').text()).toContain('下载地址')
    expect(wrapper.find('a[href="https://github.com/farion1231/cc-switch/releases"]').exists()).toBe(false)
    expect(wrapper.find('a[href="https://github.com/farion1231/cc-switch"]').exists()).toBe(false)
    expect(wrapper.find('a[href="https://docs.packyapi.com/docs/ccswitch/1-common.html"]').exists()).toBe(false)
    expect(wrapper.html()).not.toContain('packyapi.com')
    expect(wrapper.findAll('.docs-code-block')).toHaveLength(0)
    expect(wrapper.findAll('.docs-flow-step')).toHaveLength(3)
    expect(wrapper.find('.docs-flow').exists()).toBe(true)
    expect(wrapper.get('.docs-flow-step a[href="https://ccswitch.io"]').text()).toContain('下载页')
    expect(wrapper.get('.docs-flow-step a[href="/keys"]').text()).toContain('我的密钥')
    expect(wrapper.get('.docs-flow-step a[href="/usage"]').text()).toContain('用量记录')
    expect(text).toContain('下载并打开 CC-Switch')
    expect(text).toContain('在“我的密钥”点击“导入到 CCS”')
    expect(text).toContain('启用导入项并重启对应客户端')
    expect(text).not.toContain('4. 普通 Claude Code')
    expect(text).not.toContain('真实协议示例')
    expect(text).not.toContain('按客户端导入')
    expect(text).not.toContain('app=claude')
    expect(text).not.toContain('app=codex')
    expect(text).not.toContain('app=gemini')
    expect(panel.html()).not.toContain('ccswitch://')
    expect(panel.html()).not.toContain('resource=provider')
    expect(panel.html()).not.toContain('usageAutoInterval=30')
  })

  it('keeps API key and shell controls hidden for CC-Switch and reveals them for manual tools', async () => {
    const wrapper = mount(DocsView, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>'
          },
          Icon: true
        }
      }
    })

    expect(wrapper.find('[data-testid="docs-api-key-input"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="docs-api-key-link"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="docs-key-prerequisite"]').text()).toContain('还没有 API Key？')
    expect(wrapper.find('.docs-shell-tabs').exists()).toBe(false)
    expect(wrapper.get('[data-testid="docs-recommended-tool"]').classes()).toContain('active')

    await wrapper.get('[data-testid="docs-tool-option-claude"]').trigger('click')
    await nextTick()

    expect(wrapper.find('[data-testid="docs-api-key-input"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="docs-api-key-link"]').text()).toContain('我的 API Key')
    expect(wrapper.get('[data-testid="docs-api-key-link"]').attributes('href')).toBe('/keys')
    expect(wrapper.get('[data-testid="docs-key-prerequisite"] a[href="/keys"]').text()).toContain('我的密钥')
    expect(wrapper.find('.docs-shell-tabs').exists()).toBe(true)
    expect(wrapper.get('[data-testid="docs-recommended-tool"]').classes()).not.toContain('active')
    expect(wrapper.get('[data-testid="docs-tool-option-claude"]').classes()).toContain('active')
    expect(wrapper.findAll('.docs-recommended-tool.active, .docs-tool-option-row.active')).toHaveLength(1)
  })

  it('places the tool picker before the manual API key controls', async () => {
    const wrapper = mount(DocsView, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>'
          },
          Icon: true
        }
      }
    })

    await wrapper.get('[data-testid="docs-tool-option-claude"]').trigger('click')
    await nextTick()

    const toolSectionChildren = Array.from(wrapper.get('#tools').element.children)
    const toolPickerIndex = toolSectionChildren.findIndex((child) => child.classList.contains('docs-tool-picker'))
    const configControlsIndex = toolSectionChildren.findIndex((child) =>
      child.classList.contains('docs-config-controls')
    )

    expect(toolPickerIndex).toBeGreaterThan(-1)
    expect(configControlsIndex).toBeGreaterThan(-1)
    expect(toolPickerIndex).toBeLessThan(configControlsIndex)
  })

  it('groups tool choices into a compact recommended entry and lighter manual configuration entries with icons', () => {
    const wrapper = mount(DocsView, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>'
          },
          Icon: true
        }
      }
    })

    const recommended = wrapper.get('[data-testid="docs-recommended-tool"]')
    const backup = wrapper.get('[data-testid="docs-backup-tools"]')

    expect(recommended.text()).toContain('推荐方案')
    expect(recommended.text()).toContain('CC-Switch')
    expect(recommended.classes()).toContain('active')
    expect(recommended.find('[data-testid="docs-tool-logo"]').exists()).toBe(true)
    expect(recommended.find('[data-testid="docs-tool-icon"]').exists()).toBe(true)
    expect(recommended.find('[data-testid="docs-tool-logo"] img').attributes('src')).toBe('/landing-support/cc-switch.png')
    expect(recommended.find('a[href="https://ccswitch.io"]').text()).toContain('下载地址')
    expect(recommended.find('a[href="https://ccswitch.io"]').classes()).toContain('docs-text-link')
    expect(recommended.find('button.docs-tool-card-button').exists()).toBe(false)

    expect(backup.text()).toContain('手动配置')
    expect(backup.text()).not.toContain('直连 CLI')
    expect(backup.text()).not.toContain('Codex 配置')
    expect(backup.text()).not.toContain('通用接口')
    expect(wrapper.find('.docs-tabs').exists()).toBe(false)

    const options = wrapper.findAll('[data-testid^="docs-tool-option"]')
    expect(options).toHaveLength(6)
    expect(wrapper.findAll('.docs-tool-option-row')).toHaveLength(5)
    expect(wrapper.findAll('[data-testid="docs-tool-icon"]').length).toBeGreaterThanOrEqual(6)
    expect(wrapper.findAll('.docs-tool-logo img').length).toBeGreaterThanOrEqual(5)
    expect(wrapper.get('[data-testid="docs-tool-option-codex"] .docs-tool-logo img').attributes('src')).toBe('/landing-support/codex.svg')
    expect(wrapper.get('[data-testid="docs-tool-option-codex-ws"] .docs-tool-logo img').attributes('src')).toBe('/landing-support/codex.svg')
    expect(wrapper.get('[data-testid="docs-tool-option-openai"] .docs-tool-logo img').attributes('src')).toBe('/logo.png')
    expect(wrapper.html()).not.toContain('registry.npmmirror.com')
    expect(wrapper.get('[data-testid="docs-tool-option-codex"] .docs-tool-icon').classes()).not.toContain('tone-light')
    expect(wrapper.get('[data-testid="docs-tool-option-codex-ws"] .docs-tool-icon').classes()).not.toContain('tone-light')
    expect(wrapper.get('[data-testid="docs-tool-option-openai"] .docs-tool-icon').classes()).toContain('tone-light')
    expect(wrapper.get('[data-testid="docs-tool-option-claude"] .docs-tool-icon').classes()).not.toContain('tone-light')
    expect(wrapper.get('[data-testid="docs-tool-option-codex-ws"]').text()).toContain('WS')
  })

  it('keeps the recommended card visually neutral when a manual tool is selected', async () => {
    const wrapper = mount(DocsView, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>'
          },
          Icon: true
        }
      }
    })

    await wrapper.get('[data-testid="docs-tool-option-claude"]').trigger('click')
    await nextTick()

    expect(wrapper.get('[data-testid="docs-recommended-tool"]').classes()).not.toContain('active')
    expect(wrapper.get('[data-testid="docs-tool-option-claude"]').classes()).toContain('active')

    const source = readFileSync(docsViewSourcePath, 'utf8')
    const recommendedBaseRule = source.match(/\.docs-recommended-tool\s*\{(?<rule>[\s\S]*?)\}/)?.groups?.rule ?? ''
    const recommendedActiveRule = source.match(/\.docs-recommended-tool\.active\s*\{(?<rule>[\s\S]*?)\}/)?.groups?.rule ?? ''
    const manualActiveRule = source.match(/\n\.docs-tool-option-row\.active\s*\{(?<rule>[\s\S]*?)\}/)?.groups?.rule ?? ''

    expect(recommendedBaseRule).toContain('border: 1px solid var(--theme-border)')
    expect(recommendedBaseRule).toContain('background: var(--theme-surface)')
    expect(recommendedBaseRule).not.toMatch(/(?:border|background)[^;]*var\(--theme-primary/)
    expect(recommendedActiveRule).toMatch(/(?:border|background)[^;]*var\(--theme-primary/)
    expect(recommendedActiveRule).toContain('border-color: color-mix(in srgb, var(--theme-primary)')
    expect(recommendedActiveRule).toContain('background: color-mix(in srgb, var(--theme-primary) 8%, var(--theme-surface))')
    expect(manualActiveRule).toContain('border-color: color-mix(in srgb, var(--theme-primary)')
    expect(manualActiveRule).toContain('background: color-mix(in srgb, var(--theme-primary) 8%')
    expect(source).not.toContain('.docs-recommended-tool.active::before')
  })

  it('generates copyable config from the API key input and selected OS', async () => {
    const wrapper = mount(DocsView, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>'
          },
          Icon: true
        }
      }
    })

    await wrapper.get('[data-testid="docs-tool-option-claude"]').trigger('click')
    await nextTick()
    await wrapper.get('[data-testid="docs-api-key-input"]').setValue('sk-real-key')
    await wrapper.findAll('.docs-shell-tab').find((button) => button.text() === 'PowerShell')?.trigger('click')
    await nextTick()

    expect(wrapper.html()).toContain('$env:ANTHROPIC_BASE_URL="https://code.hahacode.work"')
    expect(wrapper.html()).toContain('$env:ANTHROPIC_AUTH_TOKEN="sk-real-key"')

    const copyButtons = wrapper.findAll('.docs-copy-button')
    expect(copyButtons.length).toBeGreaterThan(0)

    await copyButtons[0].trigger('click')
    await nextTick()

    expect(copyToClipboard).toHaveBeenCalledWith(
      expect.stringContaining('$env:ANTHROPIC_AUTH_TOKEN="sk-real-key"'),
      '已复制配置'
    )
    expect(copyButtons[0].text()).toContain('已复制')
  })

  it('derives Base URL from public settings instead of hardcoding it', async () => {
    appState.cachedPublicSettings.api_base_url = 'https://tenant.example.dev/api'
    appState.apiBaseUrl = 'https://fallback.example.dev'

    const wrapper = mount(DocsView, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>'
          },
          Icon: true
        }
      }
    })

    expect(wrapper.get('.docs-endpoint-panel code').text()).toBe('https://tenant.example.dev/api')

    await wrapper.get('[data-testid="docs-tool-option-claude"]').trigger('click')
    await nextTick()
    expect(wrapper.html()).toContain('ANTHROPIC_BASE_URL="https://tenant.example.dev/api"')

    await wrapper.get('[data-testid="docs-tool-option-openai"]').trigger('click')
    await nextTick()
    expect(wrapper.html()).toContain('curl https://tenant.example.dev/api/v1/chat/completions')

    await wrapper.get('[data-testid="docs-tool-option-gemini"]').trigger('click')
    await nextTick()
    expect(wrapper.html()).toContain('GOOGLE_GEMINI_BASE_URL="https://tenant.example.dev/api"')
    expect(wrapper.text()).toContain('https://tenant.example.dev/api/v1beta/models')
  })

  it('falls back to the current origin when no API Base URL is configured', async () => {
    appState.cachedPublicSettings.api_base_url = ''
    appState.apiBaseUrl = ''
    vi.stubGlobal('location', {
      ...window.location,
      origin: 'https://code.hahacode.top'
    })

    const wrapper = mount(DocsView, {
      global: {
        stubs: {
          RouterLink: {
            props: ['to'],
            template: '<a :href="to"><slot /></a>'
          },
          Icon: true
        }
      }
    })

    expect(wrapper.get('.docs-endpoint-panel code').text()).toBe('https://code.hahacode.top')
    expect(wrapper.html()).not.toContain('https://code.hahacode.work')

    await wrapper.get('[data-testid="docs-tool-option-openai"]').trigger('click')
    await nextTick()
    expect(wrapper.html()).toContain('curl https://code.hahacode.top/v1/chat/completions')

    vi.unstubAllGlobals()
  })

  it('uses the same Codex and Gemini fields as the product use-key modal', async () => {
    const docsSource = readFileSync(docsViewSourcePath, 'utf8')
    const useKeyModalSource = readFileSync(path.resolve(process.cwd(), 'src/components/keys/UseKeyModal.vue'), 'utf8')
    const ccswitchImportSource = readFileSync(ccswitchImportSourcePath, 'utf8')

    for (const token of [
      'model_reasoning_effort = "xhigh"',
      'disable_response_storage = true',
      'wire_api = "responses"',
      'supports_websockets = true',
      'responses_websockets_v2 = true',
      'GOOGLE_GEMINI_BASE_URL',
      'GEMINI_API_KEY',
      'GEMINI_MODEL'
    ]) {
      expect(useKeyModalSource).toContain(token)
      expect(docsSource).toContain(token)
    }

    for (const token of [
      'model_context_window = 1000000',
      'model_auto_compact_token_limit = 900000'
    ]) {
      expect(useKeyModalSource).not.toContain(token)
      expect(docsSource).not.toContain(token)
    }

    for (const token of [
      'buildCcSwitchImportDeeplink',
      'OPENAI_CC_SWITCH_CODEX_MODEL',
      'ccswitch://v1/import',
      'usageAutoInterval'
    ]) {
      expect(ccswitchImportSource).toContain(token)
    }

    expect(docsSource).toContain('ccSwitchFlowSteps')
    expect(docsSource).toContain('class="docs-flow"')
    expect(docsSource).not.toContain('generateCcSwitchFiles')
    expect(docsSource).not.toContain('buildCcSwitchImportDeeplink')
    expect(docsSource).not.toContain('ccswitch://v1/import')
    expect(docsSource).not.toContain('usageAutoInterval')
  })

  it('keeps docs content in a real route that is allowed in backend mode', () => {
    const routerSource = readFileSync(routerSourcePath, 'utf8')

    expect(routerSource).toContain("path: '/docs'")
    expect(routerSource).toContain("name: 'Docs'")
    expect(routerSource).toContain("component: () => import('@/views/DocsView.vue')")
    expect(routerSource).toContain("const BACKEND_MODE_ALLOWED_PATHS = ['/login', '/key-usage', '/setup', '/payment/result', '/payment/airwallex', '/legal', '/docs']")
  })

  it('uses restrained docs layout styles instead of landing-page marketing patterns', () => {
    const source = readFileSync(docsViewSourcePath, 'utf8')

    expect(source).toContain('.docs-shell')
    expect(source).toContain('.docs-toc')
    expect(source).toContain('.docs-code')
    expect(source).toContain('.docs-related-links')
    expect(source).toContain('.docs-footer')
    expect(source).toContain('.docs-faq-question')
    const sectionRule = source.match(/\.docs-section\s*\{(?<rule>[\s\S]*?)\}/)?.groups?.rule ?? ''
    const toolPanelRule = source.match(/\.docs-tool-panel,\n\.docs-faq article\s*\{(?<rule>[\s\S]*?)\}/)?.groups?.rule ?? ''
    expect(sectionRule).toContain('border: 1px solid var(--theme-border)')
    expect(sectionRule).toContain('border-radius: 0.5rem')
    expect(sectionRule).toContain('background: var(--theme-surface)')
    expect(sectionRule).toContain('padding: clamp(1rem, 3vw, 1.5rem)')
    expect(toolPanelRule).not.toContain('background:')
    expect(toolPanelRule).not.toContain('border-radius:')
    expect(source).not.toContain('ccSwitchIntroCards')
    expect(source).not.toContain('.docs-card')
    expect(source).not.toContain('.docs-recommendation-card')
    expect(source).not.toContain('radial-gradient')
    expect(source).not.toContain('linear-gradient')
  })
})
