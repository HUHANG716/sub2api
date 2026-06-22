import { beforeEach, describe, expect, it, vi } from 'vitest'

const { get, post, put, del } = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn()
}))

vi.mock('@/api/client', () => ({
  apiClient: {
    get,
    post,
    put,
    delete: del
  }
}))

describe('benefit api', () => {
  beforeEach(() => {
    get.mockReset()
    post.mockReset()
    put.mockReset()
    del.mockReset()
    get.mockResolvedValue({ data: {} })
    post.mockResolvedValue({ data: {} })
    put.mockResolvedValue({ data: {} })
    del.mockResolvedValue({ data: {} })
  })

  it('loads and claims user benefit campaigns', async () => {
    const { benefitsAPI } = await import('@/api/benefits')

    await benefitsAPI.listCampaigns()
    await benefitsAPI.claim(7)

    expect(get).toHaveBeenCalledWith('/benefits/campaigns')
    expect(post).toHaveBeenCalledWith('/benefits/campaigns/7/claim')
  })

  it('manages admin benefit campaigns and claims', async () => {
    const { adminBenefitsAPI } = await import('@/api/admin/benefits')
    const payload = {
      name: 'Recharge 100',
      enabled: true,
      visible: true,
      starts_at: 1782057600,
      ends_at: 1782662400,
      threshold_amount: 100,
      grant_amount: 10,
      recharge_scope: 'lifetime',
      copy: {
        title: 'Recharge benefit',
        description: 'Claim a bonus',
        button: 'Claim',
        success: 'Benefit claimed.',
        not_eligible: 'Recharge more.',
        not_started: 'Not started.',
        ended: 'Ended.',
        claimed: 'Claimed.',
        failed: 'Failed.'
      },
      sort_order: 0
    }

    await adminBenefitsAPI.list(2, 50, { enabled: true, search: 'recharge' })
    await adminBenefitsAPI.create(payload)
    await adminBenefitsAPI.update(9, { visible: false })
    await adminBenefitsAPI.delete(9)
    await adminBenefitsAPI.getClaims(9, 1, 20)

    expect(get).toHaveBeenCalledWith('/admin/benefits/campaigns', {
      params: { page: 2, page_size: 50, enabled: true, search: 'recharge' },
      signal: undefined
    })
    expect(post).toHaveBeenCalledWith('/admin/benefits/campaigns', payload)
    expect(put).toHaveBeenCalledWith('/admin/benefits/campaigns/9', { visible: false })
    expect(del).toHaveBeenCalledWith('/admin/benefits/campaigns/9')
    expect(get).toHaveBeenCalledWith('/admin/benefits/campaigns/9/claims', {
      params: { page: 1, page_size: 20 }
    })
  })
})
