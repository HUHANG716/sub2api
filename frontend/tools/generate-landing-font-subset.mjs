import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import subsetFont from 'subset-font'

const repoRoot = resolve(import.meta.dirname, '..')
const defaultSourceFont = 'C:/Windows/Fonts/NotoSansSC-VF.ttf'
const sourceFontPath = process.env.LANDING_FONT_SOURCE || defaultSourceFont
const outputPath = resolve(repoRoot, 'public/fonts/hahacode-landing-sc.woff2')

const textSources = [
  resolve(repoRoot, 'src/views/HomeView.vue'),
  resolve(repoRoot, 'index.html')
]

const staticLandingText = [
  'Hahacode',
  'AI API Gateway',
  'AI 编程开发工作台',
  'AI 编程工作台',
  'AI Code Workspace',
  '重构您的',
  'AI 编程体验',
  '稳定、清晰、适合团队协作的 AI 编程平台。',
  '把 AI 编程、使用管理与团队协作整合到一个软件平台，让团队专注产品本身。',
  '能力',
  '用户评价',
  '常见问题',
  '联系我们',
  '查看文档',
  '登录',
  '控制台',
  '立即开始',
  '进入控制台',
  '开发者用户',
  '服务稳定性',
  '任务处理次数',
  '专属技术支持',
  'Rebuild your',
  'AI coding workflow',
  'A stable, clear AI coding platform built for team collaboration.',
  'Bring AI coding, usage management, and team collaboration into one software platform so your team can stay focused on the product.',
  'Capabilities',
  'Customer stories',
  'FAQ',
  'Contact',
  'View Documentation',
  'Login',
  'Dashboard',
  'Get Started',
  'Go to Dashboard',
  'developers',
  'service uptime',
  'tasks processed',
  'dedicated technical support',
  'curl -X POST /v1/messages',
  '# Routing to upstream...',
  '{ "content": "Hello!" }',
  '10,000+ 99.9% 500 万+ 1v1 200 OK',
  'Claude Code Codex Gemini CLI OpenClaw Hermes Agent macOS Windows Linux'
]

function uniqueCharacters(input) {
  return Array.from(new Set(Array.from(input))).sort().join('')
}

function collectQuotedStrings(source) {
  const strings = []
  const pattern = /(['"`])((?:\\.|(?!\1)[\s\S])*?)\1/g
  let match

  while ((match = pattern.exec(source)) !== null) {
    strings.push(match[2].replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"'))
  }

  return strings.join('\n')
}

async function main() {
  if (!existsSync(sourceFontPath)) {
    if (existsSync(outputPath)) {
      console.warn(
        `Landing font source not found: ${sourceFontPath}. Reusing existing ${outputPath}. Set LANDING_FONT_SOURCE to regenerate it.`
      )
      return
    }

    throw new Error(
      `Landing font source not found: ${sourceFontPath}. Set LANDING_FONT_SOURCE to a local Noto Sans SC TTF/OTF file.`
    )
  }

  const sourceTextParts = []
  for (const sourcePath of textSources) {
    const source = await readFile(sourcePath, 'utf8')
    sourceTextParts.push(collectQuotedStrings(source))
  }

  const subsetText = uniqueCharacters(`${staticLandingText.join('\n')}\n${sourceTextParts.join('\n')}`)
  const sourceFont = await readFile(sourceFontPath)
  const subset = await subsetFont(sourceFont, subsetText, {
    targetFormat: 'woff2',
    variationAxes: {
      wght: { min: 400, max: 900, default: 400 }
    }
  })

  await mkdir(dirname(outputPath), { recursive: true })
  await writeFile(outputPath, subset)

  console.log(
    `Generated ${outputPath} (${Math.round(subset.length / 1024)} KiB, ${subsetText.length} unique characters)`
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
