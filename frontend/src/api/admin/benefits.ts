import { apiClient } from '../client'
import type {
  BasePaginationResponse,
  BenefitCampaign,
  BenefitClaim,
  CreateBenefitCampaignRequest,
  UpdateBenefitCampaignRequest
} from '@/types'

export async function list(
  page: number = 1,
  pageSize: number = 20,
  filters?: {
    enabled?: boolean
    visible?: boolean
    search?: string
    sort_by?: string
    sort_order?: 'asc' | 'desc'
  },
  options?: {
    signal?: AbortSignal
  }
): Promise<BasePaginationResponse<BenefitCampaign>> {
  const { data } = await apiClient.get<BasePaginationResponse<BenefitCampaign>>('/admin/benefits/campaigns', {
    params: { page, page_size: pageSize, ...filters },
    signal: options?.signal
  })
  return data
}

export async function getById(id: number): Promise<BenefitCampaign> {
  const { data } = await apiClient.get<BenefitCampaign>(`/admin/benefits/campaigns/${id}`)
  return data
}

export async function create(request: CreateBenefitCampaignRequest): Promise<BenefitCampaign> {
  const { data } = await apiClient.post<BenefitCampaign>('/admin/benefits/campaigns', request)
  return data
}

export async function update(id: number, request: UpdateBenefitCampaignRequest): Promise<BenefitCampaign> {
  const { data } = await apiClient.put<BenefitCampaign>(`/admin/benefits/campaigns/${id}`, request)
  return data
}

export async function deleteCampaign(id: number): Promise<{ message: string }> {
  const { data } = await apiClient.delete<{ message: string }>(`/admin/benefits/campaigns/${id}`)
  return data
}

export async function getClaims(
  id: number,
  page: number = 1,
  pageSize: number = 20
): Promise<BasePaginationResponse<BenefitClaim>> {
  const { data } = await apiClient.get<BasePaginationResponse<BenefitClaim>>(
    `/admin/benefits/campaigns/${id}/claims`,
    { params: { page, page_size: pageSize } }
  )
  return data
}

export const adminBenefitsAPI = {
  list,
  getById,
  create,
  update,
  delete: deleteCampaign,
  getClaims
}

export default adminBenefitsAPI
