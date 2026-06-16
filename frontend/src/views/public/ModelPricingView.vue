<template>
  <main class="pricing-shell">
    <section class="pricing-hero">
      <nav class="pricing-nav" aria-label="价格页导航">
        <router-link to="/home" class="pricing-brand">
          <span class="pricing-brand-mark">
            <img :src="siteLogo" :alt="siteName" />
          </span>
          <span>{{ siteName }}</span>
        </router-link>
        <div class="pricing-nav-actions">
          <router-link to="/login" class="pricing-nav-link">登录</router-link>
          <router-link to="/docs" class="pricing-nav-link">文档</router-link>
        </div>
      </nav>

      <div class="pricing-hero-grid">
        <div class="pricing-hero-copy">
          <p class="pricing-kicker">模型目录</p>
          <h1>模型广场</h1>
          <p class="pricing-summary">
            当前公开展示 {{ allItems.length }} 个{{ catalogModelLabel }}。可按真实分组、供应商、价格类型和能力快速筛选，实际扣费仍以后台渠道与套餐规则为准。
          </p>
        </div>

        <aside class="pricing-meta" aria-label="价格表状态">
          <span>价格单位</span>
          <strong>{{ unitLabel }}</strong>
          <small v-if="catalog?.last_updated">更新：{{ formattedLastUpdated }}</small>
          <small v-else>更新：等待加载</small>
        </aside>
      </div>

      <label class="pricing-search">
        <Icon name="search" size="sm" />
        <input
          v-model="search"
          data-test="pricing-search"
          type="search"
          autocomplete="off"
          spellcheck="false"
          placeholder="搜索模型名称、供应商或模式..."
        />
        <kbd>/</kbd>
      </label>
    </section>

    <section class="pricing-workspace">
      <aside class="pricing-sidebar" aria-label="模型筛选">
        <div class="filter-head">
          <div>
            <h2>筛选</h2>
            <p>按真实分组、供应商、计费字段和能力细化模型。</p>
          </div>
          <button
            type="button"
            class="filter-reset"
            :disabled="!hasActiveFilters"
            data-test="pricing-reset"
            @click="resetFilters"
          >
            <Icon name="refresh" size="xs" />
            重置
          </button>
        </div>

        <div class="filter-section">
          <h3>分组</h3>
          <div class="filter-options">
            <button
              v-for="group in groupFilters"
              :key="group.id"
              type="button"
              class="filter-chip"
              :class="{ active: activeGroup === group.id }"
              :data-test="`group-filter-${group.id}`"
              @click="activeGroup = group.id"
            >
              <span class="filter-icon" aria-hidden="true">
                <Icon :name="group.id === 'all' ? 'grid' : 'cube'" size="xs" />
              </span>
              <span>{{ group.label }}</span>
              <strong>{{ group.count }}</strong>
            </button>
          </div>
        </div>

        <div class="filter-section">
          <h3>供应商</h3>
          <div class="filter-options">
            <button
              v-for="provider in providerTabs"
              :key="provider.id"
              type="button"
              class="filter-chip"
              :class="{ active: activeProvider === provider.id }"
              :data-test="`provider-tab-${provider.id}`"
              @click="activeProvider = provider.id"
            >
              <span class="filter-icon provider-filter-icon" aria-hidden="true">
                <Icon v-if="provider.id === 'all'" name="globe" size="xs" />
                <ModelIcon v-else :model="providerIconModel(provider.id)" size="14px" />
              </span>
              <span>{{ provider.label }}</span>
              <strong>{{ provider.count }}</strong>
            </button>
          </div>
        </div>

        <div class="filter-section">
          <h3>定价类型</h3>
          <div class="filter-options">
            <button
              v-for="filter in pricingFilters"
              :key="filter.id"
              type="button"
              class="filter-chip"
              :class="{ active: activePricingFilter === filter.id }"
              :data-test="`pricing-filter-${filter.id}`"
              @click="activePricingFilter = filter.id"
            >
              <span>{{ filter.label }}</span>
              <strong>{{ filter.count }}</strong>
            </button>
          </div>
        </div>

        <div class="filter-section">
          <h3>能力标签</h3>
          <div class="filter-options">
            <button
              v-for="filter in capabilityFilters"
              :key="filter.id"
              type="button"
              class="filter-chip"
              :class="{ active: activeCapabilityFilter === filter.id }"
              :data-test="`capability-filter-${filter.id}`"
              @click="activeCapabilityFilter = filter.id"
            >
              <span>{{ filter.label }}</span>
              <strong>{{ filter.count }}</strong>
            </button>
          </div>
        </div>
      </aside>

      <section class="pricing-results" aria-label="模型价格列表">
        <div class="pricing-toolbar">
          <div class="pricing-count">
            <strong>{{ filteredItems.length }}</strong>
            <span>个模型</span>
          </div>

          <div class="toolbar-groups">
            <div class="segmented view-switch" role="group" aria-label="视图模式">
              <button
                type="button"
                title="卡片视图"
                :class="{ active: viewMode === 'cards' }"
                data-test="view-cards"
                @click="viewMode = 'cards'"
              >
                <Icon name="grid" size="sm" />
              </button>
              <button
                type="button"
                title="表格视图"
                :class="{ active: viewMode === 'table' }"
                data-test="view-table"
                @click="viewMode = 'table'"
              >
                <Icon name="menu" size="sm" />
              </button>
            </div>
          </div>
        </div>

        <div v-if="isLoading" class="pricing-state">
          <Icon name="database" size="lg" />
          <strong>正在加载价格表</strong>
          <span>从公开接口读取默认模型定价。</span>
        </div>

        <div v-else-if="error" class="pricing-state error">
          <Icon name="exclamationTriangle" size="lg" />
          <strong>价格表加载失败</strong>
          <span>{{ error }}</span>
          <button
            type="button"
            data-test="pricing-retry"
            class="pricing-state-action"
            @click="loadCatalog"
          >
            <Icon name="refresh" size="sm" />
            重试
          </button>
        </div>

        <div v-else-if="filteredItems.length === 0" class="pricing-state">
          <Icon name="search" size="lg" />
          <strong>没有匹配的模型</strong>
          <span>调整搜索词或切换筛选条件后再查看。</span>
        </div>

        <div v-else-if="viewMode === 'cards'" class="pricing-card-grid">
          <article
            v-for="item in filteredItems"
            :key="itemKey(item)"
            class="model-card"
          >
            <header class="model-card-head">
              <span class="model-icon-badge" aria-hidden="true">
                <ModelIcon :model="item.model" size="22px" />
              </span>
              <div class="model-title">
                <h3 :title="item.model">{{ item.model }}</h3>
                <p>
                  <span class="inline-provider">
                    <ModelIcon :model="providerIconModel(item.provider)" size="13px" />
                    {{ providerLabel(item.provider) }}
                  </span>
                </p>
              </div>
              <button
                type="button"
                class="icon-button"
                :title="copiedKey === item.model ? '已复制' : '复制模型名'"
                :data-test="`copy-model-${item.model}`"
                @click="copyModelName(item.model)"
              >
                <Icon :name="copiedKey === item.model ? 'check' : 'copy'" size="sm" />
              </button>
            </header>

            <div class="model-price-row">
              <div class="model-price">
                <span>输入</span>
                <strong>{{ formatTokenPrice(item.input_price_per_million) }}</strong>
              </div>
              <div class="model-price">
                <span>输出</span>
                <strong>{{ formatTokenPrice(item.output_price_per_million) }}</strong>
              </div>
            </div>

            <div class="model-price-row secondary">
              <div class="model-price">
                <span>缓存写入</span>
                <strong>{{ formatTokenPrice(item.cache_write_price_per_million) }}</strong>
              </div>
              <div class="model-price">
                <span>缓存读取</span>
                <strong>{{ formatTokenPrice(item.cache_read_price_per_million) }}</strong>
              </div>
            </div>

            <footer class="model-card-foot">
              <div class="model-groups" :aria-label="`${item.model} 可用分组`">
                <span
                  v-for="group in itemGroups(item)"
                  :key="group.id"
                  class="model-group-chip"
                  :title="`${group.name} x${formatMultiplier(group.rate_multiplier)}`"
                >
                  <Icon name="cube" size="xs" />
                  <span>{{ group.name }}</span>
                  <strong>x{{ formatMultiplier(group.rate_multiplier) }}</strong>
                </span>
              </div>
              <div class="model-tags">
                <span class="model-tag">{{ pricingTypeLabel(item) }}</span>
                <span v-if="item.image_output_price !== null" class="model-tag">
                  图片输出 {{ formatTokenPrice(item.image_output_price) }}
                </span>
                <span v-if="item.per_request_price !== null && item.per_request_price !== undefined" class="model-tag">
                  单次 {{ formatCurrency(item.per_request_price) }}
                </span>
                <span v-if="item.supports_prompt_caching" class="model-tag accent">Prompt Cache</span>
                <span v-if="item.supports_service_tier" class="model-tag accent">Service Tier</span>
                <span v-if="!hasCapability(item)" class="model-tag muted">基础模型</span>
              </div>
            </footer>
          </article>
        </div>

        <div v-else class="pricing-table-wrap">
          <table class="pricing-table">
            <thead>
              <tr>
                <th>Group</th>
                <th>Provider</th>
                <th>Model</th>
                <th>Mode</th>
                <th>Input</th>
                <th>Output</th>
                <th>Cache Write</th>
                <th>Cache Read</th>
                <th>Image</th>
                <th>Request</th>
                <th>Capabilities</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredItems" :key="itemKey(item)">
                <td>
                  <div class="pricing-group-list">
                    <span
                      v-for="group in itemGroups(item)"
                      :key="group.id"
                      class="pricing-group-chip"
                      :title="`${group.name} x${formatMultiplier(group.rate_multiplier)}`"
                    >
                      <Icon name="cube" size="xs" />
                      <span>{{ group.name }}</span>
                      <strong>x{{ formatMultiplier(group.rate_multiplier) }}</strong>
                    </span>
                  </div>
                </td>
                <td>
                  <span class="pricing-provider">
                    <ModelIcon :model="providerIconModel(item.provider)" size="14px" />
                    {{ providerLabel(item.provider) }}
                  </span>
                </td>
                <td class="pricing-model">
                  <div class="pricing-model-cell">
                    <ModelIcon :model="item.model" size="16px" />
                    <span class="pricing-model-name" :title="item.model">{{ item.model }}</span>
                  </div>
                </td>
                <td>
                  <code>{{ item.mode || '-' }}</code>
                </td>
                <td>{{ formatTokenPrice(item.input_price_per_million) }}</td>
                <td>{{ formatTokenPrice(item.output_price_per_million) }}</td>
                <td>{{ formatTokenPrice(item.cache_write_price_per_million) }}</td>
                <td>{{ formatTokenPrice(item.cache_read_price_per_million) }}</td>
                <td>{{ formatTokenPrice(item.image_output_price) }}</td>
                <td>{{ formatRequestPrice(item.per_request_price ?? null) }}</td>
                <td>
                  <div class="pricing-capabilities">
                    <span v-if="item.supports_prompt_caching">Prompt Cache</span>
                    <span v-if="item.supports_service_tier">Service Tier</span>
                    <span v-if="!hasCapability(item)" class="muted">-</span>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Icon from '@/components/icons/Icon.vue'
import ModelIcon from '@/components/common/ModelIcon.vue'
import {
  getPublicModelPricing,
  type PublicModelPricingCatalog,
  type PublicModelPricingGroup,
  type PublicModelPricingItem,
} from '@/api/publicModelPricing'
import { useAppStore } from '@/stores'

type ProviderTab = 'all' | string
type GroupFilter = 'all' | number
type PricingFilter = 'all' | 'token' | 'request' | 'cache' | 'image'
type CapabilityFilter = 'all' | 'prompt_cache' | 'service_tier' | 'basic'
type ViewMode = 'cards' | 'table'

interface CountedFilter<T extends string | number> {
  id: T
  label: string
  count: number
}

const catalog = ref<PublicModelPricingCatalog | null>(null)
const isLoading = ref(false)
const error = ref('')
const search = ref('')
const activeGroup = ref<GroupFilter>('all')
const activeProvider = ref<ProviderTab>('all')
const activePricingFilter = ref<PricingFilter>('all')
const activeCapabilityFilter = ref<CapabilityFilter>('all')
const viewMode = ref<ViewMode>('cards')
const copiedKey = ref('')
let copyTimer: number | undefined

const appStore = useAppStore()

const providerLabels: Record<string, string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
  antigravity: 'Antigravity',
  xai: 'xAI',
}

const providerIconModels: Record<string, string> = {
  openai: 'gpt',
  anthropic: 'claude',
  gemini: 'gemini',
  antigravity: 'gemini',
  xai: 'grok',
}

const allItems = computed(() => catalog.value?.items ?? [])
const allGroups = computed(() => catalog.value?.groups ?? [])
const catalogModelLabel = computed(() => allGroups.value.length > 0 ? '分组模型' : '参考模型')
const siteName = computed(() => appStore.cachedPublicSettings?.site_name || appStore.siteName || 'Hahacode')
const siteLogo = computed(() => appStore.cachedPublicSettings?.site_logo || appStore.siteLogo || '/logo.png')
const unitLabel = 'USD / 1M tokens'
const hasActiveFilters = computed(() => {
  return search.value.trim() !== ''
    || activeGroup.value !== 'all'
    || activeProvider.value !== 'all'
    || activePricingFilter.value !== 'all'
    || activeCapabilityFilter.value !== 'all'
})

const groupByID = computed(() => {
  return allGroups.value.reduce<Record<number, PublicModelPricingGroup>>((acc, group) => {
    acc[group.id] = group
    return acc
  }, {})
})

const groupFilters = computed<CountedFilter<GroupFilter>[]>(() => {
  const counts = new Map<number, number>()
  for (const item of allItems.value) {
    for (const groupID of item.group_ids ?? []) {
      counts.set(groupID, (counts.get(groupID) ?? 0) + 1)
    }
  }
  return [
    { id: 'all', label: '所有分组', count: allItems.value.length },
    ...allGroups.value.map(group => ({
      id: group.id,
      label: `${group.name} x${formatMultiplier(group.rate_multiplier)}`,
      count: counts.get(group.id) ?? 0,
    })),
  ]
})

const providerTabs = computed<CountedFilter<ProviderTab>[]>(() => {
  const counts = new Map<string, number>()
  for (const item of allItems.value) {
    counts.set(item.provider, (counts.get(item.provider) ?? 0) + 1)
  }
  const providers = [...counts.keys()].sort((a, b) => providerLabel(a).localeCompare(providerLabel(b)))

  return [
    { id: 'all', label: '所有供应商', count: allItems.value.length },
    ...providers.map(provider => ({
      id: provider,
      label: providerLabel(provider),
      count: counts.get(provider) ?? 0,
    })),
  ]
})

const pricingFilters = computed<CountedFilter<PricingFilter>[]>(() => [
  { id: 'all', label: '所有模型', count: allItems.value.length },
  { id: 'token', label: 'Token 计费', count: allItems.value.filter(hasTokenPricing).length },
  { id: 'request', label: '按请求', count: allItems.value.filter(hasRequestPricing).length },
  { id: 'cache', label: '缓存价格', count: allItems.value.filter(hasCachePricing).length },
  { id: 'image', label: '图片价格', count: allItems.value.filter(hasImagePricing).length },
])

const capabilityFilters = computed<CountedFilter<CapabilityFilter>[]>(() => [
  { id: 'all', label: '所有标签', count: allItems.value.length },
  { id: 'prompt_cache', label: 'Prompt Cache', count: allItems.value.filter(item => item.supports_prompt_caching).length },
  { id: 'service_tier', label: 'Service Tier', count: allItems.value.filter(item => item.supports_service_tier).length },
  { id: 'basic', label: '基础模型', count: allItems.value.filter(item => !hasCapability(item)).length },
])

const filteredItems = computed(() => {
  const query = search.value.trim().toLowerCase()
  return allItems.value
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      if (activeGroup.value !== 'all' && !(item.group_ids ?? []).includes(activeGroup.value)) {
        return false
      }
      if (activeProvider.value !== 'all' && item.provider !== activeProvider.value) {
        return false
      }
      if (!matchesPricingFilter(item, activePricingFilter.value)) {
        return false
      }
      if (!matchesCapabilityFilter(item, activeCapabilityFilter.value)) {
        return false
      }
      if (!query) {
        return true
      }
      return [
        item.provider,
        providerLabel(item.provider),
        item.model,
        item.mode,
        groupLabel(item),
        itemGroups(item).map(group => group.name).join(' '),
        pricingTypeLabel(item),
      ]
        .some((value) => value.toLowerCase().includes(query))
    })
    .sort(compareModelPricingItems)
    .map(({ item }) => item)
})

const formattedLastUpdated = computed(() => {
  if (!catalog.value?.last_updated) {
    return '-'
  }
  const date = new Date(catalog.value.last_updated)
  if (Number.isNaN(date.getTime())) {
    return catalog.value.last_updated
  }
  return date.toISOString().slice(0, 10)
})

async function loadCatalog() {
  isLoading.value = true
  error.value = ''
  try {
    catalog.value = await getPublicModelPricing()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '无法读取公开模型价格。'
  } finally {
    isLoading.value = false
  }
}

function resetFilters() {
  search.value = ''
  activeGroup.value = 'all'
  activeProvider.value = 'all'
  activePricingFilter.value = 'all'
  activeCapabilityFilter.value = 'all'
}

function providerLabel(provider: PublicModelPricingItem['provider']): string {
  return providerLabels[provider] || provider
}

function providerIconModel(provider: ProviderTab): string {
  if (provider === 'all') {
    return ''
  }
  return providerIconModels[provider] || provider
}

function hasTokenPricing(item: PublicModelPricingItem): boolean {
  return item.input_price_per_million !== null || item.output_price_per_million !== null
}

function hasCachePricing(item: PublicModelPricingItem): boolean {
  return item.cache_write_price_per_million !== null || item.cache_read_price_per_million !== null
}

function hasImagePricing(item: PublicModelPricingItem): boolean {
  return item.image_output_price !== null
}

function hasRequestPricing(item: PublicModelPricingItem): boolean {
  return item.per_request_price !== null && item.per_request_price !== undefined
}

function hasCapability(item: PublicModelPricingItem): boolean {
  return item.supports_prompt_caching || item.supports_service_tier
}

function matchesPricingFilter(item: PublicModelPricingItem, filter: PricingFilter): boolean {
  if (filter === 'all') {
    return true
  }
  if (filter === 'token') {
    return hasTokenPricing(item)
  }
  if (filter === 'request') {
    return hasRequestPricing(item)
  }
  if (filter === 'cache') {
    return hasCachePricing(item)
  }
  return hasImagePricing(item)
}

function matchesCapabilityFilter(item: PublicModelPricingItem, filter: CapabilityFilter): boolean {
  if (filter === 'all') {
    return true
  }
  if (filter === 'prompt_cache') {
    return item.supports_prompt_caching
  }
  if (filter === 'service_tier') {
    return item.supports_service_tier
  }
  return !hasCapability(item)
}

function compareModelPricingItems(
  a: { item: PublicModelPricingItem, index: number },
  b: { item: PublicModelPricingItem, index: number },
): number {
  const aDate = modelSnapshotDateValue(a.item.model)
  const bDate = modelSnapshotDateValue(b.item.model)

  if (aDate !== null || bDate !== null) {
    if (aDate !== bDate) {
      return (bDate ?? Number.NEGATIVE_INFINITY) - (aDate ?? Number.NEGATIVE_INFINITY)
    }
  }

  return a.index - b.index
}

function modelSnapshotDateValue(model: string): number | null {
  const matches = [...model.matchAll(/(?:^|[-_])((20\d{2})[-_]?([01]\d)[-_]?([0-3]\d))(?:$|[-_])/g)]
  const lastMatch = matches.at(-1)
  if (!lastMatch) {
    return null
  }

  const year = Number(lastMatch[2])
  const month = Number(lastMatch[3])
  const day = Number(lastMatch[4])
  const date = new Date(Date.UTC(year, month - 1, day))
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }
  return date.getTime()
}

function pricingTypeLabel(item: PublicModelPricingItem): string {
  if (item.billing_mode === 'per_request' || item.per_request_price !== null && item.per_request_price !== undefined) {
    return '按请求'
  }
  if (item.billing_mode === 'image') {
    return '图片计费'
  }
  if (hasTokenPricing(item)) {
    return '按量计费'
  }
  if (hasImagePricing(item)) {
    return '图片计费'
  }
  return '参考定价'
}

function formatTokenPrice(value: number | null): string {
  if (value === null || value === undefined) {
    return '-'
  }
  return `${formatCurrency(value)}/1M`
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: value >= 1 ? 2 : 4,
    maximumFractionDigits: 6,
  }).format(value)
}

function formatRequestPrice(value: number | null): string {
  if (value === null || value === undefined) {
    return '-'
  }
  return `${formatCurrency(value)} / 请求`
}

function itemKey(item: PublicModelPricingItem): string {
  return `${item.group_ids?.join(',') || 'default'}:${item.provider}:${item.model}`
}

function itemGroups(item: PublicModelPricingItem): PublicModelPricingGroup[] {
  const groups = (item.group_ids ?? [])
    .map(groupID => groupByID.value[groupID])
    .filter((group): group is PublicModelPricingGroup => Boolean(group))

  if (groups.length > 0) {
    return groups
  }

  return [{
    id: 0,
    name: '默认分组',
    platform: item.provider,
    rate_multiplier: 1,
    subscription_type: 'standard',
    is_exclusive: false,
  }]
}

function groupLabel(item: PublicModelPricingItem): string {
  return itemGroups(item).map(group => group.name).join(' ')
}

function formatMultiplier(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, '').replace(/\.$/, '')
}

async function copyModelName(model: string) {
  copiedKey.value = model
  window.clearTimeout(copyTimer)
  copyTimer = window.setTimeout(() => {
    copiedKey.value = ''
  }, 1400)

  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(model)
    } catch {
      // The visual confirmation is still useful when clipboard access is blocked.
    }
  }
}

onMounted(() => {
  if (!appStore.publicSettingsLoaded) {
    appStore.fetchPublicSettings()
  }
  void loadCatalog()
})
</script>

<style scoped>
.pricing-shell {
  min-height: 100vh;
  background:
    radial-gradient(circle at 18% 0%, color-mix(in srgb, var(--theme-primary) 10%, transparent), transparent 26rem),
    var(--theme-bg);
  color: var(--theme-text);
}

.pricing-hero,
.pricing-workspace {
  max-width: 96rem;
  margin: 0 auto;
  padding-right: clamp(1rem, 3vw, 1.75rem);
  padding-left: clamp(1rem, 3vw, 1.75rem);
}

.pricing-hero {
  padding-top: 1rem;
  padding-bottom: 1.1rem;
}

.pricing-nav,
.pricing-hero-grid,
.pricing-toolbar,
.pricing-nav-actions,
.toolbar-groups {
  display: flex;
  align-items: center;
}

.pricing-nav {
  justify-content: space-between;
  gap: 1rem;
}

.pricing-brand {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.65rem;
  color: var(--theme-text);
  font-weight: 850;
}

.pricing-brand-mark {
  display: inline-flex;
  height: 2.2rem;
  width: 2.2rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
}

.pricing-brand-mark img {
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
}

.pricing-nav-actions {
  gap: 0.45rem;
}

.pricing-nav-link {
  border: 1px solid var(--theme-border);
  border-radius: 0.45rem;
  background: color-mix(in srgb, var(--theme-surface) 84%, transparent);
  padding: 0.45rem 0.7rem;
  color: var(--theme-text-muted);
  font-size: 0.82rem;
  font-weight: 850;
}

.pricing-nav-link:hover {
  border-color: color-mix(in srgb, var(--theme-primary) 42%, var(--theme-border));
  color: var(--theme-primary);
}

.pricing-hero-grid {
  align-items: end;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 2.25rem;
}

.pricing-hero-copy {
  min-width: 0;
}

.pricing-kicker {
  color: var(--theme-primary);
  font-size: 0.82rem;
  font-weight: 900;
}

.pricing-hero h1 {
  margin-top: 0.35rem;
  color: var(--theme-text);
  font-size: clamp(2rem, 5vw, 4.35rem);
  font-weight: 950;
  letter-spacing: 0;
  line-height: 1.04;
}

.pricing-summary {
  max-width: 42rem;
  margin-top: 0.75rem;
  color: var(--theme-text-muted);
  font-size: 0.96rem;
  line-height: 1.75;
}

.pricing-meta {
  width: min(100%, 20rem);
  border: 1px solid var(--theme-border);
  border-radius: 0.5rem;
  background: color-mix(in srgb, var(--theme-surface) 88%, transparent);
  padding: 0.9rem 1rem;
}

.pricing-meta span,
.pricing-meta small {
  display: block;
  color: var(--theme-text-muted);
  font-size: 0.78rem;
  font-weight: 750;
}

.pricing-meta strong {
  display: block;
  margin-top: 0.45rem;
  color: var(--theme-primary);
  font-size: 1.02rem;
  font-weight: 900;
}

.pricing-meta small {
  margin-top: 0.35rem;
}

.pricing-search {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.6rem;
  min-height: 3.1rem;
  margin-top: 1.35rem;
  border: 1px solid var(--theme-border);
  border-radius: 0.55rem;
  background: var(--theme-surface);
  padding: 0 0.9rem;
  color: var(--theme-text-muted);
  box-shadow: 0 18px 40px color-mix(in srgb, var(--theme-text) 6%, transparent);
}

.pricing-search input {
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--theme-text);
  font-size: 0.95rem;
  outline: none;
}

.pricing-search input::placeholder {
  color: var(--theme-text-muted);
}

.pricing-search kbd {
  min-width: 1.45rem;
  border: 1px solid var(--theme-border);
  border-radius: 0.35rem;
  background: var(--theme-surface-muted);
  color: var(--theme-text-muted);
  font-size: 0.78rem;
  font-weight: 850;
  text-align: center;
}

.pricing-workspace {
  display: grid;
  grid-template-columns: minmax(15rem, 20.5rem) minmax(0, 1fr);
  gap: 1rem;
  padding-top: 0.3rem;
  padding-bottom: 2.4rem;
}

.pricing-sidebar,
.pricing-state,
.model-card,
.pricing-table-wrap {
  border: 1px solid var(--theme-border);
  border-radius: 0.55rem;
  background: var(--theme-surface);
}

.pricing-sidebar {
  position: sticky;
  top: 1rem;
  align-self: start;
  padding: 0.95rem;
}

.filter-head {
  display: flex;
  align-items: start;
  justify-content: space-between;
  gap: 0.8rem;
}

.filter-head h2 {
  color: var(--theme-text);
  font-size: 1rem;
  font-weight: 900;
}

.filter-head p {
  margin-top: 0.2rem;
  color: var(--theme-text-muted);
  font-size: 0.78rem;
  line-height: 1.55;
}

.filter-reset,
.pricing-state-action,
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--theme-border);
  border-radius: 0.42rem;
  background: var(--theme-surface-muted);
  color: var(--theme-text);
  font-weight: 850;
}

.filter-reset {
  min-height: 2rem;
  gap: 0.35rem;
  padding: 0 0.55rem;
  color: var(--theme-text-muted);
  font-size: 0.76rem;
}

.filter-reset:disabled {
  cursor: default;
  opacity: 0.45;
}

.filter-section {
  margin-top: 1rem;
  border-top: 1px solid var(--theme-border);
  padding-top: 0.9rem;
}

.filter-section h3 {
  margin-bottom: 0.58rem;
  color: var(--theme-text);
  font-size: 0.84rem;
  font-weight: 900;
}

.filter-options {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.filter-chip {
  display: inline-flex;
  min-height: 2rem;
  max-width: 100%;
  align-items: center;
  gap: 0.4rem;
  border: 1px solid var(--theme-border);
  border-radius: 0.45rem;
  background: var(--theme-surface-muted);
  padding: 0 0.55rem;
  color: var(--theme-text-muted);
  font-size: 0.78rem;
  font-weight: 820;
}

.filter-chip span:not(.filter-icon) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.filter-chip strong {
  color: var(--theme-text);
  font-size: 0.72rem;
}

.filter-chip.active {
  border-color: color-mix(in srgb, var(--theme-primary) 54%, var(--theme-border));
  background: var(--theme-primary-soft);
  color: var(--theme-primary);
}

.filter-chip.active strong {
  color: var(--theme-primary);
}

.filter-icon {
  display: inline-flex;
  height: 1.25rem;
  width: 1.25rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--theme-border) 72%, transparent);
  border-radius: 0.35rem;
  background: color-mix(in srgb, var(--theme-bg) 42%, var(--theme-surface-muted));
  color: var(--theme-text);
}

.provider-filter-icon {
  background: #fff;
}

.pricing-results {
  min-width: 0;
}

.pricing-toolbar {
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.pricing-count {
  display: inline-flex;
  align-items: baseline;
  gap: 0.35rem;
  color: var(--theme-text-muted);
}

.pricing-count strong {
  color: var(--theme-text);
  font-size: 1.45rem;
  font-weight: 950;
}

.toolbar-groups {
  flex-wrap: wrap;
  justify-content: end;
  gap: 0.55rem;
}

.segmented {
  display: inline-flex;
  min-height: 2.25rem;
  border: 1px solid var(--theme-border);
  border-radius: 0.45rem;
  background: var(--theme-surface);
  padding: 0.18rem;
}

.segmented button {
  display: inline-flex;
  min-width: 2.6rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.32rem;
  padding: 0 0.55rem;
  color: var(--theme-text-muted);
  font-size: 0.78rem;
  font-weight: 900;
}

.segmented button.active {
  background: var(--theme-text);
  color: var(--theme-bg);
}

.view-switch button {
  min-width: 2.1rem;
}

.pricing-card-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.85rem;
}

.model-card {
  display: grid;
  min-height: 15rem;
  grid-template-rows: auto auto auto 1fr;
  gap: 1rem;
  padding: 1rem;
  transition: border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.model-card:hover {
  border-color: color-mix(in srgb, var(--theme-primary) 40%, var(--theme-border));
  box-shadow: 0 18px 48px color-mix(in srgb, var(--theme-text) 7%, transparent);
  transform: translateY(-1px);
}

.model-card-head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: start;
  gap: 0.75rem;
}

.model-icon-badge {
  display: inline-flex;
  height: 2.25rem;
  width: 2.25rem;
  align-items: center;
  justify-content: center;
  border: 1px solid color-mix(in srgb, var(--theme-border) 72%, transparent);
  border-radius: 0.55rem;
  background: #fff;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, #fff 72%, transparent);
}

.model-title {
  min-width: 0;
}

.model-title h3 {
  overflow: hidden;
  color: var(--theme-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.95rem;
  font-weight: 900;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-title p {
  margin-top: 0.18rem;
  overflow: hidden;
  color: var(--theme-text-muted);
  font-size: 0.78rem;
  font-weight: 750;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.inline-provider {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 0.3rem;
}

.icon-button {
  height: 2rem;
  width: 2rem;
  flex: 0 0 auto;
}

.icon-button:hover,
.pricing-state-action:hover,
.filter-reset:not(:disabled):hover {
  border-color: color-mix(in srgb, var(--theme-primary) 42%, var(--theme-border));
  color: var(--theme-primary);
}

.model-price-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem;
}

.model-price {
  min-width: 0;
  border: 1px solid color-mix(in srgb, var(--theme-border) 76%, transparent);
  border-radius: 0.45rem;
  background: var(--theme-surface-muted);
  padding: 0.62rem 0.68rem;
}

.model-price span {
  display: block;
  color: var(--theme-text-muted);
  font-size: 0.72rem;
  font-weight: 800;
}

.model-price strong {
  display: block;
  margin-top: 0.25rem;
  overflow: hidden;
  color: var(--theme-text);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.92rem;
  font-weight: 950;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-price-row.secondary .model-price strong {
  color: var(--theme-text-muted);
  font-size: 0.82rem;
}

.model-card-foot {
  align-self: end;
}

.model-groups {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-bottom: 0.55rem;
}

.model-tags,
.pricing-capabilities {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.model-tag,
.pricing-provider,
.model-group-chip,
.pricing-group-chip,
.pricing-capabilities span {
  display: inline-flex;
  min-height: 1.55rem;
  align-items: center;
  gap: 0.28rem;
  border-radius: 999px;
  padding: 0 0.55rem;
  font-size: 0.72rem;
  font-weight: 900;
}

.model-tag {
  border: 1px solid var(--theme-border);
  background: var(--theme-surface-muted);
  color: var(--theme-text-muted);
}

.model-group-chip,
.pricing-group-chip {
  max-width: 100%;
  border: 1px solid color-mix(in srgb, var(--theme-primary) 26%, var(--theme-border));
  background: color-mix(in srgb, var(--theme-primary) 7%, var(--theme-surface));
  color: var(--theme-text);
}

.model-group-chip span,
.pricing-group-chip span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.model-group-chip strong,
.pricing-group-chip strong {
  color: var(--theme-primary);
  font-size: 0.68rem;
}

.model-tag.accent,
.pricing-capabilities span {
  border-color: color-mix(in srgb, var(--theme-primary) 28%, var(--theme-border));
  background: color-mix(in srgb, var(--theme-primary) 8%, var(--theme-surface));
  color: var(--theme-primary);
}

.model-tag.muted,
.pricing-capabilities .muted {
  border-color: transparent;
  background: transparent;
  color: var(--theme-text-muted);
}

.pricing-table-wrap {
  overflow-x: auto;
}

.pricing-table {
  width: 100%;
  min-width: 72rem;
  border-collapse: collapse;
}

.pricing-table th,
.pricing-table td {
  border-bottom: 1px solid var(--theme-border);
  padding: 0.72rem 0.75rem;
  text-align: left;
  vertical-align: middle;
}

.pricing-table th {
  background: var(--theme-surface-muted);
  color: var(--theme-text-muted);
  font-size: 0.74rem;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;
}

.pricing-table td {
  color: var(--theme-text);
  font-size: 0.86rem;
  white-space: nowrap;
}

.pricing-table tbody tr:last-child td {
  border-bottom: 0;
}

.pricing-table tbody tr:hover {
  background: color-mix(in srgb, var(--theme-primary) 5%, transparent);
}

.pricing-model {
  max-width: 22rem;
}

.pricing-model-cell {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 0.5rem;
}

.pricing-model-name {
  min-width: 0;
  overflow: hidden;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 800;
  text-overflow: ellipsis;
}

.pricing-group-list {
  display: flex;
  max-width: 19rem;
  flex-wrap: wrap;
  gap: 0.35rem;
  white-space: normal;
}

.pricing-table code {
  border: 1px solid color-mix(in srgb, var(--theme-border) 72%, transparent);
  border-radius: 0.35rem;
  background: color-mix(in srgb, var(--theme-text) 7%, transparent);
  padding: 0.12rem 0.35rem;
  color: var(--theme-text-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 0.8rem;
}

.pricing-provider {
  gap: 0.35rem;
  border: 1px solid var(--theme-border);
  background: var(--theme-surface-muted);
  color: var(--theme-text);
}

.pricing-state {
  display: grid;
  justify-items: center;
  gap: 0.45rem;
  padding: 2.5rem 1rem;
  text-align: center;
}

.pricing-state :deep(svg) {
  color: var(--theme-primary);
}

.pricing-state strong {
  color: var(--theme-text);
  font-size: 1rem;
  font-weight: 900;
}

.pricing-state span {
  color: var(--theme-text-muted);
  font-size: 0.9rem;
}

.pricing-state-action {
  min-height: 2.35rem;
  gap: 0.45rem;
  margin-top: 0.35rem;
  padding: 0 0.85rem;
  font-size: 0.84rem;
}

.pricing-state.error {
  border-color: color-mix(in srgb, #ef4444 36%, var(--theme-border));
}

.pricing-state.error :deep(svg) {
  color: #ef4444;
}

@media (max-width: 1180px) {
  .pricing-card-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 920px) {
  .pricing-hero-grid,
  .pricing-toolbar {
    align-items: stretch;
    flex-direction: column;
  }

  .pricing-meta {
    width: 100%;
  }

  .pricing-workspace {
    grid-template-columns: 1fr;
  }

  .pricing-sidebar {
    position: static;
  }

  .toolbar-groups {
    justify-content: start;
  }
}

@media (max-width: 640px) {
  .pricing-hero {
    padding-top: 0.8rem;
  }

  .pricing-nav {
    align-items: flex-start;
  }

  .pricing-brand {
    font-size: 0.92rem;
  }

  .pricing-nav-actions {
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  .pricing-card-grid,
  .model-price-row {
    grid-template-columns: 1fr;
  }

  .model-card {
    min-height: 0;
  }

  .pricing-search kbd {
    display: none;
  }
}
</style>
