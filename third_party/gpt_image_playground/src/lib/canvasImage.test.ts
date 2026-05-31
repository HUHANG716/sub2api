import { describe, expect, it, vi } from 'vitest'
import { dataUrlToBlob } from './canvasImage'

describe('dataUrlToBlob', () => {
  it('converts base64 data URLs without fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const blob = await dataUrlToBlob('data:image/png;base64,aGVsbG8=')

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(blob.type).toBe('image/png')
    expect(await blob.text()).toBe('hello')
  })

  it('uses the fallback MIME type when the data URL has no explicit type', async () => {
    const blob = await dataUrlToBlob('data:;base64,aGVsbG8=', 'image/webp')

    expect(blob.type).toBe('image/webp')
    expect(await blob.text()).toBe('hello')
  })
})
