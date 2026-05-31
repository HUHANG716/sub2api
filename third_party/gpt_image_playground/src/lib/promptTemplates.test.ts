import { describe, expect, it, vi } from 'vitest'
import {
  fetchPromptTemplates,
  parseEvoLinkPromptTemplates,
  parseFreestyleFlyPromptTemplates,
  parseLatestXPromptTemplates,
  parseReadmePromptTemplates,
  parseYouMindPromptTemplates,
  resolveGitHubRawUrl,
} from './promptTemplates'

describe('parseReadmePromptTemplates', () => {
  it('extracts prompt templates from the README prompt collection section', () => {
    const markdown = [
      '# Awesome',
      '',
      '## 提示词合集',
      '',
      '### 一、电商与产品',
      '',
      '#### 商品精修',
      '适合产品白底图和重新打光。',
      '',
      '```text',
      '帮我生成一张图片，将该产品进行精修。',
      '```',
      '',
      '#### 空模板',
      '这条没有代码块，应该忽略。',
      '',
      '### 二、品牌海报设计',
      '',
      '#### 活动主视觉',
      '生成品牌活动海报。',
      '',
      '```',
      '为「春日新品」生成一张活动主视觉海报。',
      '```',
      '',
      '## 最新 X Prompt',
      '',
      '#### 不应被解析',
      '```text',
      '不属于提示词合集',
      '```',
    ].join('\n')

    const templates = parseReadmePromptTemplates(markdown)

    expect(templates).toHaveLength(2)
    expect(templates[0]).toMatchObject({
      id: 'readme-1',
      source: 'readme',
      sourceId: 'xianyu110',
      sourceName: 'xianyu110',
      kind: 'scenario',
      title: '商品精修',
      category: '电商与产品',
      description: '适合产品白底图和重新打光。',
      promptText: '帮我生成一张图片，将该产品进行精修。',
    })
    expect(templates[1]).toMatchObject({
      id: 'readme-2',
      source: 'readme',
      sourceId: 'xianyu110',
      kind: 'scenario',
      title: '活动主视觉',
      category: '品牌海报设计',
      promptText: '为「春日新品」生成一张活动主视觉海报。',
    })
  })
})

describe('parseLatestXPromptTemplates', () => {
  it('supports grouped dates payload and maps safe metadata', () => {
    const templates = parseLatestXPromptTemplates({
      dates: [
        {
          date: '2026-04-29',
          items: [
            {
              author: 'Zara - @ZaraIrahh',
              created_at: 'Sun, 26 Apr 2026 15:49:24 GMT',
              prompt: 'A stylized Pixar-style 3D portrait',
              reason: 'Reusable portrait prompt',
              primary_image_url: 'https://example.com/a.jpg',
              x_url: 'https://x.com/example/status/1',
              view_count: null,
              retweet_count: 2,
              like_count: 35,
            },
            {
              author: 'No Prompt',
              prompt: '',
            },
          ],
        },
      ],
    })

    expect(templates).toHaveLength(1)
    expect(templates[0]).toMatchObject({
      id: 'latest-x-1',
      source: 'latest-x',
      sourceId: 'xianyu110-latest-x',
      sourceName: 'xianyu110 最新 X',
      kind: 'latest-x',
      title: 'Zara - @ZaraIrahh',
      category: '2026-04-29',
      description: 'Reusable portrait prompt',
      promptText: 'A stylized Pixar-style 3D portrait',
      imageUrl: 'https://example.com/a.jpg',
      sourceUrl: 'https://x.com/example/status/1',
      stats: '转推 2 · 点赞 35',
    })
  })

  it('supports flat items payload', () => {
    const templates = parseLatestXPromptTemplates({
      items: [
        {
          author: 'Flat Author',
          created_at: '2026-04-23T05:14:40Z',
          prompt: 'flat prompt',
          image_urls: ['https://example.com/flat.jpg'],
          url: 'https://x.com/example/status/2',
        },
      ],
    })

    expect(templates).toHaveLength(1)
    expect(templates[0]).toMatchObject({
      id: 'latest-x-1',
      title: 'Flat Author',
      category: '2026-04-23',
      imageUrl: 'https://example.com/flat.jpg',
      sourceUrl: 'https://x.com/example/status/2',
    })
  })
})

describe('parseEvoLinkPromptTemplates', () => {
  it('extracts case templates from category sections', () => {
    const markdown = [
      '## 🛒 E-commerce Cases',
      '',
      '### Case 151: [Miniature Diorama Skincare Advertisement](https://x.com/example/status/1) (by [@maker](https://x.com/maker))',
      '',
      '| Output |',
      '| :----: |',
      '| <a href="https://evolink.ai/example"><img src="images/ecommerce_case151/output.jpg" width="300" alt="Output"></a> |',
      '',
      '**Prompt:**',
      '',
      '```',
      'A hyper-realistic miniature diorama product advertisement.',
      '```',
      '',
      '## 🤝 How to Contribute',
      '',
      '### Case 999: [Ignored](https://x.com/example/status/999)',
      '```',
      'ignored',
      '```',
    ].join('\n')

    const templates = parseEvoLinkPromptTemplates(markdown, 'README_zh-CN.md')

    expect(templates).toHaveLength(1)
    expect(templates[0]).toMatchObject({
      id: 'evolink-case-151-1',
      sourceId: 'evolink',
      sourceName: 'EvoLinkAI',
      kind: 'case-library',
      title: 'Miniature Diorama Skincare Advertisement',
      category: 'E-commerce Cases',
      author: '@maker',
      promptText: 'A hyper-realistic miniature diorama product advertisement.',
      imageUrl: 'https://raw.githubusercontent.com/EvoLinkAI/awesome-gpt-image-2-API-and-Prompts/main/images/ecommerce_case151/output.jpg',
      sourceUrl: 'https://x.com/example/status/1',
    })
    expect(templates[0].imageUrls).toEqual([
      'https://raw.githubusercontent.com/EvoLinkAI/awesome-gpt-image-2-API-and-Prompts/main/images/ecommerce_case151/output.jpg',
    ])
  })
})

describe('parseYouMindPromptTemplates', () => {
  it('extracts numbered prompt entries and filters empty prompts', () => {
    const markdown = [
      '## 🔥 精选提示词',
      '',
      '### No. 1: VR 头显爆炸视图海报',
      '',
      '![Language-EN](https://img.shields.io/badge/Language-EN-blue)',
      '![Featured](https://img.shields.io/badge/⭐-Featured-gold)',
      '![Raycast](https://img.shields.io/badge/🚀-Raycast_Friendly-purple)',
      '',
      '#### 📖 描述',
      '',
      '生成一张高科技 VR 头显爆炸视图。',
      '',
      '#### 📝 提示词',
      '',
      '```',
      '{"type":"产品爆炸视图海报"}',
      '```',
      '',
      '#### 🖼️ 生成图片',
      '',
      '<img src="https://cms-assets.youmind.com/media/a.jpg" width="700" alt="VR 头显爆炸视图海报 - Image 1">',
      '',
      '#### 📌 详情',
      '',
      '- **多语言:** en',
      '',
      '### No. 2: 空提示词',
      '',
      '#### 📝 提示词',
      '',
      '```',
      '',
      '```',
    ].join('\n')

    const templates = parseYouMindPromptTemplates(markdown, 'README_zh.md')

    expect(templates).toHaveLength(1)
    expect(templates[0]).toMatchObject({
      id: 'youmind-no-1-1',
      sourceId: 'youmind',
      sourceName: 'YouMind',
      kind: 'case-library',
      title: 'VR 头显爆炸视图海报',
      category: '精选提示词',
      description: '生成一张高科技 VR 头显爆炸视图。',
      promptText: '{"type":"产品爆炸视图海报"}',
      imageUrl: 'https://cms-assets.youmind.com/media/a.jpg',
      language: 'zh',
    })
    expect(templates[0].imageUrls).toEqual(['https://cms-assets.youmind.com/media/a.jpg'])
  })
})

describe('parseFreestyleFlyPromptTemplates', () => {
  it('maps cases.json entries and resolves relative image URLs', () => {
    const templates = parseFreestyleFlyPromptTemplates({
      cases: [
        {
          id: 484,
          title: '霓虹涂鸦黑白人像',
          image: '/images/case484.jpg',
          sourceLabel: '@harboriis',
          sourceUrl: 'https://x.com/harboriis/status/2060208419811074350',
          prompt: 'High-contrast black-and-white urban portrait.',
          promptPreview: 'High-contrast black-and-white urban portrait.',
          category: 'Posters & Typography',
          githubUrl: 'https://github.com/freestylefly/awesome-gpt-image-2/blob/main/docs/gallery-part-2.md#case-484',
        },
        {
          id: 485,
          title: 'empty',
          prompt: ' ',
        },
      ],
    })

    expect(templates).toHaveLength(1)
    expect(templates[0]).toMatchObject({
      id: 'freestylefly-case-484',
      sourceId: 'freestylefly',
      sourceName: 'freestylefly',
      kind: 'case-library',
      title: '霓虹涂鸦黑白人像',
      category: 'Posters & Typography',
      author: '@harboriis',
      promptText: 'High-contrast black-and-white urban portrait.',
      imageUrl: 'https://raw.githubusercontent.com/freestylefly/awesome-gpt-image-2/main/data/images/case484.jpg',
      sourceUrl: 'https://x.com/harboriis/status/2060208419811074350',
    })
  })
})

describe('resolveGitHubRawUrl', () => {
  it('converts relative repo asset paths into raw GitHub URLs', () => {
    expect(resolveGitHubRawUrl('images/a.jpg', 'owner/repo')).toBe('https://raw.githubusercontent.com/owner/repo/main/images/a.jpg')
    expect(resolveGitHubRawUrl('/images/a.jpg', 'owner/repo', 'data')).toBe('https://raw.githubusercontent.com/owner/repo/main/data/images/a.jpg')
    expect(resolveGitHubRawUrl('https://example.com/a.jpg', 'owner/repo')).toBe('https://example.com/a.jpg')
  })
})

describe('fetchPromptTemplates', () => {
  it('keeps successful sources when another source fails', async () => {
    const responses = new Map<string, { ok: boolean; body: string; json?: unknown }>([
      ['https://raw.githubusercontent.com/xianyu110/awesome-gptimage2/main/README.md', { ok: true, body: [
        '## 提示词合集',
        '### 分类',
        '#### 标题',
        '```',
        'xianyu prompt',
        '```',
      ].join('\n') }],
      ['https://raw.githubusercontent.com/xianyu110/awesome-gptimage2/main/data/latest-prompts.json', { ok: true, body: '', json: { items: [{ author: 'A', prompt: 'latest prompt' }] } }],
      ['https://raw.githubusercontent.com/EvoLinkAI/awesome-gpt-image-2-API-and-Prompts/main/README_zh-CN.md', { ok: false, body: '' }],
      ['https://raw.githubusercontent.com/EvoLinkAI/awesome-gpt-image-2-API-and-Prompts/main/README.md', { ok: false, body: '' }],
      ['https://raw.githubusercontent.com/YouMind-OpenLab/awesome-gpt-image-2/main/README_zh.md', { ok: true, body: [
        '## 📋 所有提示词',
        '### No. 1: YouMind item',
        '#### 📝 提示词',
        '```',
        'youmind prompt',
        '```',
      ].join('\n') }],
      ['https://raw.githubusercontent.com/freestylefly/awesome-gpt-image-2/main/data/cases.json', { ok: true, body: '', json: { cases: [{ id: 1, title: 'Freestyle', prompt: 'freestyle prompt', image: '/images/case1.jpg' }] } }],
    ])

    const fetchMock = vi.fn(async (url: string) => {
      const response = responses.get(url)
      if (!response) throw new Error(`unexpected ${url}`)
      return {
        ok: response.ok,
        status: response.ok ? 200 : 500,
        text: async () => response.body,
        json: async () => response.json,
      } as Response
    })

    const result = await fetchPromptTemplates(fetchMock)

    expect(result.status).toBe('partial-success')
    expect(result.items.map((item) => item.sourceId)).toEqual(['xianyu110', 'xianyu110-latest-x', 'youmind', 'freestylefly'])
    expect(result.sourceStates.evolink.status).toBe('error')
    expect(result.sourceStates.youmind.status).toBe('success')
  })
})
