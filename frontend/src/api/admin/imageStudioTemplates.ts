import { apiClient } from '../client'
import type { ImageStudioMode } from '@/api/images'

export interface AdminImageStudioTemplate {
  id: number
  key: string
  mode: ImageStudioMode
  title: string
  model: string
  image: string
  original_image_url?: string
  image_hash?: string
  image_download_error?: string
  prompt_hash?: string
  prompt: string
  source_name: string
  source_url: string
  source_type: string
  license?: string
  author?: string
  meta: string
  tags?: string[]
  requires_reference: boolean
  enabled: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

export interface ListImageStudioTemplatesParams {
  include_disabled?: boolean
  mode?: 'all' | ImageStudioMode
  model?: string
  q?: string
}

export interface ListImageStudioTemplatesResponse {
  items: AdminImageStudioTemplate[]
}

export interface UpdateImageStudioTemplateRequest {
  key?: string
  mode?: ImageStudioMode
  title?: string
  model?: string
  image?: string
  original_image_url?: string
  image_hash?: string
  image_download_error?: string
  prompt_hash?: string
  prompt?: string
  source_name?: string
  source_url?: string
  source_type?: string
  license?: string
  author?: string
  meta?: string
  tags?: string[]
  requires_reference?: boolean
  enabled?: boolean
  sort_order?: number
}

export interface ImportGitHubImageStudioTemplatesRequest {
  sources?: string[]
  limit?: number
}

export interface ImportGitHubImageStudioTemplatesResult {
  discovered: number
  created: number
  updated: number
  image_downloaded: number
  image_failed: number
  sources: string[]
  errors?: string[]
  preview_asset_root: string
}

export async function list(
  params?: ListImageStudioTemplatesParams,
): Promise<ListImageStudioTemplatesResponse> {
  const { data } = await apiClient.get<ListImageStudioTemplatesResponse>('/admin/image-studio-templates', {
    params,
  })
  return data
}

export async function update(
  id: number,
  payload: UpdateImageStudioTemplateRequest,
): Promise<AdminImageStudioTemplate> {
  const { data } = await apiClient.put<AdminImageStudioTemplate>(`/admin/image-studio-templates/${id}`, payload)
  return data
}

export async function updateMany(
  ids: number[],
  payload: UpdateImageStudioTemplateRequest,
): Promise<AdminImageStudioTemplate[]> {
  const results = await Promise.all(ids.map((id) => update(id, payload)))
  return results
}

export async function importGitHub(
  payload?: ImportGitHubImageStudioTemplatesRequest,
): Promise<ImportGitHubImageStudioTemplatesResult> {
  const { data } = await apiClient.post<ImportGitHubImageStudioTemplatesResult>(
    '/admin/image-studio-templates/import/github',
    payload ?? {},
    { timeout: 600000 },
  )
  return data
}

export const imageStudioTemplatesAPI = {
  list,
  update,
  updateMany,
  importGitHub,
}

export default imageStudioTemplatesAPI
