<template>
  <AppLayout>
    <TablePageLayout>
      <template #filters>
        <div class="flex flex-wrap items-center gap-3">
          <div class="flex-1 sm:max-w-64">
            <input
              v-model="searchQuery"
              type="text"
              :placeholder="t('admin.benefits.searchCampaigns')"
              class="input"
              @input="handleSearch"
            />
          </div>
          <Select v-model="filters.enabled" :options="enabledFilterOptions" class="w-36" @change="handleFilterChange" />
          <Select v-model="filters.visible" :options="visibleFilterOptions" class="w-36" @change="handleFilterChange" />

          <div class="flex flex-1 flex-wrap items-center justify-end gap-2">
            <button type="button" class="btn btn-secondary" :disabled="loading" :title="t('common.refresh')" @click="loadCampaigns">
              <Icon name="refresh" size="md" :class="loading ? 'animate-spin' : ''" />
            </button>
            <button type="button" class="btn btn-primary" @click="openCreateDialog">
              <Icon name="plus" size="md" class="mr-1" />
              {{ t('admin.benefits.createCampaign') }}
            </button>
          </div>
        </div>
      </template>

      <template #table>
        <DataTable
          :columns="columns"
          :data="campaigns"
          :loading="loading"
          :server-side-sort="true"
          default-sort-key="sort_order"
          default-sort-order="asc"
          @sort="handleSort"
        >
          <template #cell-name="{ value, row }">
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="truncate font-medium text-gray-900 dark:text-white">{{ value }}</span>
                <span v-if="!row.visible" class="badge badge-gray">{{ t('admin.benefits.hidden') }}</span>
              </div>
              <p class="mt-1 truncate text-xs text-gray-500 dark:text-dark-400">{{ row.copy.title }}</p>
            </div>
          </template>

          <template #cell-enabled="{ value }">
            <span :class="['badge', value ? 'badge-success' : 'badge-gray']">
              {{ value ? t('admin.benefits.enabled') : t('admin.benefits.disabled') }}
            </span>
          </template>

          <template #cell-amounts="{ row }">
            <div class="text-sm text-gray-700 dark:text-gray-300">
              <div>{{ t('admin.benefits.thresholdShort') }} {{ formatCurrency(row.threshold_amount) }}</div>
              <div class="mt-0.5">{{ t('admin.benefits.grantShort') }} {{ formatCurrency(row.grant_amount) }}</div>
            </div>
          </template>

          <template #cell-timeRange="{ row }">
            <div class="text-sm text-gray-600 dark:text-gray-300">
              <div>{{ formatDateTime(row.starts_at) }}</div>
              <div class="mt-0.5">{{ formatDateTime(row.ends_at) }}</div>
            </div>
          </template>

          <template #cell-recharge_scope="{ value }">
            <span class="badge badge-primary">{{ t(`admin.benefits.scopes.${value}`) }}</span>
          </template>

          <template #cell-claim_count="{ value }">
            <span class="font-medium text-gray-900 dark:text-white">{{ value }}</span>
          </template>

          <template #cell-actions="{ row }">
            <div class="flex items-center space-x-1">
              <button
                type="button"
                class="flex flex-col items-center gap-0.5 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/20 dark:hover:text-blue-400"
                :title="t('admin.benefits.viewClaims')"
                @click="openClaimsDialog(row)"
              >
                <Icon name="eye" size="sm" />
              </button>
              <button
                type="button"
                class="flex flex-col items-center gap-0.5 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-dark-600 dark:hover:text-gray-300"
                :title="t('common.edit')"
                @click="openEditDialog(row)"
              >
                <Icon name="edit" size="sm" />
              </button>
              <button
                type="button"
                class="flex flex-col items-center gap-0.5 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                :title="t('common.delete')"
                @click="handleDelete(row)"
              >
                <Icon name="trash" size="sm" />
              </button>
            </div>
          </template>
        </DataTable>
      </template>

      <template #pagination>
        <Pagination
          v-if="pagination.total > 0"
          :page="pagination.page"
          :total="pagination.total"
          :page-size="pagination.page_size"
          @update:page="handlePageChange"
          @update:pageSize="handlePageSizeChange"
        />
      </template>
    </TablePageLayout>

    <BaseDialog :show="showEditor" :title="isEditing ? t('admin.benefits.editCampaign') : t('admin.benefits.createCampaign')" width="wide" @close="closeEditor">
      <form id="benefit-campaign-form" class="space-y-5" @submit.prevent="handleSave">
        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="input-label">{{ t('admin.benefits.form.name') }}</label>
            <input v-model="form.name" type="text" required class="input" />
          </div>
          <div>
            <label class="input-label">{{ t('admin.benefits.form.sortOrder') }}</label>
            <input v-model.number="form.sort_order" type="number" class="input" />
          </div>
          <div>
            <label class="input-label">{{ t('admin.benefits.form.startsAt') }}</label>
            <input v-model="form.starts_at" type="datetime-local" required class="input" />
          </div>
          <div>
            <label class="input-label">{{ t('admin.benefits.form.endsAt') }}</label>
            <input v-model="form.ends_at" type="datetime-local" required class="input" />
          </div>
          <div>
            <label class="input-label">{{ t('admin.benefits.form.thresholdAmount') }}</label>
            <input v-model.number="form.threshold_amount" type="number" min="0" step="0.01" required class="input" />
          </div>
          <div>
            <label class="input-label">{{ t('admin.benefits.form.grantAmount') }}</label>
            <input v-model.number="form.grant_amount" type="number" min="0" step="0.01" required class="input" />
          </div>
          <div>
            <label class="input-label">{{ t('admin.benefits.form.rechargeScope') }}</label>
            <Select v-model="form.recharge_scope" :options="scopeOptions" />
          </div>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <label class="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-dark-600">
            <input v-model="form.enabled" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <span class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ t('admin.benefits.form.enabled') }}</span>
          </label>
          <label class="flex items-center gap-3 rounded-lg border border-gray-200 p-3 dark:border-dark-600">
            <input v-model="form.visible" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500" />
            <span class="text-sm font-medium text-gray-800 dark:text-gray-200">{{ t('admin.benefits.form.visible') }}</span>
          </label>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <div>
            <label class="input-label">{{ t('admin.benefits.form.copyTitle') }}</label>
            <input v-model="form.copy.title" type="text" required class="input" />
          </div>
          <div>
            <label class="input-label">{{ t('admin.benefits.form.copyButton') }}</label>
            <input v-model="form.copy.button" type="text" required class="input" />
          </div>
          <div class="md:col-span-2">
            <label class="input-label">{{ t('admin.benefits.form.copyDescription') }}</label>
            <textarea v-model="form.copy.description" rows="2" required class="input"></textarea>
          </div>
          <div v-for="field in copyStateFields" :key="field.key">
            <label class="input-label">{{ field.label }}</label>
            <input v-model="form.copy[field.key]" type="text" required class="input" />
          </div>
        </div>
      </form>
      <template #footer>
        <div class="flex justify-end gap-3">
          <button type="button" class="btn btn-secondary" @click="closeEditor">{{ t('common.cancel') }}</button>
          <button type="submit" form="benefit-campaign-form" class="btn btn-primary" :disabled="saving">
            {{ saving ? t('common.saving') : t('common.save') }}
          </button>
        </div>
      </template>
    </BaseDialog>

    <BaseDialog :show="showClaims" :title="claimsTitle" width="wide" @close="showClaims = false">
      <div v-if="claimsLoading" class="flex items-center justify-center py-8">
        <Icon name="refresh" size="lg" class="animate-spin text-gray-400" />
      </div>
      <div v-else-if="claims.length === 0" class="py-8 text-center text-gray-500 dark:text-gray-400">
        {{ t('admin.benefits.noClaims') }}
      </div>
      <div v-else class="space-y-3">
        <div
          v-for="claim in claims"
          :key="claim.id"
          class="rounded-lg border border-gray-200 p-3 dark:border-dark-600"
        >
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">
                {{ claim.user?.email || claim.user?.username || `#${claim.user_id}` }}
              </p>
              <p class="mt-1 text-xs text-gray-500 dark:text-dark-400">
                {{ formatDateTime(claim.claimed_at) }}
              </p>
            </div>
            <span class="badge badge-success">{{ formatCurrency(claim.granted_amount) }}</span>
          </div>
          <div class="mt-3 grid gap-2 text-xs text-gray-600 dark:text-gray-300 sm:grid-cols-3">
            <span>{{ t('admin.benefits.claims.eligible') }} {{ formatCurrency(claim.eligible_recharge_amount) }}</span>
            <span>{{ t('admin.benefits.claims.before') }} {{ formatCurrency(claim.balance_before) }}</span>
            <span>{{ t('admin.benefits.claims.after') }} {{ formatCurrency(claim.balance_after) }}</span>
          </div>
        </div>
        <Pagination
          v-if="claimsTotal > 0"
          :page="claimsPage"
          :total="claimsTotal"
          :page-size="claimsPageSize"
          @update:page="handleClaimsPageChange"
          @update:pageSize="handleClaimsPageSizeChange"
        />
      </div>
      <template #footer>
        <div class="flex justify-end">
          <button type="button" class="btn btn-secondary" @click="showClaims = false">{{ t('common.close') }}</button>
        </div>
      </template>
    </BaseDialog>

    <ConfirmDialog
      :show="showDeleteDialog"
      :title="t('admin.benefits.deleteCampaign')"
      :message="t('admin.benefits.deleteConfirm')"
      :confirm-text="t('common.delete')"
      :cancel-text="t('common.cancel')"
      danger
      @confirm="confirmDelete"
      @cancel="showDeleteDialog = false"
    />
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { adminAPI } from '@/api/admin'
import { useAppStore } from '@/stores/app'
import { getPersistedPageSize } from '@/composables/usePersistedPageSize'
import { formatCurrency, formatDateTime, formatDateTimeLocalInput, parseDateTimeLocalInput } from '@/utils/format'
import type { BenefitCampaign, BenefitCampaignCopy, BenefitClaim, BenefitRechargeScope, CreateBenefitCampaignRequest } from '@/types'
import type { Column } from '@/components/common/types'
import AppLayout from '@/components/layout/AppLayout.vue'
import TablePageLayout from '@/components/layout/TablePageLayout.vue'
import DataTable from '@/components/common/DataTable.vue'
import Pagination from '@/components/common/Pagination.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import BaseDialog from '@/components/common/BaseDialog.vue'
import Select from '@/components/common/Select.vue'
import Icon from '@/components/icons/Icon.vue'

type BooleanFilter = '' | 'true' | 'false'
type CopyStateKey = Exclude<keyof BenefitCampaignCopy, 'title' | 'description' | 'button'>

const { t } = useI18n()
const appStore = useAppStore()

const campaigns = ref<BenefitCampaign[]>([])
const loading = ref(false)
const saving = ref(false)
const searchQuery = ref('')
const editingCampaign = ref<BenefitCampaign | null>(null)
const deletingCampaign = ref<BenefitCampaign | null>(null)
const showEditor = ref(false)
const showDeleteDialog = ref(false)

const filters = reactive<{ enabled: BooleanFilter; visible: BooleanFilter }>({
  enabled: '',
  visible: ''
})

const pagination = reactive({
  page: 1,
  page_size: getPersistedPageSize(),
  total: 0
})

const sortState = reactive({
  sort_by: 'sort_order',
  sort_order: 'asc' as 'asc' | 'desc'
})

const emptyCopy = (): BenefitCampaignCopy => ({
  title: '',
  description: '',
  button: t('admin.benefits.defaults.button'),
  success: t('admin.benefits.defaults.success'),
  not_eligible: t('admin.benefits.defaults.notEligible'),
  not_started: t('admin.benefits.defaults.notStarted'),
  ended: t('admin.benefits.defaults.ended'),
  claimed: t('admin.benefits.defaults.claimed'),
  failed: t('admin.benefits.defaults.failed')
})

const form = reactive({
  name: '',
  enabled: true,
  visible: true,
  starts_at: '',
  ends_at: '',
  threshold_amount: 0,
  grant_amount: 0,
  recharge_scope: 'campaign_window' as BenefitRechargeScope,
  copy: emptyCopy(),
  sort_order: 0
})

const isEditing = computed(() => editingCampaign.value !== null)
const columns = computed<Column[]>(() => [
  { key: 'name', label: t('admin.benefits.columns.name'), sortable: true },
  { key: 'enabled', label: t('admin.benefits.columns.status'), sortable: true },
  { key: 'amounts', label: t('admin.benefits.columns.amounts') },
  { key: 'timeRange', label: t('admin.benefits.columns.timeRange') },
  { key: 'recharge_scope', label: t('admin.benefits.columns.scope'), sortable: true },
  { key: 'claim_count', label: t('admin.benefits.columns.claims'), sortable: true },
  { key: 'actions', label: t('admin.benefits.columns.actions') }
])

const enabledFilterOptions = computed(() => [
  { value: '', label: t('admin.benefits.filters.allEnabled') },
  { value: 'true', label: t('admin.benefits.enabled') },
  { value: 'false', label: t('admin.benefits.disabled') }
])

const visibleFilterOptions = computed(() => [
  { value: '', label: t('admin.benefits.filters.allVisible') },
  { value: 'true', label: t('admin.benefits.visible') },
  { value: 'false', label: t('admin.benefits.hidden') }
])

const scopeOptions = computed(() => [
  { value: 'campaign_window', label: t('admin.benefits.scopes.campaign_window') },
  { value: 'lifetime', label: t('admin.benefits.scopes.lifetime') }
])

const copyStateFields = computed<Array<{ key: CopyStateKey; label: string }>>(() => [
  { key: 'success', label: t('admin.benefits.form.copySuccess') },
  { key: 'not_eligible', label: t('admin.benefits.form.copyNotEligible') },
  { key: 'not_started', label: t('admin.benefits.form.copyNotStarted') },
  { key: 'ended', label: t('admin.benefits.form.copyEnded') },
  { key: 'claimed', label: t('admin.benefits.form.copyClaimed') },
  { key: 'failed', label: t('admin.benefits.form.copyFailed') }
])

const boolParam = (value: BooleanFilter) => value === '' ? undefined : value === 'true'

let abortController: AbortController | null = null
let searchTimeout: ReturnType<typeof setTimeout> | undefined

const loadCampaigns = async () => {
  abortController?.abort()
  const currentController = new AbortController()
  abortController = currentController
  loading.value = true
  try {
    const response = await adminAPI.benefits.list(
      pagination.page,
      pagination.page_size,
      {
        enabled: boolParam(filters.enabled),
        visible: boolParam(filters.visible),
        search: searchQuery.value || undefined,
        sort_by: sortState.sort_by,
        sort_order: sortState.sort_order
      },
      { signal: currentController.signal }
    )
    if (currentController.signal.aborted || abortController !== currentController) return
    campaigns.value = response.items
    pagination.total = response.total
  } catch (error: any) {
    if (currentController.signal.aborted || error?.name === 'AbortError' || error?.code === 'ERR_CANCELED') return
    appStore.showError(error.response?.data?.detail || t('admin.benefits.failedToLoad'))
  } finally {
    if (abortController === currentController) {
      loading.value = false
      abortController = null
    }
  }
}

const handleSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    pagination.page = 1
    loadCampaigns()
  }, 300)
}

const handleFilterChange = () => {
  pagination.page = 1
  loadCampaigns()
}

const handlePageChange = (page: number) => {
  pagination.page = page
  loadCampaigns()
}

const handlePageSizeChange = (pageSize: number) => {
  pagination.page_size = pageSize
  pagination.page = 1
  loadCampaigns()
}

const handleSort = (key: string, order: 'asc' | 'desc') => {
  sortState.sort_by = key
  sortState.sort_order = order
  pagination.page = 1
  loadCampaigns()
}

const resetForm = () => {
  form.name = ''
  form.enabled = true
  form.visible = true
  form.starts_at = ''
  form.ends_at = ''
  form.threshold_amount = 0
  form.grant_amount = 0
  form.recharge_scope = 'campaign_window'
  form.copy = emptyCopy()
  form.sort_order = 0
}

const openCreateDialog = () => {
  editingCampaign.value = null
  resetForm()
  showEditor.value = true
}

const openEditDialog = (campaign: BenefitCampaign) => {
  editingCampaign.value = campaign
  form.name = campaign.name
  form.enabled = campaign.enabled
  form.visible = campaign.visible
  form.starts_at = formatDateTimeLocalInput(Date.parse(campaign.starts_at) / 1000)
  form.ends_at = formatDateTimeLocalInput(Date.parse(campaign.ends_at) / 1000)
  form.threshold_amount = campaign.threshold_amount
  form.grant_amount = campaign.grant_amount
  form.recharge_scope = campaign.recharge_scope
  form.copy = { ...campaign.copy }
  form.sort_order = campaign.sort_order
  showEditor.value = true
}

const closeEditor = () => {
  showEditor.value = false
  editingCampaign.value = null
}

const formPayload = (): CreateBenefitCampaignRequest => {
  const startsAt = parseDateTimeLocalInput(form.starts_at)
  const endsAt = parseDateTimeLocalInput(form.ends_at)
  if (!startsAt || !endsAt) {
    throw new Error(t('admin.benefits.invalidTimeRange'))
  }
  return {
    name: form.name,
    enabled: form.enabled,
    visible: form.visible,
    starts_at: startsAt,
    ends_at: endsAt,
    threshold_amount: form.threshold_amount,
    grant_amount: form.grant_amount,
    recharge_scope: form.recharge_scope,
    copy: { ...form.copy },
    sort_order: form.sort_order
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    const payload = formPayload()
    if (editingCampaign.value) {
      await adminAPI.benefits.update(editingCampaign.value.id, payload)
      appStore.showSuccess(t('admin.benefits.campaignUpdated'))
    } else {
      await adminAPI.benefits.create(payload)
      appStore.showSuccess(t('admin.benefits.campaignCreated'))
    }
    closeEditor()
    loadCampaigns()
  } catch (error: any) {
    appStore.showError(error.response?.data?.detail || error.message || t('admin.benefits.failedToSave'))
  } finally {
    saving.value = false
  }
}

const handleDelete = (campaign: BenefitCampaign) => {
  deletingCampaign.value = campaign
  showDeleteDialog.value = true
}

const confirmDelete = async () => {
  if (!deletingCampaign.value) return
  try {
    await adminAPI.benefits.delete(deletingCampaign.value.id)
    appStore.showSuccess(t('admin.benefits.campaignDeleted'))
    showDeleteDialog.value = false
    deletingCampaign.value = null
    loadCampaigns()
  } catch (error: any) {
    appStore.showError(error.response?.data?.detail || t('admin.benefits.failedToDelete'))
  }
}

const showClaims = ref(false)
const claimsLoading = ref(false)
const claims = ref<BenefitClaim[]>([])
const claimsCampaign = ref<BenefitCampaign | null>(null)
const claimsPage = ref(1)
const claimsPageSize = ref(20)
const claimsTotal = ref(0)
const claimsTitle = computed(() =>
  claimsCampaign.value ? t('admin.benefits.claimRecordsFor', { name: claimsCampaign.value.name }) : t('admin.benefits.claimRecords')
)

const openClaimsDialog = async (campaign: BenefitCampaign) => {
  claimsCampaign.value = campaign
  claimsPage.value = 1
  showClaims.value = true
  await loadClaims()
}

const loadClaims = async () => {
  if (!claimsCampaign.value) return
  claimsLoading.value = true
  claims.value = []
  try {
    const response = await adminAPI.benefits.getClaims(claimsCampaign.value.id, claimsPage.value, claimsPageSize.value)
    claims.value = response.items
    claimsTotal.value = response.total
  } catch (error: any) {
    appStore.showError(error.response?.data?.detail || t('admin.benefits.failedToLoadClaims'))
  } finally {
    claimsLoading.value = false
  }
}

const handleClaimsPageChange = (page: number) => {
  claimsPage.value = page
  loadClaims()
}

const handleClaimsPageSizeChange = (pageSize: number) => {
  claimsPageSize.value = pageSize
  claimsPage.value = 1
  loadClaims()
}

onMounted(() => {
  loadCampaigns()
})

onUnmounted(() => {
  if (searchTimeout) clearTimeout(searchTimeout)
  abortController?.abort()
})
</script>
