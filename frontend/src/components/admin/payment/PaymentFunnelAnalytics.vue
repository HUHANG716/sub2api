<template>
  <div class="card p-4">
    <div class="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 class="text-sm font-semibold text-gray-900 dark:text-white">{{ t('payment.admin.funnelTitle') }}</h3>
        <p class="text-xs text-gray-500 dark:text-gray-400">{{ t('payment.admin.funnelSubtitle', { days: analytics?.window_days || days }) }}</p>
      </div>
      <div class="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-500 dark:border-dark-600 dark:text-gray-400">
        <Icon name="trendingUp" size="sm" />
        <span>{{ conversionLabel }}</span>
      </div>
    </div>

    <div v-if="loading" class="flex h-40 items-center justify-center">
      <LoadingSpinner size="md" />
    </div>
    <div v-else-if="analytics?.events_missing" class="flex h-40 items-center justify-center text-sm text-amber-600 dark:text-amber-300">
      {{ t('payment.admin.funnelTableMissing') }}
    </div>
    <div v-else-if="!hasData" class="flex h-40 items-center justify-center text-sm text-gray-500 dark:text-gray-400">
      {{ t('payment.admin.noFunnelData') }}
    </div>
    <template v-else>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-5">
        <div v-for="(step, index) in funnelSteps" :key="step.name" class="rounded-lg border border-gray-200 p-3 dark:border-dark-600">
          <div class="flex items-center justify-between gap-2">
            <span class="text-xs font-medium text-gray-500 dark:text-gray-400">{{ step.label }}</span>
            <Icon :name="index === funnelSteps.length - 1 ? 'checkCircle' : 'arrowRight'" size="sm" :class="index === funnelSteps.length - 1 ? 'text-green-500' : 'text-gray-400'" />
          </div>
          <div class="mt-3 text-2xl font-bold text-gray-900 dark:text-white">{{ step.count }}</div>
          <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {{ t('payment.admin.uniqueUsers', { count: step.uniqueUsers }) }}
          </div>
          <div class="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-700">
            <div class="h-full rounded-full bg-primary-500" :style="{ width: stepWidth(step.count) }"></div>
          </div>
        </div>
      </div>

      <div class="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <div class="rounded-lg border border-gray-200 p-4 dark:border-dark-600">
          <h4 class="mb-3 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{{ t('payment.admin.funnelByMethod') }}</h4>
          <div v-if="!methodRows.length" class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{{ t('payment.admin.noData') }}</div>
          <div v-else class="space-y-3">
            <div v-for="method in methodRows" :key="method.paymentType" class="space-y-1">
              <div class="flex items-center justify-between text-sm">
                <span class="font-medium text-gray-700 dark:text-gray-300">{{ formatPaymentMethod(method.paymentType) }}</span>
                <span class="text-gray-500 dark:text-gray-400">{{ t('payment.admin.methodSuccessCount', { count: method.success }) }}</span>
              </div>
              <div class="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-dark-700">
                <div class="h-full rounded-full bg-emerald-500" :style="{ width: stepWidth(method.success) }"></div>
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ t('payment.admin.methodSubmitCount', { count: method.submit }) }}
              </div>
            </div>
          </div>
        </div>

        <div class="rounded-lg border border-gray-200 p-4 dark:border-dark-600">
          <h4 class="mb-3 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{{ t('payment.admin.recentFunnelEvents') }}</h4>
          <div v-if="!recentEvents.length" class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{{ t('payment.admin.noData') }}</div>
          <div v-else class="overflow-x-auto">
            <table class="min-w-full text-left text-sm">
              <thead class="text-xs uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th class="px-3 py-2 font-medium">{{ t('payment.admin.event') }}</th>
                  <th class="px-3 py-2 font-medium">{{ t('payment.admin.paymentMethod') }}</th>
                  <th class="px-3 py-2 font-medium">{{ t('payment.admin.amount') }}</th>
                  <th class="px-3 py-2 font-medium">{{ t('payment.admin.time') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-dark-700">
                <tr v-for="event in recentEvents" :key="`${event.name}-${event.created_at}-${event.order_id || ''}`">
                  <td class="px-3 py-2 text-gray-700 dark:text-gray-300">
                    <div class="font-medium">{{ formatEventName(event.name) }}</div>
                    <div v-if="event.status || event.error_kind || event.launch_kind || event.source" class="text-xs text-gray-500 dark:text-gray-400">
                      {{ event.status || event.error_kind || event.launch_kind || event.source }}
                    </div>
                  </td>
                  <td class="px-3 py-2 text-gray-600 dark:text-gray-300">{{ event.payment_type ? formatPaymentMethod(event.payment_type) : '-' }}</td>
                  <td class="px-3 py-2 text-gray-600 dark:text-gray-300">{{ formatAmount(event.pay_amount ?? event.amount) }}</td>
                  <td class="whitespace-nowrap px-3 py-2 text-gray-500 dark:text-gray-400">{{ formatEventTime(event.created_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div class="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div class="rounded-lg border border-gray-200 p-4 dark:border-dark-600">
          <h4 class="mb-3 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{{ t('payment.admin.operatorSummary') }}</h4>
          <div v-if="!operatorRows.length" class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{{ t('payment.admin.noData') }}</div>
          <div v-else class="overflow-x-auto">
            <table class="min-w-full text-left text-sm">
              <thead class="text-xs uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th class="px-3 py-2 font-medium">{{ t('payment.admin.operator') }}</th>
                  <th class="px-3 py-2 font-medium">{{ t('payment.admin.action') }}</th>
                  <th class="px-3 py-2 font-medium">{{ t('payment.admin.count') }}</th>
                  <th class="px-3 py-2 font-medium">{{ t('payment.admin.time') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-dark-700">
                <tr v-for="item in operatorRows" :key="`${item.operator}-${item.action}`">
                  <td class="px-3 py-2 text-gray-700 dark:text-gray-300">{{ formatOperator(item.operator, item.actor_type, item.actor_id) }}</td>
                  <td class="px-3 py-2 text-gray-600 dark:text-gray-300">{{ formatAuditAction(item.action) }}</td>
                  <td class="px-3 py-2 text-gray-600 dark:text-gray-300">{{ item.count }}</td>
                  <td class="whitespace-nowrap px-3 py-2 text-gray-500 dark:text-gray-400">{{ formatEventTime(item.last_action_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="rounded-lg border border-gray-200 p-4 dark:border-dark-600">
          <h4 class="mb-3 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">{{ t('payment.admin.recentAuditEvents') }}</h4>
          <div v-if="!auditEvents.length" class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">{{ t('payment.admin.noData') }}</div>
          <div v-else class="overflow-x-auto">
            <table class="min-w-full text-left text-sm">
              <thead class="text-xs uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th class="px-3 py-2 font-medium">{{ t('payment.admin.operator') }}</th>
                  <th class="px-3 py-2 font-medium">{{ t('payment.admin.action') }}</th>
                  <th class="px-3 py-2 font-medium">{{ t('payment.admin.order') }}</th>
                  <th class="px-3 py-2 font-medium">{{ t('payment.admin.colUser') }}</th>
                  <th class="px-3 py-2 font-medium">{{ t('payment.admin.amount') }}</th>
                  <th class="px-3 py-2 font-medium">{{ t('payment.admin.time') }}</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-gray-100 dark:divide-dark-700">
                <tr v-for="event in auditEvents" :key="event.id">
                  <td class="px-3 py-2 text-gray-700 dark:text-gray-300">{{ formatOperator(event.operator, event.actor_type, event.actor_id) }}</td>
                  <td class="px-3 py-2 text-gray-600 dark:text-gray-300">
                    <div class="font-medium">{{ formatAuditAction(event.action) }}</div>
                    <div v-if="event.status" class="text-xs text-gray-500 dark:text-gray-400">{{ event.status }}</div>
                  </td>
                  <td class="px-3 py-2 text-gray-600 dark:text-gray-300">{{ event.order_id || '-' }}</td>
                  <td class="px-3 py-2 text-gray-600 dark:text-gray-300">{{ event.user_email || formatSubjectUser(event.subject_user_id) }}</td>
                  <td class="px-3 py-2 text-gray-600 dark:text-gray-300">{{ formatAmount(event.pay_amount) }}</td>
                  <td class="whitespace-nowrap px-3 py-2 text-gray-500 dark:text-gray-400">{{ formatEventTime(event.created_at) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import { formatDateTime } from '@/utils/format'
import type { PaymentAnalyticsResponse } from '@/api/admin/payment'

const props = defineProps<{
  analytics: PaymentAnalyticsResponse | null
  loading?: boolean
  days: number
}>()

const { t } = useI18n()

const stepDefinitions = [
  { name: 'payment_page_view', labelKey: 'payment.admin.funnelPageView' },
  { name: 'payment_order_submit', labelKey: 'payment.admin.funnelSubmit' },
  { name: 'payment_order_create_success', labelKey: 'payment.admin.funnelCreated' },
  { name: 'payment_launch', labelKey: 'payment.admin.funnelLaunch' },
  { name: 'payment_result_success', labelKey: 'payment.admin.funnelResult' },
] as const

const stepMap = computed(() => {
  const map = new Map<string, { count: number; unique_users: number }>()
  for (const step of props.analytics?.steps || []) {
    map.set(step.name, step)
  }
  return map
})

const funnelSteps = computed(() =>
  stepDefinitions.map((definition) => {
    const item = stepMap.value.get(definition.name)
    return {
      name: definition.name,
      label: t(definition.labelKey),
      count: item?.count || 0,
      uniqueUsers: item?.unique_users || 0,
    }
  })
)

const maxStepCount = computed(() => Math.max(1, ...funnelSteps.value.map((step) => step.count)))
const hasData = computed(() => funnelSteps.value.some((step) => step.count > 0) || !!props.analytics?.recent_events?.length)
const recentEvents = computed(() => props.analytics?.recent_events || [])
const operatorRows = computed(() => props.analytics?.operators || [])
const auditEvents = computed(() => props.analytics?.audit_events || [])

const conversionLabel = computed(() => {
  const submit = stepMap.value.get('payment_order_submit')?.count || 0
  const result = stepMap.value.get('payment_result_success')?.count || 0
  if (submit <= 0) return t('payment.admin.conversionEmpty')
  return t('payment.admin.conversionRate', { rate: `${Math.round((result / submit) * 1000) / 10}%` })
})

const methodRows = computed(() => {
  const rows = new Map<string, { paymentType: string; submit: number; success: number }>()
  for (const item of props.analytics?.methods || []) {
    const paymentType = item.payment_type || '-'
    const row = rows.get(paymentType) || { paymentType, submit: 0, success: 0 }
    if (item.event_name === 'payment_order_submit') row.submit += item.count
    if (item.event_name === 'payment_result_status') row.success += item.count
    rows.set(paymentType, row)
  }
  return [...rows.values()].sort((a, b) => (b.success + b.submit) - (a.success + a.submit))
})

function stepWidth(count: number): string {
  if (count <= 0) return '0%'
  return `${Math.max(4, Math.round((count / maxStepCount.value) * 100))}%`
}

function formatPaymentMethod(method: string): string {
  return t(`payment.methods.${method}`, method)
}

function formatEventName(name: string): string {
  return t(`payment.admin.events.${name}`, name)
}

function formatAuditAction(action: string): string {
  return t(`payment.admin.auditActions.${action}`, action)
}

function formatOperator(operator: string, actorType?: string, actorId?: number): string {
  if (actorType === 'admin' && actorId) return t('payment.admin.operatorAdmin', { id: actorId })
  if (actorType === 'user' && actorId) return t('payment.admin.operatorUser', { id: actorId })
  if (actorType === 'system') return t('payment.admin.operatorSystem')
  if (actorType === 'provider') return operator || t('payment.admin.operatorProvider')
  return operator || '-'
}

function formatSubjectUser(userId: number | undefined): string {
  return userId ? `#${userId}` : '-'
}

function formatAmount(value: number | undefined): string {
  return typeof value === 'number' && Number.isFinite(value) ? `¥${value.toFixed(2)}` : '-'
}

function formatEventTime(value: string | undefined): string {
  return value ? formatDateTime(value) : '-'
}
</script>
