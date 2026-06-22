import { beforeEach, describe, expect, it } from 'vitest'
import type { BenefitCampaignView } from '@/types'
import {
  BENEFIT_CAMPAIGNS_SEEN_AT_KEY,
  hasUnseenBenefitCampaigns,
  markBenefitCampaignsSeen
} from '@/utils/benefitCampaignNotice'

const campaignView = (overrides: Partial<BenefitCampaignView> = {}): BenefitCampaignView => ({
  campaign: {
    id: 1,
    name: 'Recharge benefit',
    enabled: true,
    visible: true,
    starts_at: '2026-06-20T00:00:00Z',
    ends_at: '2026-06-30T00:00:00Z',
    threshold_amount: 100,
    grant_amount: 10,
    recharge_scope: 'campaign_window',
    copy: {
      title: 'Recharge benefit',
      description: 'Claim a bonus',
      button: 'Claim',
      success: 'Done',
      not_eligible: 'Recharge more',
      not_started: 'Soon',
      ended: 'Ended',
      claimed: 'Claimed',
      failed: 'Failed'
    },
    sort_order: 0,
    claim_count: 0,
    created_at: '2026-06-21T00:00:00Z',
    updated_at: '2026-06-21T00:00:00Z'
  },
  state: 'claimable',
  eligible_recharge_amount: 100,
  ...overrides
})

describe('benefit campaign notice', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('marks active unclaimed campaigns as unseen until the user has viewed newer activity', () => {
    const seenBeforeCampaignUpdate = Date.parse('2026-06-20T00:00:00Z')
    const seenAfterCampaignUpdate = Date.parse('2026-06-22T00:00:00Z')

    expect(hasUnseenBenefitCampaigns([campaignView()], null)).toBe(true)
    expect(hasUnseenBenefitCampaigns([campaignView()], seenBeforeCampaignUpdate)).toBe(true)
    expect(hasUnseenBenefitCampaigns([campaignView()], seenAfterCampaignUpdate)).toBe(false)
  })

  it('does not mark claimed or ended campaigns as unseen', () => {
    expect(hasUnseenBenefitCampaigns([campaignView({ state: 'claimed' })], null)).toBe(false)
    expect(hasUnseenBenefitCampaigns([campaignView({ state: 'ended' })], null)).toBe(false)
  })

  it('persists the last seen timestamp', () => {
    markBenefitCampaignsSeen(1782057600000)

    expect(window.localStorage.getItem(BENEFIT_CAMPAIGNS_SEEN_AT_KEY)).toBe('1782057600000')
  })
})
