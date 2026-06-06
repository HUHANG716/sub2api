import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get } = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('@/api/client', () => ({
  apiClient: {
    get,
  },
}))

import { getPublicModelPricing } from '@/api/publicModelPricing'

describe('public model pricing api', () => {
  beforeEach(() => {
    get.mockReset()
    get.mockResolvedValue({ data: { items: [], last_updated: '2026-06-06T00:00:00Z' } })
  })

  it('loads the public model pricing catalog', async () => {
    await getPublicModelPricing()

    expect(get).toHaveBeenCalledWith('/public/model-pricing')
  })
})
