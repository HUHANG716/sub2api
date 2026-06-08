import { describe, expect, it } from 'vitest'
import { applyRouteSeo, resolveRouteSeo } from '@/router/seo'

describe('route seo helpers', () => {
  it('uses explicit SEO metadata for public landing pages', () => {
    const seo = resolveRouteSeo(
      {
        title: 'Home',
        seoTitle: 'OpenAI Claude Gemini API 中转站',
        seoDescription: 'Hahacode 提供 OpenAI、Claude、Gemini 等 AI 模型的统一 API 网关，支持国内访问与 OpenAI 兼容接口。',
        seoKeywords: ['OpenAI API 中转站', 'Claude API 中转站'],
        canonicalPath: '/home',
      },
      'Hahacode',
      'https://code.hahacode.top/docs?from=test',
    )

    expect(seo.title).toBe('OpenAI Claude Gemini API 中转站 - Hahacode')
    expect(seo.description).toContain('OpenAI、Claude、Gemini')
    expect(seo.keywords).toBe('OpenAI API 中转站, Claude API 中转站')
    expect(seo.canonicalUrl).toBe('https://code.hahacode.top/home')
  })

  it('falls back to route title and current path when route has no SEO metadata', () => {
    const seo = resolveRouteSeo(
      { title: 'Dashboard' },
      'Hahacode',
      'https://code.hahacode.top/dashboard?tab=usage',
    )

    expect(seo.title).toBe('Dashboard - Hahacode')
    expect(seo.description).toContain('AI API Gateway')
    expect(seo.canonicalUrl).toBe('https://code.hahacode.top/dashboard')
  })

  it('updates document head tags for search and social previews', () => {
    document.head.innerHTML = ''

    applyRouteSeo(
      {
        title: 'Docs',
        seoTitle: 'Claude Code Cursor Codex API 配置文档',
        seoDescription: '查看 Hahacode 在 Claude Code、Cursor、Codex 与 Gemini CLI 中配置 API Base URL 的教程。',
        seoKeywords: ['Claude Code API', 'Cursor API 配置'],
        canonicalPath: '/docs',
        structuredData: {
          '@context': 'https://schema.org',
          '@type': 'SoftwareApplication',
          name: 'Hahacode',
        },
      },
      'Hahacode',
      'https://code.hahacode.top/docs',
    )

    expect(document.title).toBe('Claude Code Cursor Codex API 配置文档 - Hahacode')
    expect(document.querySelector('meta[name="description"]')?.getAttribute('content')).toContain('API Base URL')
    expect(document.querySelector('meta[name="keywords"]')?.getAttribute('content')).toBe('Claude Code API, Cursor API 配置')
    expect(document.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(document.title)
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://code.hahacode.top/docs')
    expect(document.querySelector('script[type="application/ld+json"]')?.textContent).toContain('SoftwareApplication')
  })
})
