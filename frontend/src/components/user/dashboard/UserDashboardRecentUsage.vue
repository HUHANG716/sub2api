<template>
  <div class="card">
    <div class="dashboard-panel-header flex items-center justify-between px-6 py-4">
      <h2 class="dashboard-panel-title text-lg font-semibold">{{ t('dashboard.recentUsage') }}</h2>
      <span class="dashboard-date-badge">{{ t('dashboard.last7Days') }}</span>
    </div>
    <div class="p-6">
      <div v-if="loading" class="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
      <div v-else-if="data.length === 0" class="py-8">
        <EmptyState :title="t('dashboard.noUsageRecords')" :description="t('dashboard.startUsingApi')" />
      </div>
      <div v-else class="space-y-3">
        <div v-for="(log, index) in data" :key="log.id" class="recent-usage-row flex items-center justify-between rounded-xl p-4 transition-colors">
          <div class="flex items-center gap-4">
            <div :class="getRecentUsageIcon(index).wrapClass" class="flex h-10 w-10 items-center justify-center rounded-xl">
              <Icon
                :name="getRecentUsageIcon(index).name"
                size="md"
                class="recent-usage-model-icon"
              />
            </div>
            <div>
              <p class="dashboard-panel-title text-sm font-medium">{{ log.model }}</p>
              <p class="dashboard-panel-muted text-xs">{{ formatDateTime(log.created_at) }}</p>
            </div>
          </div>
          <div class="text-right">
            <p class="text-sm font-semibold">
              <span class="text-green-600 dark:text-green-400" :title="t('dashboard.actual')">${{ formatCost(log.actual_cost) }}</span>
              <span class="dashboard-panel-subtle font-normal" :title="t('dashboard.standard')"> / ${{ formatCost(log.total_cost) }}</span>
            </p>
            <p class="dashboard-panel-muted text-xs">{{ (log.input_tokens + log.output_tokens).toLocaleString() }} tokens</p>
          </div>
        </div>

        <router-link to="/usage" class="dashboard-view-all flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors">
          {{ t('dashboard.viewAllUsage') }}
          <Icon name="arrowRight" size="sm" />
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Icon from '@/components/icons/Icon.vue'
import { formatDateTime } from '@/utils/format'
import type { UsageLog } from '@/types'

const recentUsageIcons = [
  { name: 'terminal', wrapClass: 'recent-usage-icon-primary' },
  { name: 'cpu', wrapClass: 'recent-usage-icon-green' },
  { name: 'cloud', wrapClass: 'recent-usage-icon-blue' },
  { name: 'database', wrapClass: 'recent-usage-icon-amber' },
  { name: 'sparkles', wrapClass: 'recent-usage-icon-rose' }
] as const

defineProps<{
  data: UsageLog[]
  loading: boolean
}>()
const { t } = useI18n()
const formatCost = (c: number) => c.toFixed(4)
const getRecentUsageIcon = (index: number) => recentUsageIcons[index % recentUsageIcons.length]
</script>

<style scoped>
.dashboard-panel-header {
  border-bottom: 1px solid var(--theme-border);
}

.dashboard-panel-title {
  color: var(--theme-text);
}

.dashboard-panel-muted {
  color: var(--theme-text-subtle);
}

.dashboard-panel-subtle {
  color: color-mix(in srgb, var(--theme-text-subtle) 76%, transparent);
}

.dashboard-date-badge {
  border-radius: 0.375rem;
  background: var(--theme-surface-muted);
  color: var(--theme-text-soft);
  padding: 0.25rem 0.625rem;
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1rem;
}

.recent-usage-row {
  background: color-mix(in srgb, var(--theme-surface-muted) 72%, var(--theme-surface));
  border: 1px solid transparent;
}

.recent-usage-row:hover {
  background: color-mix(in srgb, var(--theme-surface-muted) 86%, var(--theme-accent-soft));
  border-color: var(--theme-border);
}

.recent-usage-icon-primary {
  background: var(--theme-primary-soft);
  color: var(--theme-primary);
}

.recent-usage-icon-green {
  background: color-mix(in srgb, #10b981 16%, var(--theme-surface));
  color: #059669;
}

.recent-usage-icon-blue {
  background: color-mix(in srgb, #3b82f6 14%, var(--theme-surface));
  color: #2563eb;
}

.recent-usage-icon-amber {
  background: color-mix(in srgb, #f59e0b 18%, var(--theme-surface));
  color: #d97706;
}

.recent-usage-icon-rose {
  background: color-mix(in srgb, #f43f5e 13%, var(--theme-surface));
  color: #e11d48;
}

.dashboard-view-all {
  color: var(--theme-primary);
}

.dashboard-view-all:hover {
  color: var(--theme-primary-hover);
}
</style>
