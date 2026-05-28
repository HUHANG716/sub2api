import { describe, expect, it } from 'vitest'

import { isImagePlaygroundConfigured } from '../featureFlags'

describe('isImagePlaygroundConfigured', () => {
  it('requires a positive configured group id', () => {
    expect(isImagePlaygroundConfigured(undefined)).toBe(false)
    expect(isImagePlaygroundConfigured(null)).toBe(false)
    expect(isImagePlaygroundConfigured({ image_playground_group_id: null })).toBe(false)
    expect(isImagePlaygroundConfigured({ image_playground_group_id: 0 })).toBe(false)
    expect(isImagePlaygroundConfigured({ image_playground_group_id: -1 })).toBe(false)
    expect(isImagePlaygroundConfigured({ image_playground_group_id: 12 })).toBe(true)
  })
})
