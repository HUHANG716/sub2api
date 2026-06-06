import { apiClient } from './client'

export interface PublicModelPricingItem {
  provider: 'openai' | 'anthropic' | 'gemini'
  model: string
  mode: string
  input_price_per_million: number | null
  output_price_per_million: number | null
  cache_write_price_per_million: number | null
  cache_read_price_per_million: number | null
  image_output_price: number | null
  supports_prompt_caching: boolean
  supports_service_tier: boolean
}

export interface PublicModelPricingCatalog {
  items: PublicModelPricingItem[]
  last_updated: string
}

export async function getPublicModelPricing(): Promise<PublicModelPricingCatalog> {
  const { data } = await apiClient.get<PublicModelPricingCatalog>('/public/model-pricing')
  return data
}

export default {
  getPublicModelPricing,
}
