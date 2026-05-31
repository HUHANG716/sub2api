import { describe, expect, it } from 'vitest'
import {
  computeHeroTagLayout,
  getHeroLayoutProfile,
  type HeroFloatingTag,
  type HeroRect,
  type HeroTagLayout,
  type HeroViewport
} from '../homeHeroLayout'

const baseTags: HeroFloatingTag[] = [
  { name: 'Claude Code', shape: 'round', prominence: 'normal' },
  { name: 'Codex', shape: 'round', prominence: 'primary' },
  { name: 'Gemini CLI', shape: 'round', prominence: 'normal' },
  { name: 'OpenAI', shape: 'text', prominence: 'normal' },
  { name: 'OpenClaw', shape: 'round', prominence: 'compact' },
  { name: 'Hermes Agent', shape: 'round', prominence: 'compact' },
  { name: 'Codex App', shape: 'round', prominence: 'compact' },
  { name: 'macOS', shape: 'round', prominence: 'compact' },
  { name: 'Windows', shape: 'round', prominence: 'compact' },
  { name: 'Linux', shape: 'round', prominence: 'compact' }
]

const scenarios = [
  {
    viewport: { width: 768, height: 796 },
    stageRect: { x: 36, y: 122, width: 696, height: 660 },
    safeRects: [
      { x: 98, y: 120, width: 502, height: 154 },
      { x: 12, y: 291, width: 672, height: 78 },
      { x: 154, y: 392, width: 389, height: 50 }
    ]
  },
  {
    viewport: { width: 390, height: 844 },
    stageRect: { x: 20, y: 142, width: 350, height: 732 },
    safeRects: [
      { x: 0, y: 156, width: 350, height: 190 },
      { x: 0, y: 365, width: 350, height: 96 },
      { x: 75, y: 498, width: 200, height: 120 }
    ]
  },
  {
    viewport: { width: 375, height: 667 },
    stageRect: { x: 20, y: 124, width: 335, height: 540 },
    safeRects: [
      { x: 0, y: 160, width: 335, height: 150 },
      { x: 0, y: 326, width: 335, height: 84 },
      { x: 35, y: 432, width: 265, height: 104 }
    ]
  }
] satisfies {
  viewport: HeroViewport
  stageRect: HeroRect
  safeRects: HeroRect[]
}[]

describe('computeHeroTagLayout', () => {
  it.each([3, 5, 7, 10])('keeps all %i hero tags visible and mutually exclusive', (count) => {
    for (const scenario of scenarios) {
      const layout = computeHeroTagLayout({
        tags: baseTags.slice(0, count),
        stageRect: scenario.stageRect,
        safeRects: scenario.safeRects,
        viewport: scenario.viewport,
        profile: getHeroLayoutProfile(scenario.viewport)
      })

      expect(layout).toHaveLength(count)
      expect(new Set(layout.map((item) => item.key)).size).toBe(count)
      expect(findLayoutIssues(layout, scenario.stageRect, scenario.safeRects, scenario.viewport)).toEqual([])
    }
  })

  it('returns deterministic layout data for the same inputs', () => {
    const scenario = scenarios[0]
    const input = {
      tags: baseTags.slice(0, 7),
      stageRect: scenario.stageRect,
      safeRects: scenario.safeRects,
      viewport: scenario.viewport,
      profile: getHeroLayoutProfile(scenario.viewport)
    }

    expect(computeHeroTagLayout(input)).toEqual(computeHeroTagLayout(input))
  })

  it('uses mobile profiles for narrow and short narrow viewports', () => {
    expect(getHeroLayoutProfile({ width: 390, height: 844 })).toBe('mobile')
    expect(getHeroLayoutProfile({ width: 375, height: 667 })).toBe('short-mobile')
    expect(getHeroLayoutProfile({ width: 900, height: 800 })).toBe('medium')
    expect(getHeroLayoutProfile({ width: 1440, height: 900 })).toBe('desktop')
  })
})

function findLayoutIssues(
  layout: HeroTagLayout[],
  stageRect: HeroRect,
  safeRects: HeroRect[],
  viewport: HeroViewport
) {
  const edgePadding = 24
  const issues: string[] = []
  const rects = layout.map((item) => ({
    key: item.key,
    left: stageRect.x + item.x - item.width / 2,
    top: stageRect.y + item.y - item.height / 2,
    right: stageRect.x + item.x + item.width / 2,
    bottom: stageRect.y + item.y + item.height / 2
  }))
  const pageSafeRects = safeRects.map((rect) => ({
    left: stageRect.x + rect.x,
    top: stageRect.y + rect.y,
    right: stageRect.x + rect.x + rect.width,
    bottom: stageRect.y + rect.y + rect.height
  }))

  for (const rect of rects) {
    if (
      rect.left < edgePadding ||
      rect.top < edgePadding ||
      viewport.width - rect.right < edgePadding ||
      viewport.height - rect.bottom < edgePadding
    ) {
      issues.push(`${rect.key}:edge`)
    }

    if (pageSafeRects.some((safeRect) => rectsOverlap(rect, safeRect))) {
      issues.push(`${rect.key}:safe`)
    }
  }

  for (let index = 0; index < rects.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < rects.length; otherIndex += 1) {
      if (rectsOverlap(rects[index], rects[otherIndex])) {
        issues.push(`${rects[index].key}:${rects[otherIndex].key}`)
      }
    }
  }

  return issues
}

function rectsOverlap(
  first: { left: number; top: number; right: number; bottom: number },
  second: { left: number; top: number; right: number; bottom: number }
) {
  return first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top
}
