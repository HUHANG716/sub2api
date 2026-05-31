<template>
  <AppLayout>
    <div class="image-playground-page image-playground-page--flush" data-test="image-playground-page">
      <header class="image-playground-header image-playground-toolbar" data-test="image-playground-header">
        <div class="image-playground-title-block">
          <span class="image-playground-kicker">{{ t('imagePlayground.kicker') }}</span>
          <h1>{{ t('imagePlayground.title') }}</h1>
          <p>{{ t('imagePlayground.description') }}</p>
        </div>
        <div v-if="iframeSrc" class="image-playground-session">
          <div
            class="image-playground-estimate"
            data-test="image-playground-estimate"
            :class="{ 'image-playground-estimate--muted': estimateState !== 'ready' }"
          >
            <span>{{ t('imagePlayground.estimatedCost') }}</span>
            <strong>{{ estimateLabel }}</strong>
          </div>
          <p class="image-playground-key-summary" data-test="image-playground-key-summary">
            <span>{{ currentKeyLabel }}</span>
            <span>{{ currentGroupLabel }}</span>
          </p>
          <button
            type="button"
            class="image-playground-regenerate"
            data-test="image-playground-regenerate"
            :disabled="loading"
            :aria-label="t('imagePlayground.regenerateKey')"
            @click="regenerateKey"
          >
            <Icon name="key" size="sm" />
            <span>{{ t('imagePlayground.regenerateKey') }}</span>
          </button>
        </div>
      </header>

      <section v-if="loading" class="image-playground-state" data-test="image-playground-loading">
        <div class="image-playground-spinner"></div>
        <p>{{ t('imagePlayground.loading') }}</p>
      </section>

      <section v-else-if="state === 'missing-config'" class="image-playground-state image-playground-state-error">
        <Icon name="sparkles" size="lg" />
        <h2>{{ t('imagePlayground.missingConfiguredGroupTitle') }}</h2>
        <p>{{ t('imagePlayground.missingConfiguredGroupDescription') }}</p>
        <button type="button" class="btn btn-primary" @click="preparePlayground()">
          {{ t('imagePlayground.retry') }}
        </button>
      </section>

      <section v-else-if="state === 'unavailable-group'" class="image-playground-state image-playground-state-error">
        <Icon name="exclamationTriangle" size="lg" />
        <h2>{{ t('imagePlayground.unavailableConfiguredGroupTitle') }}</h2>
        <p>{{ t('imagePlayground.unavailableConfiguredGroupDescription') }}</p>
        <button type="button" class="btn btn-primary" @click="preparePlayground()">
          {{ t('imagePlayground.retry') }}
        </button>
      </section>

      <section v-else-if="state === 'failed'" class="image-playground-state image-playground-state-error">
        <Icon name="exclamationTriangle" size="lg" />
        <h2>{{ t('imagePlayground.createFailedTitle') }}</h2>
        <p>{{ t('imagePlayground.createFailedDescription') }}</p>
        <button type="button" class="btn btn-primary" @click="preparePlayground()">
          {{ t('imagePlayground.retry') }}
        </button>
      </section>

      <iframe
        v-else-if="iframeSrc"
        data-test="image-playground-frame"
        class="image-playground-frame image-playground-frame--workspace"
        :key="iframeSrc"
        :src="iframeSrc"
        :title="t('imagePlayground.title')"
        allow="clipboard-read; clipboard-write"
        referrerpolicy="same-origin"
      ></iframe>

      <ConfirmDialog
        :show="renewConfirmVisible"
        :title="confirmDialogTitle"
        :message="renewConfirmMessage"
        :confirm-text="confirmDialogAction"
        :cancel-text="t('common.cancel')"
        @confirm="confirmRenewAccess"
        @cancel="cancelRenewAccess"
      />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { keysAPI, usageAPI, userGroupsAPI } from '@/api'
import AppLayout from '@/components/layout/AppLayout.vue'
import Icon from '@/components/icons/Icon.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import { useAppStore } from '@/stores/app'
import type { ApiKey, Group, PublicSettings } from '@/types'
import type { ImagePlaygroundEvent, ImagePlaygroundEventName } from '@/api/usage'
import {
  IMAGE_PLAYGROUND_KEY_NAME,
  buildImagePlaygroundUrl,
  clearStoredImagePlaygroundKey,
  findConfiguredImagePlaygroundGroup,
  isImagePlaygroundGroup,
  readStoredImagePlaygroundKey,
  storedKeyMatchesGroup,
  type StoredImagePlaygroundKey,
  writeStoredImagePlaygroundKey
} from './imagePlayground'

type PlaygroundState = 'loading' | 'ready' | 'missing-config' | 'unavailable-group' | 'failed'
type EstimateState = 'idle' | 'loading' | 'ready' | 'failed'
type PrepareReason = 'initial' | 'confirmed-renew' | 'confirmed-create' | 'confirmed-recreate'
type RenewReason = 'manual' | 'expired' | 'create' | 'unsupported-group'

interface PlaygroundParamsMessage {
  type?: string
  payload?: {
    model?: unknown
    size?: unknown
    count?: unknown
  }
}

interface PlaygroundAnalyticsMessage {
  type?: string
  event?: {
    name?: unknown
    payload?: Record<string, unknown>
  }
}

interface PlaygroundRecreateKeyMessage {
  type?: string
  reason?: unknown
}

const allowedAnalyticsEvents = new Set<ImagePlaygroundEventName>([
  'image_generate_submit',
  'image_generate_success',
  'image_generate_error'
])

const agentAnalyticsEventMap: Record<string, ImagePlaygroundEventName> = {
  agent_image_generate_submit: 'image_generate_submit',
  agent_image_generate_success: 'image_generate_success',
  agent_image_generate_error: 'image_generate_error'
}

const analyticsStringFields = [
  'sourceMode',
  'provider',
  'apiMode',
  'model',
  'size',
  'quality',
  'outputFormat',
  'errorKind'
] as const

const analyticsNumberFields = [
  'n',
  'inputImageCount',
  'durationMs',
  'outputImageCount'
] as const

const analyticsBooleanFields = [
  'hasMask',
  'recoverable'
] as const

const { t } = useI18n()
const appStore = useAppStore()

const loading = ref(true)
const state = ref<PlaygroundState>('loading')
const iframeSrc = ref('')
const availableGroups = ref<Group[]>([])
const storedKey = ref<StoredImagePlaygroundKey | null>(null)
const creating = ref(false)
const activeGroup = ref<Group | null>(null)
const estimateState = ref<EstimateState>('idle')
const estimateCost = ref<number | null>(null)
const estimateAbort = ref<AbortController | null>(null)
const iframeRefreshCounter = ref(0)
const renewConfirmVisible = ref(false)
const pendingRenewReason = ref<RenewReason>('manual')
const pendingRenewGroup = ref<Group | null>(null)
const pendingRenewStoredKey = ref<StoredImagePlaygroundKey | null>(null)

const currentKeyLabel = computed(() =>
  storedKey.value ? `Key #${storedKey.value.key_id}` : ''
)

const currentGroupLabel = computed(() => {
  const key = storedKey.value
  if (!key) return ''
  if (key.group_name) return key.group_name
  if (typeof key.group_id === 'number') return `Group #${key.group_id}`
  return t('imagePlayground.groupUnknown')
})

const estimateLabel = computed(() => {
  if (estimateState.value === 'loading') return t('imagePlayground.estimateLoading')
  if (estimateState.value === 'failed') return t('imagePlayground.estimateUnavailable')
  if (estimateCost.value == null) return t('imagePlayground.estimateWaiting')
  return `$${estimateCost.value.toFixed(4)}`
})

const renewConfirmMessage = computed(() =>
  pendingRenewReason.value === 'create'
    ? t('imagePlayground.createConfirmDescription')
    : pendingRenewReason.value === 'unsupported-group'
    ? t('imagePlayground.renewUnsupportedGroupConfirmDescription')
    : pendingRenewReason.value === 'expired'
    ? t('imagePlayground.renewExpiredConfirmDescription')
    : t('imagePlayground.renewManualConfirmDescription')
)

const confirmDialogTitle = computed(() =>
  pendingRenewReason.value === 'create'
    ? t('imagePlayground.createConfirmTitle')
    : t('imagePlayground.renewConfirmTitle')
)

const confirmDialogAction = computed(() =>
  pendingRenewReason.value === 'create'
    ? t('imagePlayground.createConfirmAction')
    : t('imagePlayground.renewConfirmAction')
)

function setReady(stored: StoredImagePlaygroundKey) {
  storedKey.value = stored
  iframeRefreshCounter.value += 1
  iframeSrc.value = buildImagePlaygroundUrl({
    origin: window.location.origin,
    apiKey: stored.key,
    refreshToken: String(iframeRefreshCounter.value)
  })
  state.value = 'ready'
}

function isReusablePlaygroundKey(apiKey: ApiKey | null | undefined, groupId: number): apiKey is ApiKey {
  return (
    !!apiKey &&
    apiKey.name === IMAGE_PLAYGROUND_KEY_NAME &&
    apiKey.group_id === groupId &&
    apiKey.status === 'active' &&
    typeof apiKey.key === 'string' &&
    apiKey.key.trim() !== ''
  )
}

function saveAndUseKey(apiKey: ApiKey, group: Group) {
  const saved = writeStoredImagePlaygroundKey(apiKey, group)
  setReady(saved)
}

async function verifyStoredKey(stored: StoredImagePlaygroundKey | null, group: Group): Promise<{
  key: ApiKey | null
  missing: boolean
}> {
  if (!storedKeyMatchesGroup(stored, group.id)) {
    return { key: null, missing: false }
  }

  try {
    const apiKey = await keysAPI.getById(stored.key_id)
    return { key: isReusablePlaygroundKey(apiKey, group.id) ? apiKey : null, missing: false }
  } catch (error) {
    const status = typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status?: unknown }).status)
      : 0
    if (status === 404) return { key: null, missing: true }
    throw error
  }
}

async function findExistingPlaygroundKey(group: Group): Promise<ApiKey | null> {
  const response = await keysAPI.list(1, 20, {
    search: IMAGE_PLAYGROUND_KEY_NAME,
    status: 'active',
    group_id: group.id,
    sort_by: 'created_at',
    sort_order: 'desc'
  })
  return response.items.find((apiKey) => isReusablePlaygroundKey(apiKey, group.id)) ?? null
}

async function getConfiguredGroupId(): Promise<number> {
  const cached = appStore.cachedPublicSettings as PublicSettings | null
  const settings = cached ?? await appStore.fetchPublicSettings()
  const raw = settings?.image_playground_group_id
  return typeof raw === 'number' && raw > 0 ? raw : 0
}

async function createKeyForGroup(group: Group) {
  creating.value = true
  try {
    const apiKey = await keysAPI.create(IMAGE_PLAYGROUND_KEY_NAME, group.id)
    const saved = writeStoredImagePlaygroundKey(apiKey, group)
    setReady(saved)
  } catch (error) {
    console.error('Failed to create image playground key:', error)
    clearStoredImagePlaygroundKey()
    storedKey.value = null
    iframeSrc.value = ''
    state.value = 'failed'
  } finally {
    creating.value = false
  }
}

async function retireStoredPlaygroundKey(stored: StoredImagePlaygroundKey | null) {
  if (!stored?.key_id) return
  try {
    await keysAPI.delete(stored.key_id)
  } catch (error) {
    const status = typeof error === 'object' && error !== null && 'status' in error
      ? Number((error as { status?: unknown }).status)
      : 0
    if (status !== 404) {
      console.warn('Failed to retire previous image playground key:', error)
    }
  }
}

function requestRenewAccess(reason: RenewReason, group: Group, stored: StoredImagePlaygroundKey | null = null) {
  pendingRenewReason.value = reason
  pendingRenewGroup.value = group
  pendingRenewStoredKey.value = stored
  renewConfirmVisible.value = true
  loading.value = false
  state.value = iframeSrc.value ? 'ready' : 'failed'
}

async function preparePlayground(reason: PrepareReason = 'initial') {
  loading.value = true
  state.value = 'loading'
  iframeSrc.value = ''

  try {
    const configuredGroupId = await getConfiguredGroupId()
    if (!configuredGroupId) {
      clearStoredImagePlaygroundKey()
      storedKey.value = null
      state.value = 'missing-config'
      return
    }

    const groups = await userGroupsAPI.getAvailable()
    availableGroups.value = groups.filter(isImagePlaygroundGroup)
    const group = findConfiguredImagePlaygroundGroup(availableGroups.value, configuredGroupId)
    if (!group) {
      clearStoredImagePlaygroundKey()
      storedKey.value = null
      activeGroup.value = null
      state.value = 'unavailable-group'
      return
    }
    activeGroup.value = group

    const stored = readStoredImagePlaygroundKey()
    if (storedKeyMatchesGroup(stored, configuredGroupId)) {
      const verified = await verifyStoredKey(stored, group)
      if (verified.key) {
        saveAndUseKey(verified.key, group)
        return
      }

      if (verified.missing && reason !== 'confirmed-renew') {
        requestRenewAccess('expired', group, stored)
        return
      }
      clearStoredImagePlaygroundKey()
      storedKey.value = null
    } else {
      clearStoredImagePlaygroundKey()
      storedKey.value = null
    }

    const existingKey = reason === 'confirmed-recreate' ? null : await findExistingPlaygroundKey(group)
    if (existingKey) {
      saveAndUseKey(existingKey, group)
      return
    }

    if (reason === 'initial') {
      requestRenewAccess('create', group)
      return
    }

    await createKeyForGroup(group)
  } catch (error) {
    console.error('Failed to prepare image playground:', error)
    clearStoredImagePlaygroundKey()
    activeGroup.value = null
    state.value = 'failed'
  } finally {
    loading.value = false
  }
}

async function updateEstimate(payload: PlaygroundParamsMessage['payload']) {
  const group = activeGroup.value
  if (!group || !payload) return
  const model = typeof payload.model === 'string' && payload.model.trim()
    ? payload.model.trim()
    : 'gpt-image-2'
  const size = typeof payload.size === 'string' && payload.size.trim()
    ? payload.size.trim()
    : 'auto'
  const rawCount = typeof payload.count === 'number' ? payload.count : Number(payload.count)
  const count = Number.isFinite(rawCount) ? Math.max(1, Math.min(16, Math.floor(rawCount))) : 1

  estimateAbort.value?.abort()
  const controller = new AbortController()
  estimateAbort.value = controller
  estimateState.value = 'loading'

  try {
    const estimate = await usageAPI.estimateImageCost({
      group_id: group.id,
      model,
      size,
      count
    }, { signal: controller.signal })
    if (controller.signal.aborted) return
    estimateCost.value = estimate.actual_cost
    estimateState.value = 'ready'
  } catch (error) {
    if (controller.signal.aborted) return
    console.warn('Failed to estimate image playground cost:', error)
    estimateState.value = 'failed'
  }
}

function normalizeImagePlaygroundAnalyticsEvent(
  event: PlaygroundAnalyticsMessage['event']
): ImagePlaygroundEvent | null {
  if (!event || typeof event.name !== 'string') {
    return null
  }
  const normalizedName = allowedAnalyticsEvents.has(event.name as ImagePlaygroundEventName)
    ? event.name as ImagePlaygroundEventName
    : agentAnalyticsEventMap[event.name]
  if (!normalizedName) return null

  const payload = event.payload && typeof event.payload === 'object' ? event.payload : {}
  const normalized: ImagePlaygroundEvent = {
    name: normalizedName
  }

  for (const field of analyticsStringFields) {
    const value = payload[field]
    if (typeof value === 'string' && value.trim()) {
      normalized[field] = value.trim()
    }
  }
  for (const field of analyticsNumberFields) {
    const value = payload[field]
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      normalized[field] = Math.floor(value)
    }
  }
  for (const field of analyticsBooleanFields) {
    const value = payload[field]
    if (typeof value === 'boolean') {
      normalized[field] = value
    }
  }
  if (event.name.startsWith('agent_image_generate_')) {
    normalized.sourceMode = 'agent'
  }
  return normalized
}

function recordImagePlaygroundAnalytics(event: PlaygroundAnalyticsMessage['event']) {
  const normalized = normalizeImagePlaygroundAnalyticsEvent(event)
  if (!normalized) return

  void usageAPI.recordImagePlaygroundEvents({ events: [normalized] }).catch((error) => {
    console.warn('Failed to record image playground analytics:', error)
  })
}

function handlePlaygroundMessage(event: MessageEvent) {
  if (event.origin !== window.location.origin) return
  const data = event.data as PlaygroundParamsMessage | PlaygroundAnalyticsMessage | PlaygroundRecreateKeyMessage
  if (!data) return
  if (data.type === 'hahacode:image-playground-params') {
    void updateEstimate((data as PlaygroundParamsMessage).payload)
    return
  }
  if (data.type === 'image-playground:analytics') {
    recordImagePlaygroundAnalytics((data as PlaygroundAnalyticsMessage).event)
    return
  }
  if (
    data.type === 'image-playground:recreate-key-request' &&
    (data as PlaygroundRecreateKeyMessage).reason === 'image_generation_disabled_for_group'
  ) {
    const group = activeGroup.value
    if (!group || renewConfirmVisible.value) return
    requestRenewAccess('unsupported-group', group, storedKey.value)
  }
}

async function regenerateKey() {
  const group = activeGroup.value
  if (group) {
    requestRenewAccess('manual', group, storedKey.value)
    return
  }
  await preparePlayground('initial')
}

async function confirmRenewAccess() {
  renewConfirmVisible.value = false
  clearStoredImagePlaygroundKey()
  if (pendingRenewStoredKey.value && storedKey.value?.key_id === pendingRenewStoredKey.value.key_id) {
    storedKey.value = null
    iframeSrc.value = ''
  }
  const group = pendingRenewGroup.value
  const reason = pendingRenewReason.value
  const keyToRetire = pendingRenewStoredKey.value
  pendingRenewGroup.value = null
  pendingRenewStoredKey.value = null
  storedKey.value = null
  if (group) activeGroup.value = group
  await preparePlayground(
    reason === 'create'
      ? 'confirmed-create'
      : reason === 'unsupported-group'
      ? 'confirmed-recreate'
      : 'confirmed-renew'
  )
  if (reason === 'unsupported-group' && iframeSrc.value) {
    void retireStoredPlaygroundKey(keyToRetire)
  }
}

function cancelRenewAccess() {
  renewConfirmVisible.value = false
  pendingRenewGroup.value = null
  pendingRenewStoredKey.value = null
  loading.value = false
  if (!iframeSrc.value) state.value = 'failed'
}

onMounted(() => {
  window.addEventListener('message', handlePlaygroundMessage)
  void preparePlayground()
})

onBeforeUnmount(() => {
  estimateAbort.value?.abort()
  window.removeEventListener('message', handlePlaygroundMessage)
})
</script>

<style scoped>
.image-playground-page {
  display: flex;
  height: 100dvh;
  min-height: 100dvh;
  flex-direction: column;
  overflow: hidden;
  background: var(--theme-main-surface);
}

.image-playground-page--flush {
  margin: 0;
}

.image-playground-header {
  display: flex;
  min-height: 2.5rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-bottom: 1px solid var(--theme-border);
  background: color-mix(in srgb, var(--theme-main-surface) 88%, var(--theme-surface));
  padding: 0.375rem 0.875rem;
}

.image-playground-title-block {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 0.625rem;
}

.image-playground-header h1 {
  margin: 0;
  color: var(--theme-text-primary);
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1.3;
  white-space: nowrap;
}

.image-playground-header p {
  display: none;
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--theme-text-muted);
  font-size: 0.8125rem;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.image-playground-kicker {
  display: inline-flex;
  min-height: 1.25rem;
  align-items: center;
  border: 1px solid color-mix(in srgb, var(--theme-primary) 24%, var(--theme-border));
  border-radius: 999px;
  background: color-mix(in srgb, var(--theme-primary) 8%, transparent);
  color: var(--theme-primary);
  font-size: 0.6875rem;
  font-weight: 700;
  line-height: 1;
  padding: 0 0.5rem;
  text-transform: uppercase;
  white-space: nowrap;
}

.image-playground-session {
  display: flex;
  min-width: 0;
  flex-shrink: 0;
  align-items: center;
  gap: 0.5rem;
}

.image-playground-estimate {
  display: inline-flex;
  min-width: 7.75rem;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.5rem;
  border: 1px solid color-mix(in srgb, var(--theme-primary) 20%, var(--theme-border));
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--theme-surface) 80%, transparent);
  color: var(--theme-text-secondary);
  font-size: 0.75rem;
  line-height: 1.2;
  padding: 0.3125rem 0.5rem;
  white-space: nowrap;
}

.image-playground-estimate strong {
  color: var(--theme-text-primary);
  font-size: 0.8125rem;
  font-weight: 800;
}

.image-playground-estimate--muted strong {
  color: var(--theme-text-muted);
  font-weight: 700;
}

.image-playground-key-summary {
  display: flex;
  min-width: 0;
  max-width: min(24vw, 16rem);
  align-items: center;
  gap: 0.5rem;
  color: var(--theme-text-secondary);
  font-size: 0.75rem;
  line-height: 1.35;
  white-space: nowrap;
}

.image-playground-regenerate {
  display: inline-flex;
  min-height: 1.875rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  border: 1px solid var(--theme-border);
  border-radius: 0.5rem;
  background: var(--theme-surface);
  color: var(--theme-text-secondary);
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
  padding: 0 0.625rem;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.image-playground-regenerate:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--theme-primary) 28%, var(--theme-border));
  background: color-mix(in srgb, var(--theme-primary) 8%, var(--theme-surface));
  color: var(--theme-text-primary);
}

.image-playground-regenerate:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.image-playground-key-summary span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.image-playground-key-summary span:first-child {
  flex-shrink: 0;
  color: var(--theme-text-primary);
  font-weight: 700;
}

.image-playground-key-summary span + span::before {
  margin-right: 0.5rem;
  color: var(--theme-text-muted);
  content: "/";
}

.image-playground-frame {
  display: block;
  min-height: 0;
  width: 100%;
  flex: 1 1 auto;
  overflow: hidden;
  border: 0;
  border-radius: 0;
  background: var(--theme-main-surface);
  box-shadow: none;
}

.image-playground-state {
  display: flex;
  min-height: 0;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  border: 0;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--theme-surface) 52%, transparent), transparent 42%),
    var(--theme-main-surface);
  padding: 2rem;
  text-align: center;
}

.image-playground-state h2 {
  margin: 0;
  color: var(--theme-text-primary);
  font-size: 1.125rem;
  font-weight: 700;
}

.image-playground-state p {
  margin: 0;
  max-width: 28rem;
  color: var(--theme-text-secondary);
  font-size: 0.875rem;
  line-height: 1.6;
}

.image-playground-state-error :deep(svg) {
  color: var(--theme-primary);
}

.image-playground-spinner {
  height: 2rem;
  width: 2rem;
  border: 3px solid var(--theme-border);
  border-top-color: var(--theme-primary);
  border-radius: 999px;
  animation: image-playground-spin 0.8s linear infinite;
}

@keyframes image-playground-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 640px) {
  .image-playground-header {
    min-height: 2.25rem;
    padding: 0.3125rem 0.5rem;
  }

  .image-playground-title-block {
    gap: 0.5rem;
  }

  .image-playground-header p {
    display: none;
  }

  .image-playground-kicker {
    display: none;
  }

  .image-playground-session {
    gap: 0.375rem;
  }

  .image-playground-key-summary {
    display: none;
  }

  .image-playground-estimate {
    min-width: 6.75rem;
  }

  .image-playground-regenerate {
    min-width: 1.875rem;
    padding: 0;
  }

  .image-playground-regenerate span {
    display: none;
  }

}

@media (max-width: 1023px) {
  .image-playground-page {
    height: calc(100dvh - 4rem);
    min-height: calc(100dvh - 4rem);
  }
}

@media (min-width: 768px) {
  .image-playground-header {
    padding-left: 1rem;
    padding-right: 1rem;
  }
}

@media (min-width: 1024px) {
  .image-playground-header {
    padding-left: 1.25rem;
    padding-right: 1.25rem;
  }
}
</style>
