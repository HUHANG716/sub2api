<template>
  <AppLayout>
    <div class="benefits-workspace space-y-6">
      <section class="benefits-hero">
        <div>
          <div class="mb-3 inline-flex items-center gap-2 rounded-md border border-primary-500/20 bg-primary-500/10 px-3 py-1 text-xs font-semibold text-primary-700 dark:text-primary-300">
            <Icon name="gift" size="xs" :stroke-width="2" />
            {{ t('benefits.center') }}
          </div>
          <h1 class="text-2xl font-semibold text-gray-950 dark:text-white sm:text-3xl">
            {{ t('benefits.title') }}
          </h1>
          <p class="mt-2 max-w-2xl text-sm leading-6 text-gray-600 dark:text-gray-300">
            {{ t('benefits.description') }}
          </p>
        </div>
        <button type="button" class="btn btn-secondary shrink-0" :disabled="loading" @click="loadCampaigns">
          <Icon name="refresh" size="sm" :class="loading ? 'animate-spin' : ''" />
          {{ t('common.refresh') }}
        </button>
      </section>

      <div v-if="loading" class="grid gap-4 lg:grid-cols-2">
        <div v-for="item in 4" :key="item" class="theme-panel rounded-lg p-5">
          <div class="table-skeleton-line h-5 w-2/5"></div>
          <div class="mt-4 space-y-3">
            <div class="table-skeleton-line h-4 w-full"></div>
            <div class="table-skeleton-line h-4 w-4/5"></div>
            <div class="table-skeleton-line h-9 w-full"></div>
          </div>
        </div>
      </div>

      <div v-else-if="campaigns.length === 0" class="benefits-empty">
        <div class="benefits-empty-icon mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg">
          <Icon name="gift" size="xl" class="text-gray-400" />
        </div>
        <h3 class="text-base font-semibold text-gray-900 dark:text-white">
          {{ t('benefits.emptyTitle') }}
        </h3>
        <p class="mt-2 text-sm text-gray-500 dark:text-dark-400">
          {{ t('benefits.emptyDescription') }}
        </p>
      </div>

      <div v-else class="grid gap-4 lg:grid-cols-2">
        <article
          v-for="item in campaigns"
          :key="item.campaign.id"
          class="benefit-card"
        >
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="truncate text-lg font-semibold text-gray-950 dark:text-white">
                {{ campaignTitle(item) }}
              </h2>
              <p class="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                {{ campaignDescription(item) }}
              </p>
            </div>
            <span :class="['badge shrink-0', stateBadgeClass(item.state)]">
              {{ stateLabel(item.state) }}
            </span>
          </div>

          <div class="mt-5 grid gap-3 sm:grid-cols-3">
            <div class="benefit-metric">
              <span>{{ t('benefits.threshold') }}</span>
              <strong>{{ formatCurrency(item.campaign.threshold_amount) }}</strong>
            </div>
            <div class="benefit-metric">
              <span>{{ t('benefits.recharged') }}</span>
              <strong>{{ formatCurrency(item.eligible_recharge_amount) }}</strong>
            </div>
            <div class="benefit-metric">
              <span>{{ t('benefits.grant') }}</span>
              <strong>{{ formatCurrency(item.campaign.grant_amount) }}</strong>
            </div>
          </div>

          <div class="mt-5 space-y-2 border-t border-gray-100 pt-4 text-xs text-gray-500 dark:border-dark-700 dark:text-dark-400">
            <div class="flex items-center justify-between gap-3">
              <span>{{ t('benefits.period') }}</span>
              <span class="text-right text-gray-700 dark:text-gray-300">
                {{ formatDateTime(item.campaign.starts_at) }} - {{ formatDateTime(item.campaign.ends_at) }}
              </span>
            </div>
            <div class="flex items-center justify-between gap-3">
              <span>{{ t('benefits.rechargeScope') }}</span>
              <span class="text-right text-gray-700 dark:text-gray-300">
                {{ scopeLabel(item.campaign.recharge_scope) }}
              </span>
            </div>
            <div v-if="item.claim" class="flex items-center justify-between gap-3">
              <span>{{ t('benefits.claimedAt') }}</span>
              <span class="text-right text-gray-700 dark:text-gray-300">
                {{ formatDateTime(item.claim.claimed_at) }}
              </span>
            </div>
          </div>

          <div class="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p class="min-h-[1.25rem] text-sm text-gray-600 dark:text-gray-300">
              {{ stateMessage(item) }}
            </p>
            <button
              type="button"
              class="btn btn-primary shrink-0"
              :disabled="item.state !== 'claimable' || claimingId === item.campaign.id"
              @click="handleClaim(item)"
            >
              <Icon
                :name="claimingId === item.campaign.id ? 'refresh' : 'checkCircle'"
                size="sm"
                :class="claimingId === item.campaign.id ? 'animate-spin' : ''"
              />
              {{ item.campaign.copy.button || t('benefits.claimButton') }}
            </button>
          </div>
        </article>
      </div>
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { benefitsAPI } from '@/api'
import { useAppStore } from '@/stores/app'
import { useAuthStore } from '@/stores/auth'
import { formatCurrency, formatDateTime } from '@/utils/format'
import { markBenefitCampaignsSeen } from '@/utils/benefitCampaignNotice'
import type { BenefitCampaignState, BenefitCampaignView, BenefitRechargeScope } from '@/types'
import AppLayout from '@/components/layout/AppLayout.vue'
import Icon from '@/components/icons/Icon.vue'

const { t } = useI18n()
const appStore = useAppStore()
const authStore = useAuthStore()

const campaigns = ref<BenefitCampaignView[]>([])
const loading = ref(false)
const claimingId = ref<number | null>(null)

const loadCampaigns = async () => {
  loading.value = true
  try {
    campaigns.value = await benefitsAPI.listCampaigns()
    markBenefitCampaignsSeen()
  } catch (error: any) {
    appStore.showError(error.response?.data?.detail || t('benefits.failedToLoad'))
  } finally {
    loading.value = false
  }
}

const handleClaim = async (item: BenefitCampaignView) => {
  if (item.state !== 'claimable') return
  claimingId.value = item.campaign.id
  try {
    const result = await benefitsAPI.claim(item.campaign.id)
    appStore.showSuccess(item.campaign.copy.success || t('benefits.claimSuccess'))
    await authStore.refreshUser().catch(() => undefined)
    campaigns.value = campaigns.value.map((current) =>
      current.campaign.id === item.campaign.id
        ? {
            ...current,
            campaign: result.campaign,
            claim: result.claim,
            state: 'claimed'
          }
        : current
    )
  } catch (error: any) {
    appStore.showError(error.response?.data?.detail || item.campaign.copy.failed || t('benefits.claimFailed'))
  } finally {
    claimingId.value = null
  }
}

const campaignTitle = (item: BenefitCampaignView) => item.campaign.copy.title || item.campaign.name
const campaignDescription = (item: BenefitCampaignView) => item.campaign.copy.description || t('benefits.defaultDescription')

const stateLabel = (state: BenefitCampaignState) => t(`benefits.states.${state}`)

const stateMessage = (item: BenefitCampaignView) => {
  const copy = item.campaign.copy
  switch (item.state) {
    case 'not_started':
      return copy.not_started || t('benefits.messages.notStarted')
    case 'ended':
      return copy.ended || t('benefits.messages.ended')
    case 'claimed':
      return copy.claimed || t('benefits.messages.claimed')
    case 'not_eligible':
      return copy.not_eligible || t('benefits.messages.notEligible', {
        amount: formatCurrency(Math.max(item.campaign.threshold_amount - item.eligible_recharge_amount, 0))
      })
    case 'claimable':
      return t('benefits.messages.claimable')
    default:
      return ''
  }
}

const stateBadgeClass = (state: BenefitCampaignState) => {
  switch (state) {
    case 'claimable':
      return 'badge-success'
    case 'claimed':
      return 'badge-primary'
    case 'not_eligible':
      return 'badge-warning'
    case 'not_started':
    case 'ended':
    default:
      return 'badge-gray'
  }
}

const scopeLabel = (scope: BenefitRechargeScope) => t(`benefits.scopes.${scope}`)

onMounted(() => {
  loadCampaigns()
})
</script>

<style scoped>
.benefits-workspace {
  max-width: 1120px;
  margin: 0 auto;
  color: var(--theme-text);
}

.benefits-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.25rem;
  border: 1px solid var(--theme-border);
  border-radius: 0.5rem;
  background: linear-gradient(135deg, color-mix(in srgb, var(--theme-surface-strong) 92%, var(--theme-bg)) 0%, var(--theme-surface) 100%);
  box-shadow: var(--theme-shadow);
}

.benefit-card,
.benefits-empty {
  border: 1px solid var(--theme-border);
  border-radius: 0.5rem;
  background: var(--theme-surface);
  box-shadow: var(--theme-shadow);
  padding: 1.25rem;
}

.benefits-empty {
  text-align: center;
  padding: 3rem 1.5rem;
}

.benefits-empty-icon {
  background: var(--theme-surface-muted);
  border: 1px solid var(--theme-border);
}

.benefit-metric {
  border-radius: 0.5rem;
  border: 1px solid var(--theme-border);
  background: var(--theme-surface-muted);
  padding: 0.75rem;
}

.benefit-metric span {
  display: block;
  font-size: 0.75rem;
  color: var(--theme-text-subtle);
}

.benefit-metric strong {
  margin-top: 0.25rem;
  display: block;
  color: var(--theme-text);
  font-weight: 700;
}

@media (max-width: 640px) {
  .benefits-hero {
    flex-direction: column;
  }
}
</style>
