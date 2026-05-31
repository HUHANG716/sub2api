import type { ApiKey, Group } from '@/types'

export const IMAGE_PLAYGROUND_STORAGE_KEY = 'image_playground_api_key'
export const IMAGE_PLAYGROUND_SETTINGS_STORAGE_KEY = 'hahacode.imagePlayground.settings'
export const IMAGE_PLAYGROUND_KEY_NAME = 'Image Playground'
export const IMAGE_PLAYGROUND_APP_PATH = '/image-playground-app/'
export const IMAGE_PLAYGROUND_MODEL = 'gpt-image-2'
export const IMAGE_PLAYGROUND_AGENT_MODEL = 'gpt-5.5'

export interface StoredImagePlaygroundKey {
  key: string
  key_id: number
  group_id: number | null
  group_name?: string | null
  created_at: string
}

export function isImagePlaygroundGroup(group: Group): boolean {
  return (
    group.platform === 'openai' &&
    group.status === 'active' &&
    group.allow_image_generation === true
  )
}

export function selectImagePlaygroundGroup(groups: Group[]): Group | null {
  return groups.find(isImagePlaygroundGroup) ?? null
}

export function findConfiguredImagePlaygroundGroup(groups: Group[], groupId: number | null | undefined): Group | null {
  if (!groupId || groupId <= 0) return null
  return groups.find((group) => group.id === groupId && isImagePlaygroundGroup(group)) ?? null
}

export function storedKeyMatchesGroup(
  stored: StoredImagePlaygroundKey | null,
  groupId: number | null | undefined
): stored is StoredImagePlaygroundKey {
  return !!stored && !!stored.key?.trim() && typeof groupId === 'number' && groupId > 0 && stored.group_id === groupId
}

export function buildImagePlaygroundUrl(options: {
  origin: string
  apiKey: string
  refreshToken?: string
}): string {
  const origin = options.origin.replace(/\/+$/, '')
  const url = new URL(IMAGE_PLAYGROUND_APP_PATH, `${origin}/`)
  const settings = {
    profiles: [
      {
        id: 'hahacode-images',
        name: 'Hahacode Images API',
        provider: 'openai',
        baseUrl: `${origin}/v1`,
        apiKey: options.apiKey,
        model: IMAGE_PLAYGROUND_MODEL,
        timeout: 600,
        apiMode: 'images',
        codexCli: false,
        apiProxy: false,
        streamImages: true,
        streamPartialImages: 3
      },
      {
        id: 'hahacode-agent',
        name: 'Hahacode Agent Responses API',
        provider: 'openai',
        baseUrl: `${origin}/v1`,
        apiKey: options.apiKey,
        model: IMAGE_PLAYGROUND_AGENT_MODEL,
        timeout: 600,
        apiMode: 'responses',
        codexCli: false,
        apiProxy: false,
        streamImages: true,
        streamPartialImages: 3
      }
    ],
    activeProfileId: 'hahacode-images'
  }
  window.sessionStorage.setItem(IMAGE_PLAYGROUND_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  url.searchParams.set('appMode', 'gallery')
  url.searchParams.set('embed', 'product')
  if (options.refreshToken) url.searchParams.set('refresh', options.refreshToken)
  return url.toString()
}

export function readStoredImagePlaygroundKey(): StoredImagePlaygroundKey | null {
  const raw = window.localStorage.getItem(IMAGE_PLAYGROUND_STORAGE_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<StoredImagePlaygroundKey>
    if (!parsed || typeof parsed !== 'object') return null
    if (typeof parsed.key !== 'string' || parsed.key.trim() === '') return null
    if (typeof parsed.key_id !== 'number') return null
    if (parsed.group_id !== null && typeof parsed.group_id !== 'number') return null
    if (typeof parsed.created_at !== 'string') return null
    return {
      key: parsed.key,
      key_id: parsed.key_id,
      group_id: parsed.group_id,
      group_name: typeof parsed.group_name === 'string' && parsed.group_name.trim()
        ? parsed.group_name
        : null,
      created_at: parsed.created_at
    }
  } catch {
    return null
  }
}

export function writeStoredImagePlaygroundKey(apiKey: ApiKey, group?: Group | null): StoredImagePlaygroundKey {
  if (!apiKey.key?.trim()) {
    throw new Error('Created API key did not include a plaintext key')
  }

  const stored: StoredImagePlaygroundKey = {
    key: apiKey.key,
    key_id: apiKey.id,
    group_id: apiKey.group_id,
    group_name: group?.name ?? apiKey.group?.name ?? null,
    created_at: new Date().toISOString()
  }
  window.localStorage.setItem(IMAGE_PLAYGROUND_STORAGE_KEY, JSON.stringify(stored))
  return stored
}

export function clearStoredImagePlaygroundKey() {
  window.localStorage.removeItem(IMAGE_PLAYGROUND_STORAGE_KEY)
  window.sessionStorage.removeItem(IMAGE_PLAYGROUND_SETTINGS_STORAGE_KEY)
}
