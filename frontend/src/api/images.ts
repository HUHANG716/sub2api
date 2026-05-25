import { apiClient } from './client'

export type ImageStudioMode = 'generation' | 'edit'
export type ImageStudioSize = '1K' | '2K' | '4K'

export interface ImageStudioGroupOption {
  id: number
  name: string
  image_price_1k: number | null
  image_price_2k: number | null
  image_price_4k: number | null
  image_rate_multiplier: number
  image_rate_independent: boolean
}

export interface ImageStudioOptions {
  default_model: string
  balance: number
  groups: ImageStudioGroupOption[]
  prices: Record<string, number>
}

export interface ImageStudioTemplate {
  key: string
  mode: ImageStudioMode
  title: string
  model: string
  image: string
  prompt: string
  source_name: string
  source_url: string
  source_type: string
  license?: string
  author?: string
  meta: string
  tags?: string[]
  requires_reference: boolean
}

export interface ImageEstimateRequest {
  group_id: number
  mode: ImageStudioMode
  size: ImageStudioSize
  n: number
}

export interface ImageEstimateResponse {
  estimated_cost: number
  billing_size: string
}

export interface ImageGenerateResult {
  b64_json?: string
  url?: string
  revised_prompt?: string
}

export interface ImageGenerateResponse {
  request_id: string
  model: string
  images: ImageGenerateResult[]
  estimated_cost: number
  actual_cost: number
  new_balance: number
  image_count: number
  billing_size: string
  usage_log_id?: number
}

export async function getOptions(): Promise<ImageStudioOptions> {
  const { data } = await apiClient.get<ImageStudioOptions>('/images/options')
  return data
}

export async function getTemplates(params?: {
  mode?: 'all' | ImageStudioMode
  model?: string
  q?: string
}): Promise<ImageStudioTemplate[]> {
  const { data } = await apiClient.get<ImageStudioTemplate[]>('/images/templates', { params })
  return data
}

export async function estimate(payload: ImageEstimateRequest): Promise<ImageEstimateResponse> {
  const { data } = await apiClient.post<ImageEstimateResponse>('/images/estimate', payload)
  return data
}

export async function generate(form: FormData): Promise<ImageGenerateResponse> {
  const { data } = await apiClient.post<ImageGenerateResponse>('/images/generate', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 600000,
  })
  return data
}

export const imagesAPI = { getOptions, getTemplates, estimate, generate }

export default imagesAPI
