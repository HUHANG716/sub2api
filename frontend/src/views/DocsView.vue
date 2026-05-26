<template>
  <main class="docs-shell">
    <section class="docs-hero">
      <div class="docs-hero-main">
        <router-link to="/home" class="docs-brand">
          <span class="docs-brand-mark">
            <img :src="siteLogo || '/logo.png'" :alt="siteName" />
          </span>
          <span>{{ siteName }}</span>
        </router-link>
        <h1>{{ siteName }} 文档中心</h1>
        <div class="docs-hero-actions">
          <a href="#tools" class="docs-primary-action">
            <Icon name="play" size="sm" />
            开始配置
          </a>
          <router-link to="/keys" class="docs-secondary-action">
            <Icon name="key" size="sm" />
            创建 API Key
          </router-link>
        </div>
      </div>

      <aside class="docs-endpoint-panel" aria-label="API endpoint">
        <span>当前 API 入口</span>
        <code>{{ apiBaseUrl }}</code>
      </aside>
    </section>

    <div class="docs-layout">
      <aside class="docs-toc" aria-label="文档目录">
        <p>目录</p>
        <a v-for="item in tocItems" :key="item.href" :href="item.href">
          <span class="docs-toc-number">{{ item.number }}</span>
          <span>{{ item.label }}</span>
        </a>
      </aside>

      <div class="docs-content">
        <section id="tools" class="docs-section">
          <div class="docs-section-heading">
            <span>01</span>
            <h2>快速开始</h2>
          </div>
          <div class="docs-tool-picker" aria-label="工具配置入口">
            <article
              data-testid="docs-recommended-tool"
              class="docs-recommended-tool"
              :class="{ active: activeTool === recommendedTool.id }"
            >
              <button
                :data-testid="`docs-tool-option-${recommendedTool.id}`"
                type="button"
                class="docs-recommended-button"
                @click="activeTool = recommendedTool.id"
              >
                <span class="docs-recommended-main">
                  <span class="docs-tool-logo recommended" data-testid="docs-tool-logo">
                    <span class="docs-tool-icon recommended" :class="recommendedTool.icon.tone && `tone-${recommendedTool.icon.tone}`" data-testid="docs-tool-icon">
                      <img v-if="recommendedTool.icon.kind === 'brand'" :src="recommendedTool.icon.src" :alt="`${recommendedTool.name} Logo`" />
                      <Icon v-else :name="recommendedTool.icon.name" size="lg" />
                    </span>
                  </span>
                  <span class="docs-tool-copy">
                    <span class="docs-tool-kicker">
                      <Icon name="badge" size="xs" />
                      推荐方案
                    </span>
                    <strong>{{ recommendedTool.name }}</strong>
                    <small>{{ recommendedTool.summary }}</small>
                  </span>
                </span>
                <span class="docs-recommended-actions">
                  <Icon name="chevronRight" size="sm" class="docs-tool-row-arrow" />
                </span>
              </button>
              <div class="docs-recommended-links">
                <a class="docs-text-link" href="https://ccswitch.io" target="_blank" rel="noopener noreferrer" @click.stop>
                  <Icon name="download" size="sm" />
                  下载地址
                </a>
              </div>
            </article>

            <div class="docs-backup-tools" data-testid="docs-backup-tools">
              <div class="docs-backup-heading">
                <span>手动配置</span>
                <small>仅在 CC-Switch 不可用或需要临时调试时使用</small>
              </div>
              <div class="docs-tool-options">
                <button
                  v-for="tool in manualToolOptions"
                  :key="tool.id"
                  :data-testid="`docs-tool-option-${tool.id}`"
                  type="button"
                  class="docs-tool-option-row"
                  :class="{ active: activeTool === tool.id }"
                  @click="activeTool = tool.id"
                >
                  <span class="docs-tool-logo" data-testid="docs-tool-logo">
                    <span class="docs-tool-icon" :class="tool.icon.tone && `tone-${tool.icon.tone}`" data-testid="docs-tool-icon">
                      <img v-if="tool.icon.kind === 'brand'" :src="tool.icon.src" :alt="`${tool.name} Logo`" />
                      <Icon v-else :name="tool.icon.name" size="md" />
                    </span>
                  </span>
                  <span class="docs-tool-option-copy">
                    <strong>
                      {{ tool.name }}
                      <em v-if="tool.badge">{{ tool.badge }}</em>
                    </strong>
                    <small>{{ tool.summary }}</small>
                  </span>
                </button>
              </div>
            </div>
          </div>
          <div class="docs-key-prerequisite" data-testid="docs-key-prerequisite">
            <Icon name="key" size="sm" />
            <span>
              还没有 API Key？先到
              <router-link to="/keys" class="docs-inline-link">我的密钥</router-link>
              点击“创建密钥”，选择可用分组后再导入或复制配置。
            </span>
          </div>
          <div v-if="showManualConfigControls" class="docs-config-controls">
            <label class="docs-field">
              <span class="docs-field-label">
                <span>API Key</span>
                <router-link to="/keys" class="docs-inline-link docs-field-link" data-testid="docs-api-key-link">
                  我的 API Key
                </router-link>
              </span>
              <input
                v-model="apiKeyInput"
                data-testid="docs-api-key-input"
                type="password"
                autocomplete="off"
                spellcheck="false"
                placeholder="粘贴你的 API Key，留空则使用占位符"
              />
            </label>
            <div class="docs-shell-tabs" role="group" aria-label="系统类型">
              <button
                v-for="shell in availableShellTabs"
                :key="shell.id"
                type="button"
                class="docs-shell-tab"
                :class="{ active: activeShell === shell.id }"
                @click="activeShell = shell.id"
              >
                {{ shell.label }}
              </button>
            </div>
          </div>

          <article class="docs-tool-panel">
            <div class="docs-tool-intro">
              <span v-if="selectedTool.recommended" class="docs-recommended-badge">
                <Icon name="badge" size="sm" />
                推荐方案
              </span>
              <h3>{{ selectedTool.name }}</h3>
              <p>{{ selectedTool.description }}</p>
            </div>
            <div v-if="selectedTool.id === 'cc-switch'" class="docs-download-panel">
              <div class="docs-download-main">
                <span class="docs-download-icon">
                  <img :src="brandIcons.ccSwitch" alt="CC-Switch Logo" />
                </span>
                <div>
                  <span>下载 CC-Switch</span>
                  <h4>先安装桌面端，再回到 Hahacode 一键导入</h4>
                  <p>
                    支持 Windows / macOS / Linux。下载并打开 CC-Switch 后，回到“我的密钥”点击“导入到 CCS”。
                  </p>
                </div>
              </div>
              <div class="docs-download-actions">
                <a href="https://ccswitch.io" target="_blank" rel="noopener noreferrer">
                  <Icon name="download" size="sm" />
                  下载地址
                </a>
              </div>
            </div>
            <ol v-if="selectedTool.id === 'cc-switch'" class="docs-flow" aria-label="CC-Switch 推荐流程">
              <li v-for="(step, index) in ccSwitchFlowSteps" :key="step.title" class="docs-flow-step">
                <span class="docs-flow-index">{{ index + 1 }}</span>
                <div>
                  <strong>{{ step.title }}</strong>
                  <p>
                    <template v-for="(segment, segmentIndex) in step.description" :key="segmentIndex">
                      <router-link v-if="segment.to" :to="segment.to" class="docs-inline-link">
                        {{ segment.text }}
                      </router-link>
                      <a
                        v-else-if="segment.href"
                        :href="segment.href"
                        class="docs-inline-link"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {{ segment.text }}
                      </a>
                      <span v-else>{{ segment.text }}</span>
                    </template>
                  </p>
                </div>
              </li>
            </ol>
            <div v-else class="docs-code-stack">
              <div v-for="(file, index) in selectedTool.files" :key="file.path" class="docs-code-block">
                <div class="docs-code-head">
                  <span>{{ file.path }}</span>
                  <button type="button" class="docs-copy-button" @click="copyConfig(file.content, index)">
                    <Icon :name="copiedIndex === index ? 'check' : 'copy'" size="sm" />
                    {{ copiedIndex === index ? '已复制' : '复制' }}
                  </button>
                </div>
                <pre class="docs-code"><code>{{ file.content }}</code></pre>
              </div>
            </div>
            <p class="docs-note">{{ selectedTool.note }}</p>
          </article>
        </section>

        <nav class="docs-related-links" aria-label="相关入口">
          <span>相关入口</span>
          <router-link to="/keys">我的密钥</router-link>
          <router-link to="/subscriptions">订阅套餐</router-link>
          <router-link to="/usage">用量记录</router-link>
        </nav>

        <section id="faq" class="docs-section">
          <div class="docs-section-heading">
            <span>02</span>
            <h2>常见问题</h2>
          </div>
          <div class="docs-faq">
            <article v-for="(item, index) in faqItems" :key="item.question">
              <h3>
                <span class="docs-faq-number">{{ String(index + 1).padStart(2, '0') }}</span>
                <span class="docs-faq-question">
                  <template v-if="item.questionSegments">
                    <template v-for="(segment, segmentIndex) in item.questionSegments" :key="segmentIndex">
                      <code v-if="segment.code" class="docs-inline-code">{{ segment.text }}</code>
                      <span v-else>{{ segment.text }}</span>
                    </template>
                  </template>
                  <template v-else>{{ item.question }}</template>
                </span>
              </h3>
              <p>
                <template v-for="(segment, segmentIndex) in item.answer" :key="segmentIndex">
                  <router-link v-if="segment.to" :to="segment.to" class="docs-inline-link">
                    {{ segment.text }}
                  </router-link>
                  <span v-else>{{ segment.text }}</span>
                </template>
              </p>
            </article>
          </div>
        </section>

        <footer class="docs-footer">
          <router-link to="/legal/terms">服务条款</router-link>
          <router-link to="/legal/usage-policy">使用政策</router-link>
          <router-link to="/legal/supported-regions">支持地区</router-link>
          <span v-if="contactInfo" class="docs-footer-contact">联系支持：{{ contactInfo }}</span>
        </footer>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useAppStore } from '@/stores'
import { useClipboard } from '@/composables/useClipboard'
import Icon from '@/components/icons/Icon.vue'

type ToolId = 'cc-switch' | 'claude' | 'codex' | 'codex-ws' | 'gemini' | 'openai'
type ShellId = 'unix' | 'cmd' | 'powershell' | 'windows'

interface LinkedTextSegment {
  text: string
  to?: string
  href?: string
  code?: boolean
}

interface FlowStep {
  title: string
  description: LinkedTextSegment[]
}

interface DocsFileConfig {
  path: string
  content: string
}

interface DocsToolConfig {
  id: ToolId
  name: string
  description: string
  summary: string
  group: 'recommended' | 'cli' | 'codex' | 'generic'
  icon: ToolIconConfig
  badge?: string
  files: DocsFileConfig[]
  note: string
  recommended?: boolean
}

type LocalToolIconName = 'swap'

interface LocalToolIconConfig {
  kind: 'local'
  name: LocalToolIconName
  tone?: 'light'
}

interface BrandToolIconConfig {
  kind: 'brand'
  src: string
  tone?: 'light'
}

type ToolIconConfig = LocalToolIconConfig | BrandToolIconConfig

const appStore = useAppStore()
const { copyToClipboard } = useClipboard()
const activeTool = ref<ToolId>('cc-switch')
const activeShell = ref<ShellId>('unix')
const apiKeyInput = ref('')
const copiedIndex = ref<number | null>(null)

const siteName = computed(() => appStore.cachedPublicSettings?.site_name || appStore.siteName || 'Hahacode')
const siteLogo = computed(() => appStore.cachedPublicSettings?.site_logo || appStore.siteLogo || '')
const contactInfo = computed(() => appStore.cachedPublicSettings?.contact_info || appStore.contactInfo || '')
const apiBaseUrl = computed(() => {
  const configured = appStore.cachedPublicSettings?.api_base_url || appStore.apiBaseUrl
  if (configured) return configured.replace(/\/+$/, '')
  return 'https://code.hahacode.work'
})

const v1BaseUrl = computed(() => `${apiBaseUrl.value}/v1`)
const geminiBaseUrl = computed(() => `${apiBaseUrl.value}/v1beta`)
const effectiveApiKey = computed(() => apiKeyInput.value.trim() || '你的 API Key')

const shellTabs = [
  { id: 'unix' as const, label: 'macOS / Linux' },
  { id: 'cmd' as const, label: 'Windows CMD' },
  { id: 'powershell' as const, label: 'PowerShell' }
]

const codexShellTabs = [
  { id: 'unix' as const, label: 'macOS / Linux' },
  { id: 'windows' as const, label: 'Windows' }
]

const availableShellTabs = computed(() => (
  activeTool.value === 'codex' || activeTool.value === 'codex-ws' ? codexShellTabs : shellTabs
))

const tocItems = [
  { href: '#tools', number: '1', label: '快速开始' },
  { href: '#faq', number: '2', label: '常见问题 FAQ' }
]

const brandIconBase = 'https://registry.npmmirror.com/@lobehub/icons-static-svg/latest/files/icons'
const brandIcons = {
  ccSwitch: '/landing-support/cc-switch.png',
  claude: `${brandIconBase}/claude-color.svg`,
  codex: `${brandIconBase}/codex-color.svg`,
  gemini: `${brandIconBase}/gemini-color.svg`,
  openai: `${brandIconBase}/openai.svg`
} as const

const ccSwitchFlowSteps: FlowStep[] = [
  {
    title: '下载并打开 CC-Switch',
    description: [
      { text: '打开' },
      { text: '下载页', href: 'https://ccswitch.io' },
      { text: '安装桌面端。安装完成后先打开 CC-Switch，让它在后台保持运行。' }
    ]
  },
  {
    title: '在“我的密钥”点击“导入到 CCS”',
    description: [
      { text: '如果还没有 API Key，先到' },
      { text: '我的密钥', to: '/keys' },
      { text: '点击“创建密钥”并选择可用分组；已有密钥则按提示完成导入，并在 CC-Switch 中确认导入项。' }
    ]
  },
  {
    title: '启用导入项并重启对应客户端',
    description: [
      { text: '导入完成后，在 CC-Switch 中启用对应配置并重启 Claude Code、Codex 或 Gemini CLI；发起一次请求后到' },
      { text: '用量记录', to: '/usage' },
      { text: '确认请求被记录。' }
    ]
  }
]

const toolConfigs = computed<DocsToolConfig[]>(() => [
  {
    id: 'cc-switch',
    name: 'CC-Switch',
    description: '推荐优先使用 CC-Switch 统一管理 Claude Code、Codex 和 Gemini CLI。Hahacode 已内置“导入到 CCS”，会按密钥所属分组完成对应导入配置。',
    summary: '一键导入，优先推荐',
    group: 'recommended',
    icon: { kind: 'brand', src: brandIcons.ccSwitch },
    files: [],
    note: '手动配置仍保留在后续标签里；只有 CC-Switch 不可用或你需要临时调试时，才建议复制环境变量或配置文件。',
    recommended: true
  },
  {
    id: 'claude',
    name: 'Claude Code',
    description: '适合 Claude Messages 协议账号或支持 Messages 转发的分组。',
    summary: 'Claude 官方 CLI',
    group: 'cli',
    icon: { kind: 'brand', src: brandIcons.claude },
    files: generateAnthropicFiles(apiBaseUrl.value, effectiveApiKey.value, activeShell.value),
    note: '字段与控制台“使用密钥”弹窗保持一致；VSCode Claude Code 可使用 settings.json。'
  },
  {
    id: 'codex',
    name: 'Codex',
    description: '适合 OpenAI Responses 协议账号，生成 config.toml 与 auth.json 两个文件。',
    summary: 'Responses 配置',
    group: 'codex',
    icon: { kind: 'brand', src: brandIcons.codex },
    files: generateOpenAIFiles(apiBaseUrl.value, effectiveApiKey.value, activeShell.value, false),
    note: '这组字段来自产品“使用密钥”弹窗，默认关闭 response storage，并启用 Responses wire API。'
  },
  {
    id: 'codex-ws',
    name: 'Codex WS',
    description: '适合需要 Responses WebSocket v2 的 Codex 配置。',
    summary: 'WebSocket v2 配置',
    group: 'codex',
    icon: { kind: 'brand', src: brandIcons.codex },
    badge: 'WS',
    files: generateOpenAIFiles(apiBaseUrl.value, effectiveApiKey.value, activeShell.value, true),
    note: '仅在你的账号和通道支持 WebSocket v2 时使用；不确定时优先选择普通 Codex。'
  },
  {
    id: 'gemini',
    name: 'Gemini CLI',
    description: '适合 Gemini v1beta 协议账号。',
    summary: 'Google Gemini CLI',
    group: 'cli',
    icon: { kind: 'brand', src: brandIcons.gemini },
    files: [generateGeminiCliContent(apiBaseUrl.value, effectiveApiKey.value, activeShell.value)],
    note: `需要手动拼端点时，Gemini 模型列表通常使用 ${geminiBaseUrl.value}/models。`
  },
  {
    id: 'openai',
    name: 'OpenAI 兼容',
    description: '适合支持 OpenAI Chat Completions 或 Responses 的 SDK、脚本和第三方工具。',
    summary: 'SDK / curl / 第三方工具',
    group: 'generic',
    icon: { kind: 'brand', src: brandIcons.openai, tone: 'light' },
    files: [{
      path: 'curl',
      content: `curl ${v1BaseUrl.value}/chat/completions \\
  -H "Authorization: Bearer 你的 API Key" \\
  -H "Content-Type: application/json" \\
  -d '{"model":"gpt-5.4","messages":[{"role":"user","content":"hello"}]}'`
    }],
    note: '如果工具要求 Base URL 填到 /v1，就使用上方 API 入口加 /v1。'
  }
])

const recommendedTool = computed(() => toolConfigs.value.find((tool) => tool.recommended) ?? toolConfigs.value[0])
const backupToolGroups = computed(() => [
  {
    title: '直连 CLI',
    tools: toolConfigs.value.filter((tool) => tool.group === 'cli')
  },
  {
    title: 'Codex 配置',
    tools: toolConfigs.value.filter((tool) => tool.group === 'codex')
  },
  {
    title: '通用接口',
    tools: toolConfigs.value.filter((tool) => tool.group === 'generic')
  }
])
const manualToolOptions = computed(() => backupToolGroups.value.flatMap((group) => group.tools))
const selectedTool = computed(() => toolConfigs.value.find((tool) => tool.id === activeTool.value) ?? toolConfigs.value[0])
const showManualConfigControls = computed(() => selectedTool.value.id !== 'cc-switch')

function normalizeDocsShell(shell: ShellId): ShellId {
  if ((activeTool.value === 'codex' || activeTool.value === 'codex-ws') && shell !== 'windows') return 'unix'
  if (activeTool.value !== 'codex' && activeTool.value !== 'codex-ws' && shell === 'windows') return 'unix'
  return shell
}

function generateAnthropicFiles(baseUrl: string, apiKey: string, shell: ShellId): DocsFileConfig[] {
  const normalizedShell = normalizeDocsShell(shell)
  let path: string
  let content: string

  switch (normalizedShell) {
    case 'cmd':
      path = 'Command Prompt'
      content = `set ANTHROPIC_BASE_URL=${baseUrl}
set ANTHROPIC_AUTH_TOKEN=${apiKey}
set CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`
      break
    case 'powershell':
      path = 'PowerShell'
      content = `$env:ANTHROPIC_BASE_URL="${baseUrl}"
$env:ANTHROPIC_AUTH_TOKEN="${apiKey}"
$env:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`
      break
    default:
      path = 'Terminal'
      content = `export ANTHROPIC_BASE_URL="${baseUrl}"
export ANTHROPIC_AUTH_TOKEN="${apiKey}"
export CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC=1`
  }

  const settingsPath = normalizedShell === 'unix'
    ? '~/.claude/settings.json'
    : '%userprofile%\\.claude\\settings.json'

  return [
    { path, content },
    {
      path: settingsPath,
      content: `{
  "env": {
    "ANTHROPIC_BASE_URL": "${baseUrl}",
    "ANTHROPIC_AUTH_TOKEN": "${apiKey}",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
    "CLAUDE_CODE_ATTRIBUTION_HEADER": "0"
  }
}`
    }
  ]
}

function generateGeminiCliContent(baseUrl: string, apiKey: string, shell: ShellId): DocsFileConfig {
  const normalizedShell = normalizeDocsShell(shell)
  const model = 'gemini-2.0-flash'

  switch (normalizedShell) {
    case 'cmd':
      return {
        path: 'Command Prompt',
        content: `set GOOGLE_GEMINI_BASE_URL=${baseUrl}
set GEMINI_API_KEY=${apiKey}
set GEMINI_MODEL=${model}
REM 默认模型，可按可用渠道调整`
      }
    case 'powershell':
      return {
        path: 'PowerShell',
        content: `$env:GOOGLE_GEMINI_BASE_URL="${baseUrl}"
$env:GEMINI_API_KEY="${apiKey}"
$env:GEMINI_MODEL="${model}"  # 默认模型，可按可用渠道调整`
      }
    default:
      return {
        path: 'Terminal',
        content: `export GOOGLE_GEMINI_BASE_URL="${baseUrl}"
export GEMINI_API_KEY="${apiKey}"
export GEMINI_MODEL="${model}"  # 默认模型，可按可用渠道调整`
      }
  }
}

function generateOpenAIFiles(baseUrl: string, apiKey: string, shell: ShellId, websocket: boolean): DocsFileConfig[] {
  const configDir = shell === 'windows' ? '%userprofile%\\.codex' : '~/.codex'
  const websocketConfig = websocket
    ? `supports_websockets = true
requires_openai_auth = true

[features]
responses_websockets_v2 = true`
    : 'requires_openai_auth = true'

  return [
    {
      path: `${configDir}/config.toml`,
      content: `model_provider = "OpenAI"
model = "gpt-5.4"
review_model = "gpt-5.4"
model_reasoning_effort = "xhigh"
disable_response_storage = true
network_access = "enabled"
windows_wsl_setup_acknowledged = true

[model_providers.OpenAI]
name = "OpenAI"
base_url = "${baseUrl}"
wire_api = "responses"
${websocketConfig}`
    },
    {
      path: `${configDir}/auth.json`,
      content: `{
  "OPENAI_API_KEY": "${apiKey}"
}`
    }
  ]
}

async function copyConfig(content: string, index: number) {
  const success = await copyToClipboard(content, '已复制配置')
  if (success) {
    copiedIndex.value = index
    setTimeout(() => {
      copiedIndex.value = null
    }, 2000)
  }
}

const faqItems: Array<{ question: string; questionSegments?: LinkedTextSegment[]; answer: LinkedTextSegment[] }> = [
  {
    question: '401 或鉴权失败怎么办？',
    answer: [
      { text: '先确认 API Key 没有多复制空格、没有被禁用；需要重新复制时回到' },
      { text: '我的密钥', to: '/keys' },
      { text: '，并且工具使用的是当前页面显示的 API 入口。' }
    ]
  },
  {
    question: '提示额度不足或无可用订阅怎么办？',
    answer: [
      { text: '检查余额、' },
      { text: '订阅', to: '/subscriptions' },
      { text: '有效期、' },
      { text: '兑换码', to: '/redeem' },
      { text: '是否生效，以及当前密钥所属分组是否允许使用目标模型。' }
    ]
  },
  {
    question: '遇到 Selected model is at capacity. Please try a different model. 怎么办？',
    questionSegments: [
      { text: '遇到' },
      { text: 'Selected model is at capacity. Please try a different model.', code: true },
      { text: '怎么办？' }
    ],
    answer: [
      { text: '这是 OpenAI 官方侧的模型容量问题，高峰期可能会出现，通常不是 Hahacode 密钥、余额或订阅配置异常。建议先重试请求；如持续失败，可切换至其他可用模型或其他可用分组。' }
    ]
  },
  {
    question: '配置后没有生效怎么办？',
    answer: [
      { text: '重启对应 CLI 或编辑器进程，确认环境变量在当前终端会话中可见，再发起一次最小请求，然后到' },
      { text: '用量记录', to: '/usage' },
      { text: '验证。' }
    ]
  }
]

onMounted(() => {
  if (!appStore.publicSettingsLoaded) {
    appStore.fetchPublicSettings()
  }
})
</script>

<style scoped>
.docs-shell {
  min-height: 100vh;
  background: var(--theme-bg);
  color: var(--theme-text);
}

.docs-hero {
  display: grid;
  gap: 1rem;
  padding: clamp(1rem, 3vw, 1.8rem);
  border-bottom: 1px solid var(--theme-border);
}

.docs-hero-main {
  min-width: 0;
  max-width: 52rem;
}

.docs-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  color: var(--theme-text);
  font-weight: 800;
}

.docs-brand-mark {
  display: inline-flex;
  height: 2.25rem;
  width: 2.25rem;
  align-items: center;
  justify-content: center;
}

.docs-brand-mark img {
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
}

.docs-hero h1 {
  margin-top: 1.1rem;
  color: var(--theme-text);
  font-size: clamp(1.85rem, 4vw, 3rem);
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1.04;
}

.docs-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1rem;
}

.docs-primary-action,
.docs-secondary-action {
  display: inline-flex;
  min-height: 2.75rem;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  border-radius: 0.5rem;
  padding: 0 1rem;
  font-size: 0.9rem;
  font-weight: 800;
}

.docs-primary-action {
  background: var(--theme-primary);
  color: white;
}

.docs-secondary-action {
  border: 1px solid var(--theme-border);
  background: var(--theme-surface);
  color: var(--theme-text);
}

.docs-endpoint-panel {
  align-self: end;
  border: 1px solid var(--theme-border);
  border-radius: 0.5rem;
  background: var(--theme-surface);
  padding: 0.8rem 0.9rem;
}

.docs-endpoint-panel span {
  display: block;
  color: var(--theme-text-muted);
  font-size: 0.78rem;
  font-weight: 700;
}

.docs-endpoint-panel code {
  display: block;
  margin-top: 0.5rem;
  color: var(--theme-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.9rem;
  overflow-wrap: anywhere;
}

.docs-layout {
  display: grid;
  gap: 1.25rem;
  padding: clamp(1rem, 3vw, 1.8rem);
}

.docs-toc {
  display: grid;
  align-self: start;
  gap: 0.25rem;
  border-left: 1px solid var(--theme-border);
  padding: 0.25rem 0 0.25rem 0.8rem;
}

.docs-toc p {
  margin-bottom: 0.25rem;
  color: var(--theme-text);
  font-size: 0.86rem;
  font-weight: 800;
}

.docs-toc a {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.45rem;
  border-radius: 0.35rem;
  padding: 0.35rem 0.45rem;
  color: var(--theme-text-muted);
  font-size: 0.88rem;
}

.docs-toc-number {
  color: var(--theme-primary);
  font-size: 0.78rem;
  font-weight: 900;
}

.docs-toc a:hover {
  background: var(--theme-surface-muted);
  color: var(--theme-primary);
}

.docs-content {
  display: grid;
  min-width: 0;
  gap: 1rem;
}

.docs-section {
  scroll-margin-top: 5rem;
  border: 1px solid var(--theme-border);
  border-radius: 0.5rem;
  background: var(--theme-surface);
  padding: clamp(1rem, 3vw, 1.5rem);
}

.docs-section-heading {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.8rem;
}

.docs-section-heading span {
  display: inline-flex;
  height: 2rem;
  min-width: 2rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.45rem;
  background: var(--theme-primary-soft);
  color: var(--theme-primary);
  font-size: 0.78rem;
  font-weight: 900;
}

.docs-section-heading h2 {
  color: var(--theme-text);
  font-size: 1.35rem;
  font-weight: 900;
  letter-spacing: 0;
}

.docs-faq {
  display: grid;
  gap: 0.6rem;
}

.docs-tool-panel,
.docs-faq article {
  border-top: 1px solid var(--theme-border);
  padding-top: 0.85rem;
}

.docs-tool-panel h3 {
  color: var(--theme-text);
  font-size: 0.98rem;
  font-weight: 850;
}

.docs-faq h3 {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
  color: var(--theme-text);
  font-size: 0.98rem;
  font-weight: 850;
}

.docs-faq-number {
  flex: 0 0 auto;
  color: var(--theme-primary);
  font-size: 0.78rem;
  font-weight: 900;
}

.docs-faq-question {
  min-width: 0;
  line-height: 1.7;
}

.docs-inline-code {
  display: inline;
  margin: 0 0.18rem;
  border: 1px solid color-mix(in srgb, var(--theme-border) 80%, transparent);
  border-radius: 0.35rem;
  background: color-mix(in srgb, var(--theme-text) 8%, transparent);
  padding: 0.08rem 0.32rem;
  color: var(--theme-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.9em;
  font-weight: 750;
}

.docs-tool-panel p,
.docs-faq p,
.docs-note {
  margin-top: 0.55rem;
  color: var(--theme-text-muted);
  font-size: 0.9rem;
  line-height: 1.75;
}

.docs-inline-link {
  color: var(--theme-primary);
  font-weight: 850;
  text-decoration: underline;
  text-underline-offset: 0.18em;
}

.docs-inline-link:hover {
  color: var(--theme-primary-hover);
}

.docs-key-prerequisite {
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  margin: 0.85rem 0 0.9rem;
  border: 1px solid color-mix(in srgb, var(--theme-primary) 22%, var(--theme-border));
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--theme-primary) 6%, var(--theme-surface));
  padding: 0.75rem 0.85rem;
  color: var(--theme-text-muted);
  font-size: 0.88rem;
  line-height: 1.65;
}

.docs-key-prerequisite :deep(svg) {
  flex: 0 0 auto;
  margin-top: 0.18rem;
  color: var(--theme-primary);
}

.docs-config-controls {
  display: grid;
  gap: 0.75rem;
  margin-bottom: 0.9rem;
  border-top: 1px solid var(--theme-border);
  padding-top: 0.85rem;
}

.docs-field {
  display: grid;
  gap: 0.45rem;
}

.docs-field-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.docs-field-label span {
  color: var(--theme-text);
  font-size: 0.84rem;
  font-weight: 800;
}

.docs-field-link {
  flex-shrink: 0;
  font-size: 0.82rem;
}

.docs-field input {
  min-height: 2.65rem;
  min-width: 0;
  border: 1px solid var(--theme-border);
  border-radius: 0.45rem;
  background: var(--theme-surface);
  padding: 0 0.85rem;
  color: var(--theme-text);
  font-size: 0.9rem;
  outline: none;
}

.docs-field input:focus {
  border-color: color-mix(in srgb, var(--theme-primary) 52%, var(--theme-border));
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--theme-primary) 14%, transparent);
}

.docs-shell-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.docs-shell-tab {
  min-height: 2.35rem;
  border: 1px solid var(--theme-border);
  border-radius: 0.45rem;
  background: var(--theme-surface);
  padding: 0 0.85rem;
  color: var(--theme-text-muted);
  font-size: 0.84rem;
  font-weight: 800;
}

.docs-shell-tab.active {
  border-color: color-mix(in srgb, var(--theme-primary) 48%, var(--theme-border));
  background: var(--theme-primary-soft);
  color: var(--theme-primary);
}

.docs-tool-picker {
  display: grid;
  gap: 0.65rem;
  margin-bottom: 0.9rem;
}

.docs-recommended-tool {
  position: relative;
  display: grid;
  align-items: center;
  gap: 0.55rem;
  border: 1px solid var(--theme-border);
  border-radius: 0.5rem;
  background: var(--theme-surface);
  padding: 0.65rem;
}

.docs-recommended-tool.active {
  border-color: color-mix(in srgb, var(--theme-primary) 54%, var(--theme-border));
  background: color-mix(in srgb, var(--theme-primary) 8%, var(--theme-surface));
}

.docs-recommended-button,
.docs-tool-option-row {
  width: 100%;
  min-width: 0;
  border: 0;
  background: transparent;
  color: inherit;
  text-align: left;
}

.docs-recommended-button {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.5rem;
}

.docs-recommended-main {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.65rem;
}

.docs-recommended-actions {
  display: inline-flex;
  color: var(--theme-text-muted);
}

.docs-recommended-tool.active .docs-recommended-actions {
  color: var(--theme-primary);
}

.docs-recommended-links {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem;
  padding-left: 3.45rem;
}

.docs-text-link {
  display: inline-flex;
  width: fit-content;
  min-height: 1.8rem;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  font-size: 0.78rem;
  font-weight: 850;
}

.docs-text-link {
  color: var(--theme-primary);
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.docs-text-link:hover {
  color: var(--theme-primary-hover);
}

.docs-tool-logo {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
}

.docs-tool-icon {
  display: inline-flex;
  height: 2.2rem;
  width: 2.2rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--theme-border) 75%, transparent);
  border-radius: 0.5rem;
  background: var(--theme-surface);
  color: var(--theme-primary);
}

.docs-tool-icon.recommended {
  height: 2.35rem;
  width: 2.35rem;
  border-color: var(--theme-border);
  background: var(--theme-surface-muted);
  color: var(--theme-primary);
}

.docs-recommended-tool.active .docs-tool-icon.recommended {
  border-color: color-mix(in srgb, var(--theme-primary) 32%, var(--theme-border));
  background: color-mix(in srgb, var(--theme-primary) 10%, var(--theme-surface));
  color: var(--theme-primary);
}

.docs-tool-icon img {
  display: block;
  height: 1.35rem;
  width: 1.35rem;
  object-fit: contain;
}

.docs-tool-icon.tone-light img {
  filter: invert(1) brightness(1.12);
  opacity: 0.92;
}

.docs-tool-copy,
.docs-tool-option-copy {
  display: grid;
  min-width: 0;
  gap: 0.18rem;
}

.docs-tool-kicker {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 0.3rem;
  color: var(--theme-primary);
  font-size: 0.74rem;
  font-weight: 900;
}

.docs-tool-copy strong,
.docs-tool-option-copy strong {
  color: var(--theme-text);
  font-size: 0.96rem;
  font-weight: 900;
  letter-spacing: 0;
}

.docs-tool-copy small,
.docs-tool-option-copy small {
  min-width: 0;
  color: var(--theme-text-muted);
  font-size: 0.78rem;
  line-height: 1.45;
}

.docs-tool-arrow {
  color: var(--theme-primary);
}

.docs-backup-tools {
  display: grid;
  min-width: 0;
  gap: 0.55rem;
  border: 1px solid color-mix(in srgb, var(--theme-border) 70%, transparent);
  border-radius: 0.45rem;
  background: var(--theme-surface);
  padding: 0.55rem;
}

.docs-backup-heading {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.45rem 0.75rem;
}

.docs-backup-heading span {
  color: var(--theme-text);
  font-size: 0.84rem;
  font-weight: 900;
}

.docs-backup-heading small {
  color: var(--theme-text-muted);
  font-size: 0.76rem;
  line-height: 1.45;
}

.docs-tool-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: 0.4rem;
}

.docs-tool-option-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.5rem;
  border: 1px solid color-mix(in srgb, var(--theme-border) 70%, transparent);
  border-radius: 0.35rem;
  padding: 0.5rem;
}

.docs-tool-option-row:hover {
  background: color-mix(in srgb, var(--theme-primary) 7%, transparent);
}

.docs-tool-option-row.active {
  border-color: color-mix(in srgb, var(--theme-primary) 32%, var(--theme-border));
  background: color-mix(in srgb, var(--theme-primary) 8%, transparent);
  color: var(--theme-primary);
}

.docs-tool-option-copy strong {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.88rem;
}

.docs-tool-option-copy em {
  display: inline-flex;
  min-height: 1.2rem;
  align-items: center;
  border: 1px solid color-mix(in srgb, var(--theme-primary) 36%, var(--theme-border));
  border-radius: 0.35rem;
  padding: 0 0.32rem;
  color: var(--theme-primary);
  font-size: 0.64rem;
  font-style: normal;
  font-weight: 900;
}

.docs-tool-row-arrow {
  color: var(--theme-text-muted);
}

.docs-tool-option-row.active .docs-tool-row-arrow {
  color: var(--theme-primary);
}

.docs-tool-panel {
  display: grid;
  gap: 0.85rem;
}

.docs-tool-intro {
  display: grid;
  gap: 0.45rem;
}

.docs-recommended-badge {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 0.35rem;
  border: 1px solid color-mix(in srgb, var(--theme-primary) 45%, var(--theme-border));
  border-radius: 0.45rem;
  background: var(--theme-primary-soft);
  padding: 0.28rem 0.55rem;
  color: var(--theme-primary);
  font-size: 0.76rem;
  font-weight: 900;
}

.docs-download-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border: 1px solid color-mix(in srgb, var(--theme-primary) 36%, var(--theme-border));
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--theme-primary) 7%, var(--theme-surface));
  padding: 0.75rem;
}

.docs-download-main {
  display: flex;
  min-width: min(100%, 18rem);
  flex: 1 1 34rem;
  align-items: flex-start;
  gap: 0.75rem;
}

.docs-download-icon {
  display: inline-flex;
  width: 2.6rem;
  height: 2.6rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--theme-primary) 32%, var(--theme-border));
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--theme-bg) 72%, var(--theme-primary));
}

.docs-download-icon img {
  width: 1.65rem;
  height: 1.65rem;
  object-fit: contain;
}

.docs-download-panel span {
  color: var(--theme-primary);
  font-size: 0.76rem;
  font-weight: 900;
}

.docs-download-panel h4 {
  margin-top: 0.25rem;
  color: var(--theme-text);
  font-size: 1rem;
  font-weight: 850;
}

.docs-download-panel p {
  max-width: 42rem;
  margin-top: 0.35rem;
  color: var(--theme-text-muted);
  font-size: 0.88rem;
  line-height: 1.65;
}

.docs-download-actions {
  display: flex;
  flex: 0 0 auto;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.docs-download-actions a {
  display: inline-flex;
  min-height: 2.35rem;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  border: 1px solid var(--theme-border);
  border-radius: 0.45rem;
  background: var(--theme-bg);
  padding: 0 0.8rem;
  color: var(--theme-text);
  font-size: 0.84rem;
  font-weight: 800;
}

.docs-download-actions a:first-child {
  border-color: color-mix(in srgb, var(--theme-primary) 50%, var(--theme-border));
  background: var(--theme-primary);
  color: var(--theme-primary-contrast);
}

.docs-download-actions a:hover {
  transform: translateY(-1px);
  box-shadow: var(--theme-shadow-sm);
}

.docs-flow {
  display: grid;
  gap: 0.65rem;
  margin: 0;
  padding: 0;
  list-style: none;
}

.docs-flow-step {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.75rem;
  align-items: start;
  border: 1px solid color-mix(in srgb, var(--theme-border) 72%, transparent);
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--theme-surface-muted) 62%, var(--theme-surface));
  padding: 0.75rem;
}

.docs-flow-step:not(:last-child)::after {
  content: '';
  position: absolute;
  bottom: -0.65rem;
  left: 1.45rem;
  height: 0.65rem;
  border-left: 1px solid color-mix(in srgb, var(--theme-primary) 42%, var(--theme-border));
}

.docs-flow-index {
  display: inline-flex;
  height: 1.4rem;
  width: 1.4rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: var(--theme-primary);
  color: var(--theme-primary-contrast);
  font-size: 0.72rem;
  font-weight: 900;
}

.docs-flow-step strong {
  display: block;
  color: var(--theme-text);
  font-size: 0.92rem;
  font-weight: 850;
}

.docs-flow-step p {
  margin-top: 0.25rem;
  color: var(--theme-text-muted);
  font-size: 0.84rem;
  line-height: 1.55;
}

.docs-code-stack {
  display: grid;
  gap: 0.9rem;
  min-width: 0;
}

.docs-code-block {
  min-width: 0;
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--theme-border) 70%, transparent);
  border-radius: 0.5rem;
  background: #111827;
}

.docs-code-head {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: #1f2937;
  padding: 0.65rem 0.8rem;
}

.docs-code-head span {
  min-width: 0;
  overflow: hidden;
  color: #cbd5e1;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.78rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.docs-copy-button {
  display: inline-flex;
  min-height: 2rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border-radius: 0.4rem;
  background: rgba(255, 255, 255, 0.08);
  padding: 0 0.65rem;
  color: #e5e7eb;
  font-size: 0.78rem;
  font-weight: 800;
}

.docs-copy-button:hover {
  background: rgba(255, 255, 255, 0.14);
  color: white;
}

.docs-code {
  min-width: 0;
  overflow-x: auto;
  background: #111827;
  padding: 1rem;
  color: #f9fafb;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.84rem;
  line-height: 1.7;
}

.docs-related-links,
.docs-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem 0.75rem;
}

.docs-related-links {
  border-top: 1px solid var(--theme-border);
  padding-top: 0.85rem;
}

.docs-related-links span {
  color: var(--theme-text-muted);
  font-size: 0.82rem;
  font-weight: 800;
}

.docs-related-links a,
.docs-footer a,
.docs-footer-contact {
  display: inline-flex;
  min-height: 1.8rem;
  align-items: center;
  color: var(--theme-text-muted);
  font-size: 0.84rem;
  font-weight: 800;
}

.docs-related-links a,
.docs-footer a {
  text-decoration: underline;
  text-underline-offset: 0.2em;
}

.docs-related-links a:hover,
.docs-footer a:hover {
  color: var(--theme-primary);
}

.docs-footer {
  border-top: 1px solid var(--theme-border);
  padding-top: 0.85rem;
}

@media (min-width: 900px) {
  .docs-hero {
    grid-template-columns: minmax(0, 1fr) minmax(18rem, 26rem);
    align-items: end;
  }

  .docs-layout {
    grid-template-columns: 16rem minmax(0, 1fr);
    align-items: start;
  }

  .docs-toc {
    position: sticky;
    top: 5.5rem;
  }

  .docs-tool-picker {
    grid-template-columns: minmax(13rem, 0.55fr) minmax(0, 1.95fr);
    align-items: start;
  }
}

@media (max-width: 640px) {
  .docs-hero-actions {
    flex-direction: column;
  }

  .docs-primary-action,
  .docs-secondary-action {
    width: 100%;
  }

  .docs-code-head {
    align-items: stretch;
    flex-direction: column;
  }

  .docs-copy-button {
    width: 100%;
  }

  .docs-recommended-links {
    padding-left: 0;
  }
}
</style>
