<template>
  <main class="pricing-shell">
    <section class="pricing-hero">
      <div class="pricing-hero-main">
        <router-link to="/home" class="pricing-brand">
          <span class="pricing-brand-mark">
            <img :src="siteLogo" :alt="siteName" />
          </span>
          <span>{{ siteName }}</span>
        </router-link>
        <div class="pricing-title-row">
          <div>
            <p class="pricing-kicker">Public Catalog</p>
            <h1>模型价格表</h1>
          </div>
          <button
            type="button"
            class="pricing-refresh"
            :disabled="isLoading"
            title="刷新价格表"
            @click="loadCatalog"
          >
            <Icon name="refresh" size="sm" />
            <span>刷新</span>
          </button>
        </div>
        <p class="pricing-summary">
          默认参考价格，仅展示 OpenAI、Anthropic、Gemini。单位为 USD / 1M tokens，实际计费仍以通道和套餐规则为准。
        </p>
      </div>

      <aside class="pricing-meta" aria-label="价格表状态">
        <span>单位</span>
        <strong>USD / 1M tokens</strong>
        <small v-if="catalog?.last_updated">更新：{{ formattedLastUpdated }}</small>
        <small v-else>更新：等待加载</small>
      </aside>
    </section>

    <section class="pricing-toolbar" aria-label="模型价格筛选">
      <label class="pricing-search">
        <Icon name="search" size="sm" />
        <input
          v-model="search"
          data-test="pricing-search"
          type="search"
          autocomplete="off"
          spellcheck="false"
          placeholder="搜索模型或模式"
        />
      </label>

      <div class="pricing-tabs" role="tablist" aria-label="供应商">
        <button
          v-for="provider in providerTabs"
          :key="provider.id"
          type="button"
          role="tab"
          :aria-selected="activeProvider === provider.id"
          :data-test="`provider-tab-${provider.id}`"
          class="pricing-tab"
          :class="{ active: activeProvider === provider.id }"
          @click="activeProvider = provider.id"
        >
          <span>{{ provider.label }}</span>
          <strong>{{ provider.count }}</strong>
        </button>
      </div>
    </section>

    <section class="pricing-content">
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
        <span>调整搜索词或切换供应商后再查看。</span>
      </div>

      <div v-else class="pricing-table-wrap">
        <table class="pricing-table">
          <thead>
            <tr>
              <th>Provider</th>
              <th>Model</th>
              <th>Mode</th>
              <th>Input</th>
              <th>Output</th>
              <th>Cache Write</th>
              <th>Cache Read</th>
              <th>Image</th>
              <th>Capabilities</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredItems" :key="`${item.provider}:${item.model}`">
              <td>
                <span class="pricing-provider" :class="`provider-${item.provider}`">
                  {{ providerLabel(item.provider) }}
                </span>
              </td>
              <td class="pricing-model">{{ item.model }}</td>
              <td>
                <code>{{ item.mode || '-' }}</code>
              </td>
              <td>{{ formatPrice(item.input_price_per_million) }}</td>
              <td>{{ formatPrice(item.output_price_per_million) }}</td>
              <td>{{ formatPrice(item.cache_write_price_per_million) }}</td>
              <td>{{ formatPrice(item.cache_read_price_per_million) }}</td>
              <td>{{ formatImagePrice(item.image_output_price) }}</td>
              <td>
                <div class="pricing-capabilities">
                  <span v-if="item.supports_prompt_caching">Prompt Cache</span>
                  <span v-if="item.supports_service_tier">Service Tier</span>
                  <span v-if="!item.supports_prompt_caching && !item.supports_service_tier" class="muted">
                    -
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import Icon from '@/components/icons/Icon.vue'
import {
  getPublicModelPricing,
  type PublicModelPricingCatalog,
  type PublicModelPricingItem,
} from '@/api/publicModelPricing'
import { useAppStore } from '@/stores'

type ProviderTab = PublicModelPricingItem['provider'] | 'all'

const catalog = ref<PublicModelPricingCatalog | null>(null)
const isLoading = ref(false)
const error = ref('')
const search = ref('')
const activeProvider = ref<ProviderTab>('all')
const appStore = useAppStore()

const providerLabels: Record<PublicModelPricingItem['provider'], string> = {
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  gemini: 'Gemini',
}

const allItems = computed(() => catalog.value?.items ?? [])
const siteName = computed(() => appStore.cachedPublicSettings?.site_name || appStore.siteName || 'Hahacode')
const siteLogo = computed(() => appStore.cachedPublicSettings?.site_logo || appStore.siteLogo || '/logo.png')

const providerTabs = computed(() => {
  const counts = allItems.value.reduce<Record<ProviderTab, number>>((acc, item) => {
    acc.all += 1
    acc[item.provider] += 1
    return acc
  }, {
    all: 0,
    openai: 0,
    anthropic: 0,
    gemini: 0,
  })

  return [
    { id: 'all' as const, label: 'All', count: counts.all },
    { id: 'openai' as const, label: 'OpenAI', count: counts.openai },
    { id: 'anthropic' as const, label: 'Anthropic', count: counts.anthropic },
    { id: 'gemini' as const, label: 'Gemini', count: counts.gemini },
  ]
})

const filteredItems = computed(() => {
  const query = search.value.trim().toLowerCase()
  return allItems.value.filter((item) => {
    if (activeProvider.value !== 'all' && item.provider !== activeProvider.value) {
      return false
    }
    if (!query) {
      return true
    }
    return [item.provider, providerLabel(item.provider), item.model, item.mode]
      .some((value) => value.toLowerCase().includes(query))
  })
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

function providerLabel(provider: PublicModelPricingItem['provider']): string {
  return providerLabels[provider]
}

function formatPrice(value: number | null): string {
  if (value === null || value === undefined) {
    return '-'
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value)
}

function formatImagePrice(value: number | null): string {
  if (value === null || value === undefined) {
    return '-'
  }
  return `${formatPrice(value)} / image`
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
  background: var(--theme-bg);
  color: var(--theme-text);
}

.pricing-hero {
  display: grid;
  gap: 1rem;
  max-width: 82rem;
  margin: 0 auto;
  padding: clamp(1rem, 3vw, 1.8rem);
  border-bottom: 1px solid var(--theme-border);
}

.pricing-hero-main {
  min-width: 0;
}

.pricing-brand {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  color: var(--theme-text);
  font-weight: 850;
}

.pricing-brand-mark {
  display: inline-flex;
  height: 2.1rem;
  width: 2.1rem;
  align-items: center;
  justify-content: center;
}

.pricing-brand-mark img {
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
}

.pricing-title-row {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  justify-content: space-between;
  gap: 0.8rem;
  margin-top: 1rem;
}

.pricing-kicker {
  color: var(--theme-primary);
  font-size: 0.78rem;
  font-weight: 900;
  text-transform: uppercase;
}

.pricing-title-row h1 {
  margin-top: 0.25rem;
  color: var(--theme-text);
  font-size: clamp(1.85rem, 4vw, 2.8rem);
  font-weight: 900;
  letter-spacing: 0;
  line-height: 1.08;
}

.pricing-summary {
  max-width: 56rem;
  margin-top: 0.8rem;
  color: var(--theme-text-muted);
  font-size: 0.94rem;
  line-height: 1.75;
}

.pricing-refresh,
.pricing-state-action {
  display: inline-flex;
  min-height: 2.35rem;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 1px solid var(--theme-border);
  border-radius: 0.45rem;
  background: var(--theme-surface);
  padding: 0 0.85rem;
  color: var(--theme-text);
  font-size: 0.84rem;
  font-weight: 850;
}

.pricing-refresh:hover,
.pricing-state-action:hover {
  border-color: color-mix(in srgb, var(--theme-primary) 44%, var(--theme-border));
  color: var(--theme-primary);
}

.pricing-refresh:disabled {
  cursor: wait;
  opacity: 0.68;
}

.pricing-meta {
  align-self: end;
  border: 1px solid var(--theme-border);
  border-radius: 0.5rem;
  background: var(--theme-surface);
  padding: 0.85rem 0.95rem;
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
  font-size: 1rem;
  font-weight: 900;
}

.pricing-meta small {
  margin-top: 0.35rem;
}

.pricing-toolbar,
.pricing-content {
  max-width: 82rem;
  margin: 0 auto;
  padding: clamp(1rem, 3vw, 1.8rem);
}

.pricing-toolbar {
  display: grid;
  gap: 0.8rem;
  padding-bottom: 0;
}

.pricing-search {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.55rem;
  min-height: 2.7rem;
  border: 1px solid var(--theme-border);
  border-radius: 0.5rem;
  background: var(--theme-surface);
  padding: 0 0.85rem;
  color: var(--theme-text-muted);
}

.pricing-search input {
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--theme-text);
  font-size: 0.92rem;
  outline: none;
}

.pricing-search input::placeholder {
  color: var(--theme-text-muted);
}

.pricing-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.pricing-tab {
  display: inline-flex;
  min-height: 2.35rem;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  border: 1px solid var(--theme-border);
  border-radius: 0.45rem;
  background: var(--theme-surface);
  padding: 0 0.8rem;
  color: var(--theme-text-muted);
  font-size: 0.84rem;
  font-weight: 850;
}

.pricing-tab strong {
  color: var(--theme-text);
  font-size: 0.78rem;
}

.pricing-tab.active {
  border-color: color-mix(in srgb, var(--theme-primary) 48%, var(--theme-border));
  background: var(--theme-primary-soft);
  color: var(--theme-primary);
}

.pricing-tab.active strong {
  color: var(--theme-primary);
}

.pricing-content {
  padding-top: 0.9rem;
}

.pricing-table-wrap {
  overflow-x: auto;
  border: 1px solid var(--theme-border);
  border-radius: 0.5rem;
  background: var(--theme-surface);
}

.pricing-table {
  width: 100%;
  min-width: 70rem;
  border-collapse: collapse;
}

.pricing-table th,
.pricing-table td {
  border-bottom: 1px solid var(--theme-border);
  padding: 0.72rem 0.75rem;
  text-align: left;
  vertical-align: middle;
  white-space: nowrap;
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
}

.pricing-table tbody tr:last-child td {
  border-bottom: 0;
}

.pricing-table tbody tr:hover {
  background: color-mix(in srgb, var(--theme-primary) 5%, transparent);
}

.pricing-model {
  max-width: 22rem;
  overflow: hidden;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-weight: 800;
  text-overflow: ellipsis;
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

.pricing-provider,
.pricing-capabilities span {
  display: inline-flex;
  min-height: 1.55rem;
  align-items: center;
  border-radius: 999px;
  padding: 0 0.55rem;
  font-size: 0.72rem;
  font-weight: 900;
}

.pricing-provider {
  border: 1px solid var(--theme-border);
  background: var(--theme-surface-muted);
  color: var(--theme-text);
}

.provider-openai {
  color: #16a34a;
}

.provider-anthropic {
  color: var(--theme-primary);
}

.provider-gemini {
  color: #2563eb;
}

.pricing-capabilities {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.pricing-capabilities span {
  border: 1px solid color-mix(in srgb, var(--theme-primary) 28%, var(--theme-border));
  background: color-mix(in srgb, var(--theme-primary) 8%, var(--theme-surface));
  color: var(--theme-primary);
}

.pricing-capabilities .muted {
  border-color: transparent;
  background: transparent;
  color: var(--theme-text-muted);
}

.pricing-state {
  display: grid;
  justify-items: center;
  gap: 0.45rem;
  border: 1px solid var(--theme-border);
  border-radius: 0.5rem;
  background: var(--theme-surface);
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

.pricing-state.error {
  border-color: color-mix(in srgb, #ef4444 36%, var(--theme-border));
}

.pricing-state.error :deep(svg) {
  color: #ef4444;
}

@media (min-width: 900px) {
  .pricing-hero {
    grid-template-columns: minmax(0, 1fr) minmax(18rem, 24rem);
    align-items: end;
  }

  .pricing-toolbar {
    grid-template-columns: minmax(18rem, 28rem) minmax(0, 1fr);
    align-items: center;
  }

  .pricing-tabs {
    justify-content: flex-end;
  }
}

@media (max-width: 640px) {
  .pricing-refresh,
  .pricing-search,
  .pricing-tabs,
  .pricing-tab {
    width: 100%;
  }

  .pricing-tab {
    justify-content: space-between;
  }
}
</style>
