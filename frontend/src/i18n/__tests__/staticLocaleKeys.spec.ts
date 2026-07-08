import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import en from '../locales/en'
import zh from '../locales/zh'

const currentFile = fileURLToPath(import.meta.url)
const srcRoot = path.resolve(path.dirname(currentFile), '../..')

const sourceExtensions = new Set(['.ts', '.vue'])
const ignoredSegments = new Set(['__tests__', 'locales'])

const keyPatterns = [
  /\b(?:t|\$t)\(\s*['"]([^'"`{}]+)['"]\s*(?:,|\))/g,
  /\bi18n\.global\.t\(\s*['"]([^'"`{}]+)['"]\s*(?:,|\))/g,
  /\b(?:titleKey|descriptionKey):\s*['"]([^'"`{}]+)['"]/g,
]

const hasKey = (messages: unknown, key: string) =>
  key.split('.').every((part) => {
    if (!messages || typeof messages !== 'object' || !(part in messages)) return false
    messages = (messages as Record<string, unknown>)[part]
    return true
  })

const collectFiles = (dir: string): string[] => {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  return entries.flatMap((entry) => {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (ignoredSegments.has(entry.name)) return []
      return collectFiles(fullPath)
    }
    return sourceExtensions.has(path.extname(entry.name)) ? [fullPath] : []
  })
}

const collectStaticKeys = () => {
  const keys = new Map<string, Set<string>>()

  for (const file of collectFiles(srcRoot)) {
    const source = fs.readFileSync(file, 'utf8')
    for (const pattern of keyPatterns) {
      pattern.lastIndex = 0
      for (const match of source.matchAll(pattern)) {
        const key = match[1]
        if (!key.includes('.')) continue
        const relativePath = path.relative(srcRoot, file)
        if (!keys.has(key)) keys.set(key, new Set())
        keys.get(key)?.add(relativePath)
      }
    }
  }

  return keys
}

describe('static locale keys', () => {
  it('exist in zh and en locale bundles', () => {
    const missing = [...collectStaticKeys()]
      .flatMap(([key, files]) => {
        const misses = []
        if (!hasKey(zh, key)) misses.push(`zh:${key} (${[...files].join(', ')})`)
        if (!hasKey(en, key)) misses.push(`en:${key} (${[...files].join(', ')})`)
        return misses
      })
      .sort()

    expect(missing).toEqual([])
  })
})
