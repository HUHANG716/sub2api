<template>
  <div>
    <div
      v-if="loading && items.length === 0"
      class="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
    >
      <div
        v-for="i in 6"
        :key="i"
        class="min-h-[280px] rounded-2xl border border-gray-200/80 bg-white/70 p-5 dark:border-dark-700/70 dark:bg-dark-800/60"
      >
        <div class="flex items-start gap-3">
          <div class="skeleton h-9 w-9 rounded-xl"></div>
          <div class="flex-1 space-y-2">
            <div class="skeleton h-4 w-2/3"></div>
            <div class="skeleton h-3 w-1/2"></div>
          </div>
          <div class="skeleton h-6 w-16 rounded-full"></div>
        </div>
        <div class="mt-5 grid grid-cols-2 gap-2">
          <div class="skeleton h-16 rounded-xl"></div>
          <div class="skeleton h-16 rounded-xl"></div>
        </div>
        <div class="skeleton mt-6 h-5 w-full"></div>
      </div>
    </div>

    <EmptyState
      v-else-if="items.length === 0"
      :title="t('channelStatus.empty.title')"
      :description="t('channelStatus.empty.description')"
    />

    <div
      v-else
      class="grid gap-5 grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
    >
      <MonitorCard
        v-for="item in items"
        :key="item.id"
        :item="item"
        :window="window"
        :availability-value="resolveAvailability(item)"
        :countdown-seconds="countdownSeconds"
        @click="emit('cardClick', item)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { UserMonitorView, UserMonitorDetail } from '@/api/channelMonitor'
import EmptyState from '@/components/common/EmptyState.vue'
import MonitorCard from './MonitorCard.vue'

const props = defineProps<{
  items: UserMonitorView[]
  window: '7d' | '15d' | '30d'
  countdownSeconds: number
  loading: boolean
  detailCache: Record<number, UserMonitorDetail>
}>()

const emit = defineEmits<{
  (e: 'cardClick', item: UserMonitorView): void
}>()

const { t } = useI18n()

function resolveAvailability(item: UserMonitorView): number | null {
  if (props.window === '7d') {
    return item.availability_7d ?? null
  }
  const detail = props.detailCache[item.id]
  if (!detail) return null
  const primary = detail.models.find(m => m.model === item.primary_model)
  if (!primary) return null
  return props.window === '15d' ? primary.availability_15d ?? null : primary.availability_30d ?? null
}
</script>
