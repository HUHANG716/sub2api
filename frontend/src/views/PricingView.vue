<template>
  <div class="model-market-shell">
    <header class="model-market-header">
      <router-link to="/home" class="market-brand">
        <img :src="siteLogo || '/logo.png'" :alt="siteName" />
        <span>{{ siteName }}</span>
      </router-link>

      <nav class="market-nav" aria-label="Pricing navigation">
        <router-link to="/home">{{ t('home.landing.home') }}</router-link>
        <router-link v-if="isAuthenticated" :to="dashboardPath">{{ t('home.dashboard') }}</router-link>
        <router-link to="/pricing" class="market-nav-active">{{ t('home.pricing') }}</router-link>
        <router-link to="/docs">{{ t('home.docs') }}</router-link>
      </nav>

      <div class="market-header-actions">
        <LocaleSwitcher icon-only />
        <router-link :to="isAuthenticated ? dashboardPath : '/login'" class="market-account">
          <span>{{ isAuthenticated ? t('home.dashboard') : t('home.login') }}</span>
        </router-link>
      </div>
    </header>

    <main class="model-market-main">
      <aside class="market-filter-panel">
        <div class="market-filter-head">
          <h1>{{ t('modelPricing.filters.title') }}</h1>
          <button type="button" @click="resetFilters">{{ t('modelPricing.filters.reset') }}</button>
        </div>

        <FilterGroup
          :title="t('modelPricing.filters.provider')"
          :items="providerFilters"
          :selected="selectedProvider"
          @select="selectedProvider = $event"
        />
        <FilterGroup
          :title="t('modelPricing.filters.group')"
          :items="groupFilters"
          :selected="selectedGroup"
          @select="selectedGroup = $event"
        />
        <FilterGroup
          :title="t('modelPricing.filters.billing')"
          :items="billingFilters"
          :selected="selectedBilling"
          @select="selectedBilling = $event"
        />
        <FilterGroup
          :title="t('modelPricing.filters.tag')"
          :items="tagFilters"
          :selected="selectedTag"
          @select="selectedTag = $event"
        />
        <FilterGroup
          :title="t('modelPricing.filters.endpoint')"
          :items="endpointFilters"
          :selected="selectedEndpoint"
          @select="selectedEndpoint = $event"
        />
      </aside>

      <section class="market-content">
        <section class="provider-hero" :class="providerHeroClass">
          <div>
            <div class="provider-title-row">
              <h2>{{ activeProviderLabel }}</h2>
              <span>{{ t('modelPricing.modelCount', { count: filteredModels.length }) }}</span>
            </div>
            <p>{{ activeProviderDescription }}</p>
          </div>
          <PlatformIcon
            v-if="selectedProvider !== ALL"
            :platform="selectedProvider as GroupPlatform"
            size="lg"
            class="provider-hero-icon"
          />
          <Icon v-else name="cube" size="xl" class="provider-hero-icon" />
        </section>

        <section class="market-toolbar">
          <div class="market-search">
            <Icon name="search" size="sm" />
            <input
              v-model="searchQuery"
              type="search"
              :placeholder="t('modelPricing.searchPlaceholder')"
            />
          </div>
          <button type="button" class="toolbar-button" @click="copyModelNames">
            <Icon name="copy" size="sm" />
            <span>{{ t('modelPricing.copy') }}</span>
          </button>
          <label class="market-switch">
            <span>{{ t('modelPricing.showMultiplier') }}</span>
            <input v-model="showMultiplier" type="checkbox" />
          </label>
          <div class="view-toggle" role="tablist">
            <button
              type="button"
              :class="{ active: viewMode === 'cards' }"
              @click="viewMode = 'cards'"
            >
              {{ t('modelPricing.cardView') }}
            </button>
            <button
              type="button"
              :class="{ active: viewMode === 'table' }"
              @click="viewMode = 'table'"
            >
              {{ t('modelPricing.tableView') }}
            </button>
          </div>
        </section>

        <div v-if="loading" class="market-state">
          <Icon name="refresh" size="xl" class="animate-spin" />
          <span>{{ t('modelPricing.loading') }}</span>
        </div>
        <div v-else-if="loadError" class="market-state">
          <Icon name="exclamationTriangle" size="xl" />
          <span>{{ loadError }}</span>
          <button type="button" @click="loadPricing">{{ t('modelPricing.retry') }}</button>
        </div>
        <div v-else-if="filteredModels.length === 0" class="market-state">
          <Icon name="inbox" size="xl" />
          <span>{{ t('modelPricing.empty') }}</span>
        </div>

        <section v-else-if="viewMode === 'cards'" class="model-card-grid">
          <article v-for="model in pagedModels" :key="model.key" class="model-price-card">
            <div class="model-card-head">
              <PlatformIcon :platform="model.platform as GroupPlatform" size="lg" />
              <div class="min-w-0">
                <h3>{{ model.name }}</h3>
                <p>{{ model.channelNames.join(' / ') }}</p>
              </div>
              <button type="button" :title="t('modelPricing.copyModel')" @click="copyText(model.name)">
                <Icon name="copy" size="xs" />
              </button>
            </div>

            <div class="model-price-lines">
              <PriceLine :label="t('modelPricing.price.input')" :value="model.inputDisplay" />
              <PriceLine :label="t('modelPricing.price.output')" :value="model.outputDisplay" />
              <PriceLine :label="t('modelPricing.price.cacheRead')" :value="model.cacheReadDisplay" />
              <PriceLine :label="t('modelPricing.price.cacheWrite')" :value="model.cacheWriteDisplay" />
              <PriceLine
                v-if="model.requestDisplay !== '-'"
                :label="t('modelPricing.price.request')"
                :value="model.requestDisplay"
              />
            </div>

            <div class="model-card-footer">
              <span>{{ model.billingModeLabel }}</span>
              <span v-if="showMultiplier">{{ model.groupLabels.join(' · ') || '-' }}</span>
            </div>
          </article>
        </section>

        <section v-else class="market-table-wrap">
          <table class="market-table">
            <thead>
              <tr>
                <th>{{ t('modelPricing.columns.model') }}</th>
                <th>{{ t('modelPricing.columns.platform') }}</th>
                <th>{{ t('modelPricing.columns.group') }}</th>
                <th>{{ t('modelPricing.columns.billingMode') }}</th>
                <th>{{ t('modelPricing.columns.input') }}</th>
                <th>{{ t('modelPricing.columns.output') }}</th>
                <th>{{ t('modelPricing.columns.cache') }}</th>
                <th>{{ t('modelPricing.columns.request') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="model in pagedModels" :key="`row-${model.key}`">
                <td>{{ model.name }}</td>
                <td>{{ model.platform }}</td>
                <td>{{ model.groupLabels.join(' / ') || '-' }}</td>
                <td>{{ model.billingModeLabel }}</td>
                <td>{{ model.inputDisplay }}</td>
                <td>{{ model.outputDisplay }}</td>
                <td>{{ model.cacheReadDisplay }} / {{ model.cacheWriteDisplay }}</td>
                <td>{{ model.requestDisplay }}</td>
              </tr>
            </tbody>
          </table>
        </section>

        <footer v-if="filteredModels.length > 0" class="market-pagination">
          <button type="button" :disabled="page <= 1" @click="page -= 1">
            <Icon name="chevronLeft" size="sm" />
          </button>
          <span>{{ page }}</span>
          <button type="button" :disabled="page >= totalPages" @click="page += 1">
            <Icon name="chevronRight" size="sm" />
          </button>
          <select v-model.number="pageSize">
            <option :value="20">{{ t('modelPricing.pageSize', { count: 20 }) }}</option>
            <option :value="40">{{ t('modelPricing.pageSize', { count: 40 }) }}</option>
            <option :value="80">{{ t('modelPricing.pageSize', { count: 80 }) }}</option>
          </select>
        </footer>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, defineComponent, h, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import LocaleSwitcher from '@/components/common/LocaleSwitcher.vue'
import PlatformIcon from '@/components/common/PlatformIcon.vue'
import userChannelsAPI, {
  type UserAvailableChannel,
  type UserAvailableGroup,
  type UserSupportedModel,
  type UserSupportedModelPricing,
} from '@/api/channels'
import { BILLING_MODE_IMAGE, BILLING_MODE_PER_REQUEST, BILLING_MODE_TOKEN } from '@/constants/channel'
import { useAppStore, useAuthStore } from '@/stores'
import { extractApiErrorMessage } from '@/utils/apiError'
import { formatScaled } from '@/utils/pricing'
import type { GroupPlatform } from '@/types'

const ALL = 'all'

interface FilterItem {
  value: string
  label: string
  count: number
}

interface MarketModel {
  key: string
  name: string
  platform: string
  billingMode: string
  billingModeLabel: string
  endpoint: string
  inputDisplay: string
  outputDisplay: string
  cacheReadDisplay: string
  cacheWriteDisplay: string
  requestDisplay: string
  channelNames: string[]
  groupIds: string[]
  groupLabels: string[]
  tags: string[]
  searchable: string
}

const FilterGroup = defineComponent({
  props: {
    title: { type: String, required: true },
    items: { type: Array as () => FilterItem[], required: true },
    selected: { type: String, required: true },
  },
  emits: ['select'],
  setup(props, { emit }) {
    return () => h('section', { class: 'filter-group' }, [
      h('h2', props.title),
      h('div', { class: 'filter-chip-list' }, props.items.map((item) =>
        h(
          'button',
          {
            type: 'button',
            class: ['filter-chip', { 'filter-chip-active': props.selected === item.value }],
            onClick: () => emit('select', item.value),
          },
          [
            h('span', item.label),
            h('em', String(item.count)),
          ],
        ),
      )),
    ])
  },
})

const PriceLine = defineComponent({
  props: {
    label: { type: String, required: true },
    value: { type: String, required: true },
  },
  setup(props) {
    return () => h('div', { class: 'price-line' }, [
      h('span', props.label),
      h('strong', props.value),
    ])
  },
})

const { t } = useI18n()
const appStore = useAppStore()
const authStore = useAuthStore()

const channels = ref<UserAvailableChannel[]>([])
const loading = ref(false)
const loadError = ref('')
const searchQuery = ref('')
const selectedProvider = ref(ALL)
const selectedGroup = ref(ALL)
const selectedBilling = ref(ALL)
const selectedTag = ref(ALL)
const selectedEndpoint = ref(ALL)
const viewMode = ref<'cards' | 'table'>('cards')
const page = ref(1)
const pageSize = ref(20)
const showMultiplier = ref(true)

const isAuthenticated = computed(() => authStore.isAuthenticated)
const siteName = computed(() => appStore.siteName)
const siteLogo = computed(() => appStore.siteLogo)
const dashboardPath = computed(() => (authStore.isAdmin ? '/admin/dashboard' : '/dashboard'))

const allModels = computed<MarketModel[]>(() => {
  const map = new Map<string, MarketModel>()
  for (const channel of channels.value) {
    for (const section of channel.platforms) {
      const groups = section.groups
      for (const model of section.supported_models) {
        const platform = model.platform || section.platform
        const key = `${platform}::${model.name}`
        const existing = map.get(key)
        const groupIds = groups.map((g) => String(g.id))
        const groupLabels = groups.map(groupLabel)
        if (existing) {
          existing.channelNames.push(channel.name)
          existing.groupIds.push(...groupIds.filter((id) => !existing.groupIds.includes(id)))
          existing.groupLabels.push(...groupLabels.filter((label) => !existing.groupLabels.includes(label)))
          existing.searchable = buildSearchable(existing)
          continue
        }
        const row = toMarketModel(model, platform, channel.name, groups)
        map.set(key, row)
      }
    }
  }
  return [...map.values()].sort((a, b) =>
    a.platform.localeCompare(b.platform) || a.name.localeCompare(b.name),
  )
})

const filteredModels = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  return allModels.value.filter((model) => {
    if (selectedProvider.value !== ALL && model.platform !== selectedProvider.value) return false
    if (selectedGroup.value !== ALL && !model.groupIds.includes(selectedGroup.value)) return false
    if (selectedBilling.value !== ALL && model.billingMode !== selectedBilling.value) return false
    if (selectedTag.value !== ALL && !model.tags.includes(selectedTag.value)) return false
    if (selectedEndpoint.value !== ALL && model.endpoint !== selectedEndpoint.value) return false
    if (q && !model.searchable.includes(q)) return false
    return true
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredModels.value.length / pageSize.value)))
const pagedModels = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredModels.value.slice(start, start + pageSize.value)
})

const activeProviderLabel = computed(() => {
  if (selectedProvider.value === ALL) return t('modelPricing.allProviders')
  return platformLabel(selectedProvider.value)
})

const activeProviderDescription = computed(() => {
  if (selectedProvider.value === ALL) return t('modelPricing.allProviderDescription')
  return t('modelPricing.providerDescription', { provider: activeProviderLabel.value })
})

const providerHeroClass = computed(() => `provider-hero-${selectedProvider.value}`)

const providerFilters = computed(() => [
  { value: ALL, label: t('modelPricing.allProviders'), count: allModels.value.length },
  ...toFilterItems(allModels.value, (m) => m.platform, platformLabel),
])

const groupFilters = computed(() => {
  const groups = new Map<string, FilterItem>()
  for (const channel of channels.value) {
    for (const section of channel.platforms) {
      for (const group of section.groups) {
        const key = String(group.id)
        if (!groups.has(key)) {
          groups.set(key, { value: key, label: groupLabel(group), count: 0 })
        }
      }
    }
  }
  for (const model of allModels.value) {
    for (const id of model.groupIds) {
      const item = groups.get(id)
      if (item) item.count += 1
    }
  }
  return [{ value: ALL, label: t('modelPricing.allGroups'), count: allModels.value.length }, ...groups.values()]
})

const billingFilters = computed(() => [
  { value: ALL, label: t('modelPricing.allBilling'), count: allModels.value.length },
  ...toFilterItems(allModels.value, (m) => m.billingMode, billingModeFilterLabel),
])

const tagFilters = computed(() => [
  { value: ALL, label: t('modelPricing.allTags'), count: allModels.value.length },
])

const endpointFilters = computed(() => [
  { value: ALL, label: t('modelPricing.allEndpoints'), count: allModels.value.length },
  ...toFilterItems(allModels.value, (m) => m.endpoint, (v) => v),
])

watch([filteredModels, pageSize], () => {
  page.value = 1
})

function toFilterItems(
  models: MarketModel[],
  valueOf: (model: MarketModel) => string,
  labelOf: (value: string) => string,
): FilterItem[] {
  const counts = new Map<string, number>()
  for (const model of models) {
    const value = valueOf(model) || 'unknown'
    counts.set(value, (counts.get(value) || 0) + 1)
  }
  return [...counts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, count]) => ({ value, label: labelOf(value), count }))
}

function groupLabel(group: UserAvailableGroup): string {
  const rate = Number.isFinite(group.rate_multiplier) ? `${group.rate_multiplier}x` : ''
  return rate ? `${group.name} ${rate}` : group.name
}

function billingModeFilterLabel(mode: string): string {
  switch (mode) {
    case BILLING_MODE_TOKEN:
      return t('modelPricing.billing.token')
    case BILLING_MODE_PER_REQUEST:
      return t('modelPricing.billing.request')
    case BILLING_MODE_IMAGE:
      return t('modelPricing.billing.image')
    default:
      return t('modelPricing.notConfigured')
  }
}

function billingModeLabel(pricing: UserSupportedModelPricing | null): string {
  return billingModeFilterLabel(pricing?.billing_mode || '')
}

function platformLabel(platform: string): string {
  switch (platform) {
    case 'anthropic':
      return 'Anthropic'
    case 'openai':
      return 'OpenAI'
    case 'antigravity':
      return 'Antigravity'
    case 'gemini':
      return 'Gemini'
    default:
      return platform || 'API'
  }
}

function formatToken(value: number | null | undefined): string {
  return value == null ? '-' : `${formatScaled(value, 1_000_000)} / 1M Tokens`
}

function formatRequest(value: number | null | undefined): string {
  return value == null ? '-' : `${formatScaled(value, 1)} / Request`
}

function toMarketModel(
  model: UserSupportedModel,
  platform: string,
  channelName: string,
  groups: UserAvailableGroup[],
): MarketModel {
  const pricing = model.pricing
  const billingMode = pricing?.billing_mode || ''
  const endpoint = billingMode === BILLING_MODE_IMAGE ? 'image-generation' : platform
  const row: MarketModel = {
    key: `${platform}::${model.name}`,
    name: model.name,
    platform,
    billingMode,
    billingModeLabel: billingModeLabel(pricing),
    endpoint,
    inputDisplay: billingMode === BILLING_MODE_TOKEN ? formatToken(pricing?.input_price) : '-',
    outputDisplay: billingMode === BILLING_MODE_TOKEN ? formatToken(pricing?.output_price) : '-',
    cacheReadDisplay: billingMode === BILLING_MODE_TOKEN ? formatToken(pricing?.cache_read_price) : '-',
    cacheWriteDisplay: billingMode === BILLING_MODE_TOKEN ? formatToken(pricing?.cache_write_price) : '-',
    requestDisplay: requestDisplay(pricing),
    channelNames: [channelName],
    groupIds: groups.map((g) => String(g.id)),
    groupLabels: groups.map(groupLabel),
    tags: [],
    searchable: '',
  }
  row.searchable = buildSearchable(row)
  return row
}

function requestDisplay(pricing: UserSupportedModelPricing | null): string {
  if (!pricing) return '-'
  if (pricing.billing_mode === BILLING_MODE_IMAGE) {
    return formatRequest(pricing.image_output_price ?? pricing.per_request_price)
  }
  if (pricing.billing_mode === BILLING_MODE_PER_REQUEST) {
    return formatRequest(pricing.per_request_price)
  }
  return pricing.image_output_price != null ? formatToken(pricing.image_output_price) : '-'
}

function buildSearchable(model: MarketModel): string {
  return [
    model.name,
    model.platform,
    model.billingModeLabel,
    model.endpoint,
    ...model.channelNames,
    ...model.groupLabels,
  ].join(' ').toLowerCase()
}

function resetFilters() {
  selectedProvider.value = ALL
  selectedGroup.value = ALL
  selectedBilling.value = ALL
  selectedTag.value = ALL
  selectedEndpoint.value = ALL
  searchQuery.value = ''
}

async function copyText(text: string) {
  try {
    await navigator.clipboard?.writeText(text)
  } catch {
    // Clipboard permissions are browser-dependent; failing silently keeps copy buttons non-disruptive.
  }
}

function copyModelNames() {
  copyText(filteredModels.value.map((model) => model.name).join('\n'))
}

async function loadPricing() {
  loading.value = true
  loadError.value = ''
  try {
    channels.value = await userChannelsAPI.getPublicPricing()
  } catch (err: unknown) {
    loadError.value = extractApiErrorMessage(err, t('modelPricing.loadFailed'))
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  authStore.checkAuth()
  await loadPricing()
})
</script>

<style scoped>
.model-market-shell {
  min-height: 100vh;
  background: #0f1013;
  color: #f4f7fb;
}

.model-market-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 1rem;
  min-height: 4.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  padding: 0 1.25rem;
}

.market-brand,
.market-nav,
.market-header-actions,
.market-account,
.market-search,
.toolbar-button,
.market-switch,
.view-toggle,
.provider-title-row,
.model-card-head,
.model-card-footer,
.market-pagination {
  display: flex;
  align-items: center;
}

.market-brand {
  min-width: 0;
  gap: 0.65rem;
  color: #f8fafc;
  font-size: 0.95rem;
  font-weight: 750;
}

.market-brand img {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.5rem;
  object-fit: contain;
}

.market-nav {
  justify-content: center;
  gap: 1.4rem;
  font-size: 0.875rem;
  color: #b8bec9;
}

.market-nav a {
  transition: color 0.2s ease;
}

.market-nav a:hover,
.market-nav-active {
  color: #ffffff;
}

.market-header-actions {
  justify-content: flex-end;
  gap: 0.65rem;
}

.market-account {
  min-height: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.055);
  padding: 0 0.8rem;
  color: #d7dce5;
  font-size: 0.8rem;
}

.model-market-main {
  display: grid;
  grid-template-columns: 22rem minmax(0, 1fr);
  min-height: calc(100vh - 4.25rem);
}

.market-filter-panel {
  position: sticky;
  top: 0;
  align-self: start;
  height: calc(100vh - 4.25rem);
  overflow-y: auto;
  border-right: 1px solid rgba(255, 255, 255, 0.07);
  padding: 1.25rem 0.75rem 2rem;
}

.market-filter-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding-bottom: 1rem;
}

.market-filter-head h1 {
  font-size: 0.95rem;
  font-weight: 750;
}

.market-filter-head button,
.market-state button {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.055);
  color: #cbd5e1;
  padding: 0.35rem 0.75rem;
  font-size: 0.78rem;
}

.filter-group {
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  padding: 1.05rem 0 1rem;
}

.filter-group h2 {
  margin-bottom: 0.7rem;
  color: #e7ebf2;
  font-size: 0.86rem;
  font-weight: 700;
}

.filter-chip-list {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.45rem;
}

.filter-chip {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 0.35rem;
  min-height: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.075);
  border-radius: 0.55rem;
  background: rgba(255, 255, 255, 0.035);
  color: #aeb6c4;
  padding: 0 0.65rem;
  font-size: 0.78rem;
  transition: all 0.2s ease;
}

.filter-chip span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-chip em {
  flex: 0 0 auto;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  padding: 0.06rem 0.35rem;
  color: #9aa4b5;
  font-style: normal;
  font-size: 0.68rem;
}

.filter-chip:hover,
.filter-chip-active {
  border-color: rgba(217, 119, 50, 0.36);
  background: rgba(217, 119, 50, 0.16);
  color: #f3c8aa;
}

.market-content {
  min-width: 0;
  padding: 1.25rem;
}

.provider-hero {
  display: flex;
  min-height: 6rem;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.7rem;
  background:
    linear-gradient(135deg, rgba(25, 130, 88, 0.82), rgba(47, 118, 84, 0.72)),
    radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.16), transparent 36%);
  padding: 1.2rem 1.4rem;
}

.provider-hero-all {
  background:
    linear-gradient(135deg, rgba(56, 89, 118, 0.78), rgba(37, 47, 63, 0.85)),
    radial-gradient(circle at 80% 20%, rgba(217, 119, 50, 0.18), transparent 36%);
}

.provider-hero-anthropic {
  background: linear-gradient(135deg, rgba(143, 85, 46, 0.86), rgba(82, 61, 47, 0.82));
}

.provider-hero-openai {
  background: linear-gradient(135deg, rgba(25, 130, 88, 0.86), rgba(46, 92, 72, 0.82));
}

.provider-hero-gemini {
  background: linear-gradient(135deg, rgba(59, 114, 180, 0.86), rgba(43, 68, 121, 0.82));
}

.provider-title-row {
  flex-wrap: wrap;
  gap: 0.75rem;
}

.provider-title-row h2 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 800;
}

.provider-title-row span,
.model-card-footer span {
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.11);
  padding: 0.18rem 0.5rem;
  color: #e7ebf2;
  font-size: 0.72rem;
  font-weight: 700;
}

.provider-hero p {
  margin-top: 0.35rem;
  color: rgba(255, 255, 255, 0.74);
  font-size: 0.86rem;
}

.provider-hero-icon {
  flex: 0 0 auto;
  opacity: 0.76;
}

.market-toolbar {
  display: grid;
  grid-template-columns: minmax(14rem, 1fr) auto auto auto;
  gap: 0.75rem;
  margin-top: 0.85rem;
}

.market-search {
  min-width: 0;
  min-height: 2.35rem;
  gap: 0.5rem;
  border-radius: 0.55rem;
  background: rgba(255, 255, 255, 0.07);
  padding: 0 0.75rem;
  color: #8f98a8;
}

.market-search input {
  min-width: 0;
  flex: 1;
  border: 0;
  background: transparent;
  color: #f8fafc;
  font-size: 0.86rem;
  outline: none;
}

.toolbar-button,
.market-switch,
.view-toggle {
  min-height: 2.35rem;
  border-radius: 0.55rem;
  background: rgba(255, 255, 255, 0.055);
  color: #cbd5e1;
  font-size: 0.82rem;
}

.toolbar-button {
  gap: 0.45rem;
  padding: 0 0.75rem;
}

.market-switch {
  gap: 0.55rem;
  padding: 0 0.75rem;
}

.market-switch input {
  accent-color: #d97732;
}

.view-toggle {
  overflow: hidden;
}

.view-toggle button {
  height: 100%;
  padding: 0 0.75rem;
  color: #aeb6c4;
}

.view-toggle button.active {
  background: rgba(255, 255, 255, 0.11);
  color: #ffffff;
}

.model-card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
  margin-top: 1rem;
}

.model-price-card {
  display: flex;
  min-height: 10rem;
  flex-direction: column;
  justify-content: space-between;
  border: 1px solid rgba(255, 255, 255, 0.075);
  border-radius: 0.8rem;
  background: rgba(255, 255, 255, 0.026);
  padding: 1rem;
  transition: border-color 0.2s ease, background 0.2s ease;
}

.model-price-card:hover {
  border-color: rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.04);
}

.model-card-head {
  align-items: flex-start;
  gap: 0.75rem;
}

.model-card-head h3 {
  overflow-wrap: anywhere;
  color: #eef2f7;
  font-size: 0.95rem;
  font-weight: 800;
}

.model-card-head p {
  margin-top: 0.18rem;
  overflow: hidden;
  color: #7f8898;
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-card-head button {
  margin-left: auto;
  flex: 0 0 auto;
  color: #8d96a6;
}

.model-price-lines {
  display: grid;
  gap: 0.18rem;
  margin-top: 0.75rem;
}

.price-line {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  color: #98a2b3;
  font-size: 0.72rem;
}

.price-line strong {
  color: #d7dde7;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 650;
  text-align: right;
}

.model-card-footer {
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.75rem;
}

.model-card-footer span {
  background: rgba(107, 77, 139, 0.32);
  color: #cbb6ee;
}

.market-table-wrap {
  margin-top: 1rem;
  overflow-x: auto;
  border: 1px solid rgba(255, 255, 255, 0.075);
  border-radius: 0.8rem;
}

.market-table {
  width: 100%;
  min-width: 980px;
  border-collapse: collapse;
  font-size: 0.82rem;
}

.market-table th,
.market-table td {
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  padding: 0.8rem;
  text-align: left;
}

.market-table th {
  color: #9da7b7;
  font-weight: 750;
}

.market-table td {
  color: #d5dbe5;
}

.market-state {
  display: flex;
  min-height: 22rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  color: #9aa4b5;
}

.market-pagination {
  justify-content: center;
  gap: 0.65rem;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
  margin-top: 1rem;
  padding-top: 1rem;
}

.market-pagination button,
.market-pagination select,
.market-pagination span {
  min-height: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 0.55rem;
  background: rgba(255, 255, 255, 0.055);
  color: #cbd5e1;
  padding: 0 0.65rem;
}

.market-pagination button:disabled {
  opacity: 0.4;
}

@media (max-width: 1100px) {
  .model-market-main {
    grid-template-columns: 1fr;
  }

  .market-filter-panel {
    position: static;
    height: auto;
    border-right: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  }

  .filter-chip-list {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .model-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .model-market-header {
    grid-template-columns: 1fr;
    align-items: stretch;
    padding: 0.9rem;
  }

  .market-nav,
  .market-header-actions {
    justify-content: flex-start;
    overflow-x: auto;
  }

  .market-toolbar {
    grid-template-columns: 1fr;
  }

  .filter-chip-list,
  .model-card-grid {
    grid-template-columns: 1fr;
  }

  .market-content {
    padding: 0.9rem;
  }
}
</style>
