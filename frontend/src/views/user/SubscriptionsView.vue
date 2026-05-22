<template>
  <AppLayout>
    <div class="subscriptions-workspace space-y-6">
      <section class="subscriptions-hero">
        <div>
          <div class="mb-3 inline-flex items-center gap-2 rounded-md border border-primary-500/20 bg-primary-500/10 px-3 py-1 text-xs font-semibold text-primary-700 dark:text-primary-300">
            <Icon name="badge" size="xs" :stroke-width="2" />
            {{ t('userSubscriptions.entitlementCenter') }}
          </div>
          <h1 class="text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">
            {{ t('userSubscriptions.title') }}
          </h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
            {{ t('userSubscriptions.description') }}
          </p>
        </div>
        <button
          type="button"
          class="btn btn-primary shrink-0"
          @click="router.push({ path: '/purchase', query: { tab: 'subscription' } })"
        >
          <Icon name="plus" size="sm" />
          {{ t('payment.tabSubscribe') }}
        </button>
      </section>

      <div v-if="loading" class="flex justify-center py-12">
        <div
          class="h-8 w-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"
        ></div>
      </div>

      <div v-else-if="subscriptions.length === 0" class="subscriptions-empty">
        <div
          class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 dark:bg-dark-700"
        >
          <Icon name="creditCard" size="xl" class="text-gray-400" />
        </div>
        <h3 class="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
          {{ t('userSubscriptions.noActiveSubscriptions') }}
        </h3>
        <p class="text-gray-500 dark:text-dark-400">
          {{ t('userSubscriptions.noActiveSubscriptionsDesc') }}
        </p>
      </div>

      <div v-else class="grid gap-6 lg:grid-cols-2">
        <div
          v-for="subscription in subscriptions"
          :key="subscription.id"
          class="subscription-card"
          :class="platformBorderClass(subscription.group?.platform || '')"
        >
          <div
            class="subscription-card-header"
          >
            <div class="flex min-w-0 items-center gap-3">
              <div :class="['flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white shadow-sm', platformAccentDotClass(subscription.group?.platform || '')]">
                <Icon name="shield" size="md" :stroke-width="2" />
              </div>
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <h3 class="truncate font-semibold text-gray-900 dark:text-white">
                    {{ subscription.group?.name || `Group #${subscription.group_id}` }}
                  </h3>
                  <span :class="['rounded-md border px-2 py-0.5 text-[11px] font-medium', platformBadgeClass(subscription.group?.platform || '')]">
                    {{ platformLabel(subscription.group?.platform || '') }}
                  </span>
                </div>
                <p v-if="subscription.group?.description" class="mt-0.5 text-xs text-gray-500 dark:text-dark-400">
                  {{ subscription.group.description }}
                </p>
              </div>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <span
                :class="[
                  'rounded-md px-2 py-1 text-xs font-semibold',
                  subscription.status === 'active'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                    : subscription.status === 'expired'
                      ? 'bg-gray-100 text-gray-600 dark:bg-dark-700 dark:text-gray-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                ]"
              >
                {{ t(`userSubscriptions.status.${subscription.status}`) }}
              </span>
              <button
                v-if="subscription.status === 'active'"
                :class="['rounded-md px-3 py-2 text-xs font-semibold text-white transition-colors', platformButtonClass(subscription.group?.platform || '')]"
                @click="router.push({ path: '/purchase', query: { tab: 'subscription', group: String(subscription.group_id) } })"
              >
                {{ t('payment.renewNow') }}
              </button>
            </div>
          </div>

          <div class="space-y-5 p-5">
            <div class="subscription-meta-row">
              <div>
                <span>{{ t('userSubscriptions.expires') }}</span>
                <strong v-if="subscription.expires_at" :class="getExpirationClass(subscription.expires_at)">
                  {{ formatExpirationDate(subscription.expires_at) }}
                </strong>
                <strong v-else class="text-gray-700 dark:text-gray-300">
                  {{ t('userSubscriptions.noExpiration') }}
                </strong>
              </div>
              <div>
                <span>{{ t('payment.planCard.rate') }}</span>
                <strong>×{{ subscription.group?.rate_multiplier ?? 1 }}</strong>
              </div>
            </div>

            <div v-if="subscription.group?.daily_limit_usd" class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ t('userSubscriptions.daily') }}
                </span>
                <span class="text-sm text-gray-500 dark:text-dark-400">
                  ${{ (subscription.daily_usage_usd || 0).toFixed(2) }} / ${{
                    subscription.group.daily_limit_usd.toFixed(2)
                  }}
                </span>
              </div>
              <div class="relative h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-dark-600">
                <div
                  class="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                  :class="
                    getProgressBarClass(
                      subscription.daily_usage_usd,
                      subscription.group.daily_limit_usd
                    )
                  "
                  :style="{
                    width: getProgressWidth(
                      subscription.daily_usage_usd,
                      subscription.group.daily_limit_usd
                    )
                  }"
                ></div>
              </div>
              <p
                class="text-xs text-gray-500 dark:text-dark-400"
              >
                {{ formatDailyUsageWindow(subscription) }}
              </p>
            </div>

            <div v-if="subscription.group?.weekly_limit_usd" class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ t('userSubscriptions.weekly') }}
                </span>
                <span class="text-sm text-gray-500 dark:text-dark-400">
                  ${{ (subscription.weekly_usage_usd || 0).toFixed(2) }} / ${{
                    subscription.group.weekly_limit_usd.toFixed(2)
                  }}
                </span>
              </div>
              <div class="relative h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-dark-600">
                <div
                  class="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                  :class="
                    getProgressBarClass(
                      subscription.weekly_usage_usd,
                      subscription.group.weekly_limit_usd
                    )
                  "
                  :style="{
                    width: getProgressWidth(
                      subscription.weekly_usage_usd,
                      subscription.group.weekly_limit_usd
                    )
                  }"
                ></div>
              </div>
              <p
                class="text-xs text-gray-500 dark:text-dark-400"
              >
                {{
                  formatUsageWindow(subscription, 'weekly')
                }}
              </p>
            </div>

            <div v-if="subscription.group?.monthly_limit_usd" class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {{ t('userSubscriptions.monthly') }}
                </span>
                <span class="text-sm text-gray-500 dark:text-dark-400">
                  ${{ (subscription.monthly_usage_usd || 0).toFixed(2) }} / ${{
                    subscription.group.monthly_limit_usd.toFixed(2)
                  }}
                </span>
              </div>
              <div class="relative h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-dark-600">
                <div
                  class="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                  :class="
                    getProgressBarClass(
                      subscription.monthly_usage_usd,
                      subscription.group.monthly_limit_usd
                    )
                  "
                  :style="{
                    width: getProgressWidth(
                      subscription.monthly_usage_usd,
                      subscription.group.monthly_limit_usd
                    )
                  }"
                ></div>
              </div>
              <p
                class="text-xs text-gray-500 dark:text-dark-400"
              >
                {{
                  formatUsageWindow(subscription, 'monthly')
                }}
              </p>
            </div>

            <div
              v-if="
                !subscription.group?.daily_limit_usd &&
                !subscription.group?.weekly_limit_usd &&
                !subscription.group?.monthly_limit_usd
              "
              class="subscription-unlimited"
            >
              <div class="flex items-center gap-3">
                <Icon name="sparkles" size="xl" class="text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p class="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    {{ t('userSubscriptions.unlimited') }}
                  </p>
                  <p class="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                    {{ t('userSubscriptions.unlimitedDesc') }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import subscriptionsAPI from '@/api/subscriptions'
import type { UserSubscription } from '@/types'
import AppLayout from '@/components/layout/AppLayout.vue'
import Icon from '@/components/icons/Icon.vue'
import { formatDateOnly } from '@/utils/format'
import { platformBorderClass, platformBadgeClass, platformButtonClass, platformLabel } from '@/utils/platformColors'
import {
  getRemainingDurationParts,
  getWindowEndState,
  isOneTimeDailyQuota,
  type RemainingDurationParts
} from '@/utils/subscriptionQuota'

function platformAccentDotClass(p: string): string {
  switch (p) {
    case 'anthropic': return 'bg-orange-500 shadow-orange-500/20'
    case 'openai': return 'bg-emerald-500 shadow-emerald-500/20'
    case 'antigravity': return 'bg-purple-500 shadow-purple-500/20'
    case 'gemini': return 'bg-blue-500 shadow-blue-500/20'
    default: return 'bg-gray-500 shadow-gray-500/20'
  }
}

const { t } = useI18n()
const router = useRouter()
const appStore = useAppStore()

const subscriptions = ref<UserSubscription[]>([])
const loading = ref(true)

async function loadSubscriptions() {
  try {
    loading.value = true
    subscriptions.value = await subscriptionsAPI.getMySubscriptions()
  } catch (error) {
    console.error('Failed to load subscriptions:', error)
    appStore.showError(t('userSubscriptions.failedToLoad'))
  } finally {
    loading.value = false
  }
}

function getProgressWidth(used: number | undefined, limit: number | null | undefined): string {
  if (!limit || limit === 0) return '0%'
  const percentage = Math.min(((used || 0) / limit) * 100, 100)
  return `${percentage}%`
}

function getProgressBarClass(used: number | undefined, limit: number | null | undefined): string {
  if (!limit || limit === 0) return 'bg-gray-400'
  const percentage = ((used || 0) / limit) * 100
  if (percentage >= 90) return 'bg-red-500'
  if (percentage >= 70) return 'bg-orange-500'
  return 'bg-green-500'
}

function formatExpirationDate(expiresAt: string): string {
  const now = new Date()
  const expires = new Date(expiresAt)
  const diff = expires.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (days < 0) {
    return t('userSubscriptions.status.expired')
  }

  const dateStr = formatDateOnly(expires)

  if (days === 0) {
    return `${dateStr} (${t('common.today')})`
  }
  if (days === 1) {
    return `${dateStr} (${t('common.tomorrow')})`
  }

  return t('userSubscriptions.daysRemaining', { days }) + ` (${dateStr})`
}

function getExpirationClass(expiresAt: string): string {
  const now = new Date()
  const expires = new Date(expiresAt)
  const diff = expires.getTime() - now.getTime()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (days <= 0) return 'text-red-600 dark:text-red-400 font-medium'
  if (days <= 3) return 'text-red-600 dark:text-red-400'
  if (days <= 7) return 'text-orange-600 dark:text-orange-400'
  return 'text-gray-700 dark:text-gray-300'
}

function formatDurationParts(parts: RemainingDurationParts): string {
  if (parts.days > 0) {
    return `${parts.days}d ${parts.hours}h`
  }

  if (parts.hours > 0) {
    return `${parts.hours}h ${parts.minutes}m`
  }

  return `${parts.minutes}m`
}

function formatDailyUsageWindow(subscription: UserSubscription): string {
  if (isSubscriptionExpired(subscription)) {
    return t('userSubscriptions.status.expired')
  }

  if (isOneTimeDailyQuota(subscription) && subscription.expires_at) {
    const parts = getRemainingDurationParts(subscription.expires_at)
    if (!parts) return t('userSubscriptions.status.expired')
    return t('userSubscriptions.quotaEndsIn', { time: formatDurationParts(parts) })
  }

  return formatUsageWindow(subscription, 'daily')
}

function isSubscriptionExpired(subscription: UserSubscription): boolean {
  if (subscription.status === 'expired') return true
  if (!subscription.expires_at) return false

  const expiresTime = new Date(subscription.expires_at).getTime()
  return Number.isFinite(expiresTime) && expiresTime <= Date.now()
}

function getWindowStart(
  subscription: UserSubscription,
  period: 'daily' | 'weekly' | 'monthly'
): string | null {
  const fallbackStart = subscription.starts_at || null
  switch (period) {
    case 'daily':
      return subscription.daily_window_start || ((subscription.daily_usage_usd || 0) > 0 ? fallbackStart : null)
    case 'weekly':
      return subscription.weekly_window_start || ((subscription.weekly_usage_usd || 0) > 0 ? fallbackStart : null)
    case 'monthly':
      return subscription.monthly_window_start || ((subscription.monthly_usage_usd || 0) > 0 ? fallbackStart : null)
  }
}

function getWindowHours(period: 'daily' | 'weekly' | 'monthly'): number {
  switch (period) {
    case 'daily':
      return 24
    case 'weekly':
      return 168
    case 'monthly':
      return 720
  }
}

function formatUsageWindow(
  subscription: UserSubscription,
  period: 'daily' | 'weekly' | 'monthly'
): string {
  if (isSubscriptionExpired(subscription)) {
    return t('userSubscriptions.status.expired')
  }

  const state = getWindowEndState(
    getWindowStart(subscription, period),
    getWindowHours(period),
    subscription.expires_at
  )

  if (!state) return t('userSubscriptions.windowNotActive')

  const time = formatDurationParts(state.parts)
  return state.type === 'quota_end'
    ? t('userSubscriptions.quotaEndsIn', { time })
    : t('userSubscriptions.resetIn', { time })
}

onMounted(() => {
  loadSubscriptions()
})
</script>

<style scoped>
.subscriptions-workspace {
  color: var(--theme-text);
}

.subscriptions-hero,
.subscriptions-empty,
.subscription-card {
  background: var(--theme-surface);
  border: 1px solid var(--theme-border);
  box-shadow: var(--theme-shadow);
  @apply rounded-lg backdrop-blur-xl;
}

.subscriptions-hero {
  @apply flex flex-col gap-4 p-5 sm:flex-row sm:items-end sm:justify-between;
  background: linear-gradient(135deg, color-mix(in srgb, var(--theme-surface-strong) 92%, var(--theme-bg)) 0%, var(--theme-surface) 100%);
}

.subscriptions-empty {
  @apply p-12 text-center;
}

.subscription-card {
  @apply overflow-hidden;
}

.subscription-card-header {
  @apply flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between;
  border-bottom: 1px solid var(--theme-border);
}

.subscription-meta-row {
  @apply grid gap-3 sm:grid-cols-2;
}

.subscription-meta-row > div {
  @apply rounded-lg p-3;
  background: var(--theme-surface-muted);
  border: 1px solid var(--theme-border);
}

.subscription-meta-row span {
  @apply block text-xs font-medium text-gray-500 dark:text-gray-400;
}

.subscription-meta-row strong {
  @apply mt-1 block text-sm font-semibold text-gray-900 dark:text-white;
}

.subscription-unlimited {
  @apply flex items-center justify-center rounded-lg py-6;
  background: color-mix(in srgb, #10b981 9%, var(--theme-surface));
  border: 1px solid color-mix(in srgb, #10b981 20%, var(--theme-border));
}
</style>
