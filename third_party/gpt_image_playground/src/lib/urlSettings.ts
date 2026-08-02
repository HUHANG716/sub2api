import type { ApiMode, AppMode, AppSettings } from '../types'
import { normalizeBaseUrl } from './devProxy'
import { isProductEmbedMode } from './productEmbed'
import {
  createDefaultOpenAIProfile,
  DEFAULT_IMAGES_MODEL,
  DEFAULT_RESPONSES_MODEL,
  findEquivalentApiProfile,
  mergeImportedSettings,
  normalizeSettings,
  normalizeStreamPartialImages,
} from './apiProfiles'

const URL_SETTING_KEYS = ['settings', 'apiUrl', 'apiKey', 'codexCli', 'apiMode', 'appMode', 'model', 'streamImages', 'streamPartialImages', 'embed']
export const PRODUCT_EMBED_SETTINGS_STORAGE_KEY = 'hahacode.imagePlayground.settings'

function getProfileDedupKey(profile: Pick<AppSettings['profiles'][number], 'provider' | 'baseUrl' | 'apiKey' | 'model' | 'apiMode' | 'streamImages' | 'streamPartialImages'>) {
  return JSON.stringify([
    profile.provider,
    profile.baseUrl.trim().replace(/\/+$/, '').toLowerCase(),
    profile.apiKey.trim(),
    profile.model.trim(),
    profile.apiMode,
    profile.streamImages === true,
    profile.streamPartialImages ?? 0,
  ])
}

function createUrlProfileId(usedIds: Set<string>) {
  let id = `openai-url-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  while (usedIds.has(id)) {
    id = `openai-url-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  }
  return id
}

function pickUrlSettingsPayload(value: unknown): unknown | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const record = value as Record<string, unknown>
  return {
    customProviders: record.customProviders,
    profiles: record.profiles,
  }
}

function getUrlSettingsPayload(searchParams: URLSearchParams): unknown | null {
  const raw = searchParams.get('settings')
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && 'settings' in parsed) {
      return pickUrlSettingsPayload((parsed as { settings?: unknown }).settings ?? null)
    }
    return pickUrlSettingsPayload(parsed)
  } catch {
    return null
  }
}

function getProductEmbedSettingsPayload(searchParams: URLSearchParams): unknown | null {
  if (!isProductEmbedMode(`?${searchParams.toString()}`) || typeof window === 'undefined') return null

  const raw = window.sessionStorage.getItem(PRODUCT_EMBED_SETTINGS_STORAGE_KEY)
  if (!raw) return null

  try {
    return pickUrlSettingsPayload(JSON.parse(raw))
  } catch {
    return null
  }
}

function preserveProductEmbedStreamImages(currentSettings: Partial<AppSettings> | unknown, settings: AppSettings): AppSettings {
  if (!currentSettings || typeof currentSettings !== 'object' || Array.isArray(currentSettings)) return settings
  const profiles = (currentSettings as { profiles?: unknown }).profiles
  if (!Array.isArray(profiles)) return settings

  const streamImagesById = new Map<string, boolean>()
  for (const profile of profiles) {
    if (!profile || typeof profile !== 'object' || Array.isArray(profile)) continue
    const record = profile as Record<string, unknown>
    if (typeof record.id === 'string' && typeof record.streamImages === 'boolean') {
      streamImagesById.set(record.id, record.streamImages)
    }
  }

  return normalizeSettings({
    ...settings,
    profiles: settings.profiles.map((profile) => {
      const streamImages = streamImagesById.get(profile.id)
      return typeof streamImages === 'boolean' ? { ...profile, streamImages } : profile
    }),
  })
}

function activateFirstImportedProfile(settings: AppSettings, importedSettings: unknown): AppSettings {
  if (!importedSettings || typeof importedSettings !== 'object' || Array.isArray(importedSettings)) return settings

  const record = importedSettings as Record<string, unknown>
  if (!Array.isArray(record.profiles) || record.profiles.length === 0) return settings

  const imported = normalizeSettings({
    customProviders: record.customProviders,
    profiles: record.profiles,
  })
  const importedProfile = imported.profiles[0]
  const activeProfile = findEquivalentApiProfile(settings, importedProfile, imported.customProviders)

  return activeProfile
    ? normalizeSettings({ ...settings, activeProfileId: activeProfile.id })
    : settings
}

export function hasUrlSettingParams(searchParams: URLSearchParams) {
  return URL_SETTING_KEYS.some((key) => searchParams.has(key))
}

export function clearUrlSettingParams(searchParams: URLSearchParams) {
  for (const key of URL_SETTING_KEYS) searchParams.delete(key)
}

export function getAppModeFromUrlParams(searchParams: URLSearchParams): AppMode | undefined {
  const appModeParam = searchParams.get('appMode')
  return appModeParam === 'gallery' || appModeParam === 'templates' || appModeParam === 'agent' ? appModeParam : undefined
}

export function buildSettingsFromUrlParams(currentSettings: Partial<AppSettings> | unknown, searchParams: URLSearchParams): Partial<AppSettings> {
  const productEmbedSettings = getProductEmbedSettingsPayload(searchParams)
  const importedSettings = productEmbedSettings ?? getUrlSettingsPayload(searchParams)
  const apiUrlParam = searchParams.get('apiUrl')
  const apiKeyParam = searchParams.get('apiKey')
  const codexCliParam = searchParams.get('codexCli')
  const apiModeParam = searchParams.get('apiMode')
  const modelParam = searchParams.get('model')
  const streamImagesParam = searchParams.get('streamImages')
  const streamPartialImagesParam = searchParams.get('streamPartialImages')
  const apiMode: ApiMode | undefined = apiModeParam === 'images' || apiModeParam === 'responses' ? apiModeParam : undefined

  const hasLegacyOpenAIParams = apiUrlParam !== null || apiKeyParam !== null || codexCliParam !== null || apiMode !== undefined || modelParam !== null || streamImagesParam !== null || streamPartialImagesParam !== null
  const settings = importedSettings == null
    ? normalizeSettings(currentSettings)
    : productEmbedSettings != null
      ? preserveProductEmbedStreamImages(
          currentSettings,
          activateFirstImportedProfile(normalizeSettings(importedSettings), importedSettings),
        )
      : activateFirstImportedProfile(mergeImportedSettings(currentSettings, importedSettings), importedSettings)

  if (productEmbedSettings != null) {
    return settings
  }

  if (hasLegacyOpenAIParams) {
    const profileApiMode = apiMode ?? 'images'
    const profile = createDefaultOpenAIProfile({
      id: createUrlProfileId(new Set(settings.profiles.map((item) => item.id))),
      name: 'URL 参数配置',
      apiMode: profileApiMode,
      model: profileApiMode === 'responses' ? DEFAULT_RESPONSES_MODEL : DEFAULT_IMAGES_MODEL,
    })
    if (apiUrlParam !== null) profile.baseUrl = normalizeBaseUrl(apiUrlParam.trim())
    if (apiKeyParam !== null) profile.apiKey = apiKeyParam.trim()
    if (modelParam !== null && modelParam.trim()) profile.model = modelParam.trim()
    if (codexCliParam !== null) profile.codexCli = codexCliParam.trim().toLowerCase() === 'true'
    if (streamImagesParam !== null) profile.streamImages = streamImagesParam.trim().toLowerCase() === 'true'
    if (streamPartialImagesParam !== null) profile.streamPartialImages = normalizeStreamPartialImages(streamPartialImagesParam)

    const existingProfile = settings.profiles.find((item) => getProfileDedupKey(item) === getProfileDedupKey(profile))
    if (existingProfile) {
      return normalizeSettings({ ...settings, activeProfileId: existingProfile.id })
    }

    return normalizeSettings({
      ...settings,
      profiles: [...settings.profiles, profile],
      activeProfileId: profile.id,
    })
  }

  return importedSettings == null ? {} : settings
}
