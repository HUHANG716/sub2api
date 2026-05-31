import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get } = vi.hoisted(() => ({
  get: vi.fn(),
}))

vi.mock('@/api/client', () => ({
  apiClient: {
    get,
  },
}))

import { adminPaymentAPI } from '@/api/admin/payment'

describe('admin payment api', () => {
  beforeEach(() => {
    get.mockReset()
    get.mockResolvedValue({ data: {} })
  })

  it('loads payment funnel analytics with the selected window', async () => {
    await adminPaymentAPI.getAnalytics(30)

    expect(get).toHaveBeenCalledWith('/admin/payment/analytics', {
      params: { days: 30 },
    })
  })
})
