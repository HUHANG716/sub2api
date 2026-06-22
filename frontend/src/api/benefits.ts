import { apiClient } from './client'
import type { BenefitCampaignView, BenefitClaimResult } from '@/types'

export async function listCampaigns(): Promise<BenefitCampaignView[]> {
  const { data } = await apiClient.get<BenefitCampaignView[]>('/benefits/campaigns')
  return data
}

export async function claim(campaignId: number): Promise<BenefitClaimResult> {
  const { data } = await apiClient.post<BenefitClaimResult>(`/benefits/campaigns/${campaignId}/claim`)
  return data
}

export const benefitsAPI = {
  listCampaigns,
  claim
}

export default benefitsAPI
