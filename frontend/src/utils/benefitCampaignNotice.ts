import type { BenefitCampaignView } from '@/types'

export const BENEFIT_CAMPAIGNS_SEEN_AT_KEY = 'benefit-campaigns-seen-at'

const unseenStates = new Set(['claimable', 'not_eligible', 'not_started'])

function campaignActivityTime(campaign: BenefitCampaignView['campaign']): number {
  const updatedAt = Date.parse(campaign.updated_at || '')
  if (!Number.isNaN(updatedAt)) return updatedAt
  const createdAt = Date.parse(campaign.created_at || '')
  return Number.isNaN(createdAt) ? 0 : createdAt
}

export function getBenefitCampaignsSeenAt(): number | null {
  const raw = window.localStorage.getItem(BENEFIT_CAMPAIGNS_SEEN_AT_KEY)
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

export function hasUnseenBenefitCampaigns(campaigns: BenefitCampaignView[], seenAt: number | null): boolean {
  return campaigns.some((item) => {
    if (!unseenStates.has(item.state)) return false
    if (item.claim) return false
    if (seenAt == null) return true
    return campaignActivityTime(item.campaign) > seenAt
  })
}

export function markBenefitCampaignsSeen(now = Date.now()): void {
  window.localStorage.setItem(BENEFIT_CAMPAIGNS_SEEN_AT_KEY, String(now))
}
