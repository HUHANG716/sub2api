<template>
  <div class="card">
    <div class="dashboard-panel-header px-6 py-4">
      <h2 class="dashboard-panel-title text-lg font-semibold">{{ t('dashboard.quickActions') }}</h2>
    </div>
    <div class="space-y-3 p-4">
      <button @click="router.push('/keys')" class="dashboard-action-row group flex w-full items-center gap-4 rounded-xl p-4 text-left transition-all duration-200">
        <div class="dashboard-action-icon dashboard-action-icon-primary flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
          <Icon name="key" size="lg" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="dashboard-panel-title text-sm font-medium">{{ t('dashboard.createApiKey') }}</p>
          <p class="dashboard-panel-muted text-xs">{{ t('dashboard.generateNewKey') }}</p>
        </div>
        <Icon
          name="chevronRight"
          size="md"
          class="dashboard-action-chevron transition-colors"
        />
      </button>

      <button @click="router.push('/usage')" class="dashboard-action-row group flex w-full items-center gap-4 rounded-xl p-4 text-left transition-all duration-200">
        <div class="dashboard-action-icon dashboard-action-icon-green flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
          <Icon name="chart" size="lg" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="dashboard-panel-title text-sm font-medium">{{ t('dashboard.viewUsage') }}</p>
          <p class="dashboard-panel-muted text-xs">{{ t('dashboard.checkDetailedLogs') }}</p>
        </div>
        <Icon
          name="chevronRight"
          size="md"
          class="dashboard-action-chevron transition-colors"
        />
      </button>

      <button @click="router.push('/redeem')" class="dashboard-action-row group flex w-full items-center gap-4 rounded-xl p-4 text-left transition-all duration-200">
        <div class="dashboard-action-icon dashboard-action-icon-amber flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105">
          <Icon name="gift" size="lg" />
        </div>
        <div class="min-w-0 flex-1">
          <p class="dashboard-panel-title text-sm font-medium">{{ t('dashboard.redeemCode') }}</p>
          <p class="dashboard-panel-muted text-xs">{{ t('dashboard.addBalanceWithCode') }}</p>
        </div>
        <Icon
          name="chevronRight"
          size="md"
          class="dashboard-action-chevron transition-colors"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
const router = useRouter()
const { t } = useI18n()
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

.dashboard-action-row {
  background: color-mix(in srgb, var(--theme-surface-muted) 72%, var(--theme-surface));
  border: 1px solid transparent;
}

.dashboard-action-row:hover {
  background: color-mix(in srgb, var(--theme-surface-muted) 86%, var(--theme-accent-soft));
  border-color: var(--theme-border);
}

.dashboard-action-icon-primary {
  background: var(--theme-primary-soft);
  color: var(--theme-primary);
}

.dashboard-action-icon-green {
  background: color-mix(in srgb, #10b981 16%, var(--theme-surface));
  color: #059669;
}

.dashboard-action-icon-amber {
  background: color-mix(in srgb, #f59e0b 18%, var(--theme-surface));
  color: #d97706;
}

.dashboard-action-chevron {
  color: var(--theme-text-subtle);
}

.dashboard-action-row:hover .dashboard-action-chevron {
  color: var(--theme-primary);
}
</style>
