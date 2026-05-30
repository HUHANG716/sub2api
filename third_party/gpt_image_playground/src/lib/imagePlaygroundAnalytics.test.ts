import { describe, expect, it, vi } from 'vitest'
import { createImagePlaygroundEvent, trackImagePlaygroundEvent } from './imagePlaygroundAnalytics'

describe('image playground analytics', () => {
  it('creates events without prompt, API key, or image payload fields', () => {
    const event = createImagePlaygroundEvent('template_apply', {
      templateId: 'template-1',
      sourceId: 'youmind',
      prompt: 'secret prompt',
      apiKey: 'sk-secret',
      imageDataUrl: 'data:image/png;base64,secret',
      model: 'gpt-image-2',
    })

    expect(event.name).toBe('template_apply')
    expect(event.payload).toEqual({
      templateId: 'template-1',
      sourceId: 'youmind',
      model: 'gpt-image-2',
    })
  })

  it('dispatches analytics through CustomEvent and parent postMessage', () => {
    const dispatchEvent = vi.fn()
    const postMessage = vi.fn()
    const originalWindow = globalThis.window
    const originalDocument = globalThis.document

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        dispatchEvent,
        parent: { postMessage },
      },
    })
    Object.defineProperty(globalThis, 'document', {
      configurable: true,
      value: {
        referrer: 'https://code.example.com/image-playground',
      },
    })

    try {
      trackImagePlaygroundEvent('image_generate_submit', {
        provider: 'openai',
        model: 'gpt-image-2',
        imageCount: 1,
      })
    } finally {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
      })
      Object.defineProperty(globalThis, 'document', {
        configurable: true,
        value: originalDocument,
      })
    }

    expect(dispatchEvent).toHaveBeenCalledTimes(1)
    expect(postMessage).toHaveBeenCalledTimes(1)
    expect(postMessage.mock.calls[0][0]).toMatchObject({
      type: 'image-playground:analytics',
      event: {
        name: 'image_generate_submit',
        payload: {
          provider: 'openai',
          model: 'gpt-image-2',
          imageCount: 1,
        },
      },
    })
    expect(postMessage.mock.calls[0][1]).toBe('https://code.example.com')
  })

  it('does not post analytics messages to itself in top-level mode', () => {
    const dispatchEvent = vi.fn()
    const postMessage = vi.fn()
    const originalWindow = globalThis.window
    const fakeWindow = {
      dispatchEvent,
      postMessage,
    } as unknown as Window & typeof globalThis
    Object.defineProperty(fakeWindow, 'parent', {
      configurable: true,
      value: fakeWindow,
    })

    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: fakeWindow,
    })

    try {
      trackImagePlaygroundEvent('image_generate_submit', {
        provider: 'openai',
      })
    } finally {
      Object.defineProperty(globalThis, 'window', {
        configurable: true,
        value: originalWindow,
      })
    }

    expect(dispatchEvent).toHaveBeenCalledTimes(1)
    expect(postMessage).not.toHaveBeenCalled()
  })
})
