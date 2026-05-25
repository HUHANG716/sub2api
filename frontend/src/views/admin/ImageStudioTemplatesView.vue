<template>
  <AppLayout>
    <TablePageLayout>
      <template #filters>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
            <div class="flex flex-1 flex-wrap items-center gap-3">
              <div class="relative w-full sm:w-72">
                <Icon
                  name="search"
                  size="md"
                  class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
                />
                <input
                  v-model="searchQuery"
                  type="text"
                  :placeholder="t('admin.imageStudioTemplates.searchPlaceholder')"
                  class="input pl-10"
                  @input="handleSearch"
                />
              </div>

              <Select
                v-model="statusFilter"
                :options="statusOptions"
                class="w-40"
                @change="loadTemplates"
              />

            </div>

            <div class="flex w-full flex-shrink-0 flex-wrap items-center justify-end gap-3 xl:w-auto">
              <button
                type="button"
                class="btn btn-secondary"
                :disabled="loading"
                :title="t('common.refresh')"
                @click="loadTemplates"
              >
                <Icon name="refresh" size="md" :class="loading ? 'animate-spin' : ''" />
              </button>
              <button
                type="button"
                class="btn btn-secondary"
                :disabled="selectedCount === 0 || bulkUpdating"
                @click="openBulkEditDialog"
              >
                <Icon name="edit" size="md" class="mr-2" />
                {{ t('admin.imageStudioTemplates.bulkEdit') }}
              </button>
              <button
                type="button"
                class="btn btn-primary"
                :disabled="importing"
                @click="handleImport"
              >
                <Icon name="download" size="md" class="mr-2" :class="importing ? 'animate-pulse' : ''" />
                {{ importing ? t('admin.imageStudioTemplates.importing') : t('admin.imageStudioTemplates.importGitHub') }}
              </button>
            </div>
          </div>

          <div v-if="selectedCount > 0" class="bulk-bar">
            <div class="flex min-w-0 items-center gap-3">
              <span class="bulk-count">
                {{ t('admin.imageStudioTemplates.selectedCount', { count: selectedCount }) }}
              </span>
              <button type="button" class="bulk-link" @click="clearSelection">
                {{ t('admin.imageStudioTemplates.clearSelection') }}
              </button>
            </div>
            <div class="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                class="btn btn-secondary"
                :disabled="bulkUpdating"
                @click="bulkSetEnabled(true)"
              >
                {{ t('admin.imageStudioTemplates.bulkEnable') }}
              </button>
              <button
                type="button"
                class="btn btn-secondary"
                :disabled="bulkUpdating"
                @click="bulkSetEnabled(false)"
              >
                {{ t('admin.imageStudioTemplates.bulkDisable') }}
              </button>
              <button
                type="button"
                class="btn btn-primary"
                :disabled="bulkUpdating"
                @click="openBulkEditDialog"
              >
                {{ t('admin.imageStudioTemplates.bulkEdit') }}
              </button>
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div class="template-stat">
              <span class="template-stat-label">{{ t('admin.imageStudioTemplates.total') }}</span>
              <strong>{{ allTemplates.length }}</strong>
            </div>
            <div class="template-stat">
              <span class="template-stat-label">{{ t('admin.imageStudioTemplates.draft') }}</span>
              <strong>{{ draftCount }}</strong>
            </div>
            <div class="template-stat">
              <span class="template-stat-label">{{ t('admin.imageStudioTemplates.enabled') }}</span>
              <strong>{{ enabledCount }}</strong>
            </div>
            <div class="template-stat">
              <span class="template-stat-label">{{ t('admin.imageStudioTemplates.imageErrors') }}</span>
              <strong>{{ imageErrorCount }}</strong>
            </div>
          </div>
        </div>
      </template>

      <template #table>
        <DataTable
          :columns="columns"
          :data="visibleTemplates"
          :loading="loading"
          row-key="id"
          default-sort-key="sort_order"
          default-sort-order="asc"
        >
          <template #header-select>
            <input
              type="checkbox"
              class="template-checkbox"
              :checked="allVisibleSelected"
              :indeterminate="someVisibleSelected"
              :aria-label="t('admin.imageStudioTemplates.selectAllVisible')"
              @change="toggleSelectAllVisible(($event.target as HTMLInputElement).checked)"
            />
          </template>

          <template #cell-select="{ row }">
            <input
              type="checkbox"
              class="template-checkbox"
              :checked="selectedIds.has(row.id)"
              :aria-label="t('admin.imageStudioTemplates.selectTemplate', { title: row.title })"
              @change="toggleSelect(row.id, ($event.target as HTMLInputElement).checked)"
            />
          </template>

          <template #cell-preview="{ row }">
            <button type="button" class="template-preview-button" @click="openDetail(row)">
              <img
                :src="row.image"
                :alt="row.title"
                class="h-16 w-16 rounded-md object-cover"
                loading="lazy"
              />
            </button>
          </template>

          <template #cell-title="{ row }">
            <div class="max-w-sm">
              <button
                type="button"
                class="text-left font-medium text-gray-900 hover:text-primary-600 dark:text-white dark:hover:text-primary-400"
                @click="openDetail(row)"
              >
                {{ row.title }}
              </button>
              <div class="mt-1 line-clamp-2 text-xs leading-5 text-gray-500 dark:text-dark-300">
                {{ row.prompt }}
              </div>
            </div>
          </template>

          <template #cell-source_name="{ row }">
            <a
              v-if="row.source_url"
              :href="row.source_url"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex max-w-[220px] items-center gap-1 truncate text-primary-600 hover:text-primary-700 dark:text-primary-400"
            >
              <span class="truncate">{{ row.source_name || row.source_type }}</span>
              <Icon name="externalLink" size="xs" />
            </a>
            <span v-else class="text-gray-500 dark:text-dark-400">{{ row.source_name || '-' }}</span>
          </template>

          <template #cell-tags="{ row }">
            <div class="flex max-w-[260px] flex-wrap gap-1">
              <span v-for="tag in row.tags?.slice(0, 3)" :key="tag" class="template-tag">{{ tag }}</span>
              <span v-if="(row.tags?.length || 0) > 3" class="template-tag">+{{ row.tags.length - 3 }}</span>
            </div>
          </template>

          <template #cell-enabled="{ row }">
            <div class="flex items-center gap-2">
              <Toggle :model-value="row.enabled" @update:modelValue="toggleEnabled(row, $event)" />
              <span class="text-xs" :class="row.enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-dark-400'">
                {{ row.enabled ? t('admin.imageStudioTemplates.enabled') : t('admin.imageStudioTemplates.draft') }}
              </span>
            </div>
          </template>

          <template #cell-image_download_error="{ row }">
            <span v-if="row.image_download_error" class="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
              <Icon name="exclamationTriangle" size="sm" />
              {{ t('admin.imageStudioTemplates.imageError') }}
            </span>
            <span v-else class="text-gray-400">-</span>
          </template>

          <template #cell-actions="{ row }">
            <div class="flex items-center gap-1">
              <button
                type="button"
                class="template-action"
                :title="t('admin.imageStudioTemplates.viewDetail')"
                @click="openDetail(row)"
              >
                <Icon name="eye" size="sm" />
                <span class="text-xs">{{ t('admin.imageStudioTemplates.detail') }}</span>
              </button>
              <button
                type="button"
                class="template-action"
                :title="t('admin.imageStudioTemplates.editTags')"
                @click="openTagDialog(row)"
              >
                <Icon name="edit" size="sm" />
                <span class="text-xs">{{ t('admin.imageStudioTemplates.tags') }}</span>
              </button>
            </div>
          </template>

          <template #empty>
            <EmptyState
              :title="t('admin.imageStudioTemplates.emptyTitle')"
              :description="t('admin.imageStudioTemplates.emptyDescription')"
              :action-text="t('admin.imageStudioTemplates.importGitHub')"
              @action="handleImport"
            />
          </template>
        </DataTable>
      </template>
    </TablePageLayout>

    <BaseDialog
      :show="!!selectedTemplate"
      :title="selectedTemplate?.title || t('admin.imageStudioTemplates.detail')"
      width="extra-wide"
      @close="selectedTemplate = null"
    >
      <div v-if="selectedTemplate" class="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div class="space-y-4">
          <img
            :src="selectedTemplate.image"
            :alt="selectedTemplate.title"
            class="aspect-square w-full rounded-lg object-cover"
          />
          <div class="grid gap-2 text-sm">
            <div class="template-meta-row">
              <span>{{ t('admin.imageStudioTemplates.status') }}</span>
              <strong>{{ selectedTemplate.enabled ? t('admin.imageStudioTemplates.enabled') : t('admin.imageStudioTemplates.draft') }}</strong>
            </div>
            <div class="template-meta-row">
              <span>{{ t('admin.imageStudioTemplates.model') }}</span>
              <strong>{{ selectedTemplate.model || '-' }}</strong>
            </div>
            <div class="template-meta-row">
              <span>{{ t('admin.imageStudioTemplates.author') }}</span>
              <strong>{{ selectedTemplate.author || '-' }}</strong>
            </div>
          </div>
        </div>

        <div class="min-w-0 space-y-5">
          <section>
            <h3 class="template-section-title">{{ t('admin.imageStudioTemplates.prompt') }}</h3>
            <pre class="template-prompt">{{ selectedTemplate.prompt }}</pre>
          </section>

          <section>
            <h3 class="template-section-title">{{ t('admin.imageStudioTemplates.source') }}</h3>
            <div class="space-y-2 text-sm text-gray-700 dark:text-dark-200">
              <div>{{ selectedTemplate.source_name || selectedTemplate.source_type }}</div>
              <a
                v-if="selectedTemplate.source_url"
                :href="selectedTemplate.source_url"
                target="_blank"
                rel="noopener noreferrer"
                class="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 dark:text-primary-400"
              >
                {{ selectedTemplate.source_url }}
                <Icon name="externalLink" size="xs" />
              </a>
              <div v-if="selectedTemplate.original_image_url" class="break-all text-xs text-gray-500 dark:text-dark-400">
                {{ t('admin.imageStudioTemplates.originalImage') }}: {{ selectedTemplate.original_image_url }}
              </div>
            </div>
          </section>

          <section v-if="selectedTemplate.tags?.length">
            <h3 class="template-section-title">{{ t('admin.imageStudioTemplates.tags') }}</h3>
            <div class="flex flex-wrap gap-2">
              <span v-for="tag in selectedTemplate.tags" :key="tag" class="template-tag">{{ tag }}</span>
            </div>
          </section>

          <section v-if="selectedTemplate.image_download_error">
            <h3 class="template-section-title text-red-600 dark:text-red-400">{{ t('admin.imageStudioTemplates.imageError') }}</h3>
            <p class="break-all text-sm text-red-600 dark:text-red-400">{{ selectedTemplate.image_download_error }}</p>
          </section>
        </div>
      </div>

      <template #footer>
        <div v-if="selectedTemplate" class="flex items-center justify-end gap-3">
          <button type="button" class="btn btn-secondary" @click="selectedTemplate = null">
            {{ t('common.close') }}
          </button>
          <button
            type="button"
            class="btn"
            :class="selectedTemplate.enabled ? 'btn-secondary' : 'btn-primary'"
            @click="toggleEnabled(selectedTemplate, !selectedTemplate.enabled)"
          >
            {{ selectedTemplate.enabled ? t('admin.imageStudioTemplates.disable') : t('admin.imageStudioTemplates.enable') }}
          </button>
        </div>
      </template>
    </BaseDialog>

    <BaseDialog
      :show="!!tagEditingTemplate"
      :title="tagEditingTemplate ? t('admin.imageStudioTemplates.editTagsTitle', { title: tagEditingTemplate.title }) : t('admin.imageStudioTemplates.editTags')"
      width="normal"
      @close="closeTagDialog"
    >
      <div v-if="tagEditingTemplate" class="space-y-4">
        <label class="bulk-field">
          <span class="bulk-field-label">{{ t('admin.imageStudioTemplates.tags') }}</span>
          <input
            v-model="tagEditValue"
            class="input"
            :placeholder="t('admin.imageStudioTemplates.tagsPlaceholder')"
          />
        </label>
        <div v-if="tagSuggestions.length" class="space-y-2">
          <p class="text-xs font-medium text-gray-500 dark:text-dark-400">{{ t('admin.imageStudioTemplates.tagSuggestions') }}</p>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="tag in tagSuggestions"
              :key="tag"
              type="button"
              class="template-tag-button"
              @click="appendTagToEditor(tag)"
            >
              {{ tag }}
            </button>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-3">
          <button type="button" class="btn btn-secondary" :disabled="tagUpdating" @click="closeTagDialog">
            {{ t('common.cancel') }}
          </button>
          <button type="button" class="btn btn-primary" :disabled="tagUpdating" @click="saveTagDialog">
            {{ tagUpdating ? t('admin.imageStudioTemplates.tagUpdating') : t('common.save') }}
          </button>
        </div>
      </template>
    </BaseDialog>

    <BaseDialog
      :show="showBulkEditDialog"
      :title="t('admin.imageStudioTemplates.bulkEditTitle')"
      width="wide"
      @close="closeBulkEditDialog"
    >
      <div class="space-y-5">
        <p class="text-sm text-gray-600 dark:text-dark-300">
          {{ t('admin.imageStudioTemplates.bulkEditDescription', { count: selectedCount }) }}
        </p>

        <div class="grid gap-4 md:grid-cols-2">
          <label class="bulk-field">
            <span class="bulk-field-label">{{ t('admin.imageStudioTemplates.status') }}</span>
            <Select v-model="bulkForm.enabled" :options="bulkStatusOptions" />
          </label>

          <label class="bulk-field">
            <span class="bulk-field-label">{{ t('admin.imageStudioTemplates.model') }}</span>
            <input
              v-model="bulkForm.model"
              class="input"
              :placeholder="t('admin.imageStudioTemplates.keepExisting')"
            />
          </label>

          <label class="bulk-field">
            <span class="bulk-field-label">{{ t('admin.imageStudioTemplates.tags') }}</span>
            <input
              v-model="bulkForm.tags"
              class="input"
              :placeholder="t('admin.imageStudioTemplates.tagsPlaceholder')"
            />
          </label>

          <label class="bulk-field">
            <span class="bulk-field-label">{{ t('admin.imageStudioTemplates.tagOperation') }}</span>
            <Select v-model="bulkForm.tagOperation" :options="tagOperationOptions" />
          </label>
        </div>

        <p class="rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800 dark:bg-amber-900/25 dark:text-amber-200">
          {{ t('admin.imageStudioTemplates.bulkEditHint') }}
        </p>
      </div>

      <template #footer>
        <div class="flex items-center justify-end gap-3">
          <button type="button" class="btn btn-secondary" :disabled="bulkUpdating" @click="closeBulkEditDialog">
            {{ t('common.cancel') }}
          </button>
          <button type="button" class="btn btn-primary" :disabled="bulkUpdating || !hasBulkPayload" @click="applyBulkEdit">
            {{ bulkUpdating ? t('admin.imageStudioTemplates.bulkUpdating') : t('admin.imageStudioTemplates.applyBulkEdit') }}
          </button>
        </div>
      </template>
    </BaseDialog>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import AppLayout from '@/components/layout/AppLayout.vue'
import TablePageLayout from '@/components/layout/TablePageLayout.vue'
import DataTable from '@/components/common/DataTable.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import Select from '@/components/common/Select.vue'
import Toggle from '@/components/common/Toggle.vue'
import BaseDialog from '@/components/common/BaseDialog.vue'
import Icon from '@/components/icons/Icon.vue'
import { adminAPI, type AdminImageStudioTemplate, type UpdateImageStudioTemplateRequest } from '@/api/admin'
import { useAppStore } from '@/stores'
import type { Column } from '@/components/common/types'

type StatusFilter = 'all' | 'draft' | 'enabled'
type SelectOption = { value: string; label: string }

const { t } = useI18n()
const appStore = useAppStore()

const loading = ref(false)
const importing = ref(false)
const bulkUpdating = ref(false)
const tagUpdating = ref(false)
const allTemplates = ref<AdminImageStudioTemplate[]>([])
const selectedTemplate = ref<AdminImageStudioTemplate | null>(null)
const tagEditingTemplate = ref<AdminImageStudioTemplate | null>(null)
const tagEditValue = ref('')
const selectedIds = ref<Set<number>>(new Set())
const showBulkEditDialog = ref(false)
const searchQuery = ref('')
const statusFilter = ref<StatusFilter>('draft')
const bulkForm = ref({
  enabled: 'keep',
  model: '',
  tags: '',
  tagOperation: 'replace',
})
let searchTimer: number | undefined

const columns = computed<Column[]>(() => [
  { key: 'select', label: '' },
  { key: 'preview', label: t('admin.imageStudioTemplates.preview') },
  { key: 'title', label: t('admin.imageStudioTemplates.template') },
  { key: 'model', label: t('admin.imageStudioTemplates.model') },
  { key: 'source_name', label: t('admin.imageStudioTemplates.source') },
  { key: 'tags', label: t('admin.imageStudioTemplates.tags') },
  { key: 'enabled', label: t('admin.imageStudioTemplates.status') },
  { key: 'image_download_error', label: t('admin.imageStudioTemplates.asset') },
  { key: 'actions', label: t('common.actions') },
])

const statusOptions = computed<SelectOption[]>(() => [
  { value: 'all', label: t('admin.imageStudioTemplates.allStatus') },
  { value: 'draft', label: t('admin.imageStudioTemplates.draft') },
  { value: 'enabled', label: t('admin.imageStudioTemplates.enabled') },
])

const bulkStatusOptions = computed<SelectOption[]>(() => [
  { value: 'keep', label: t('admin.imageStudioTemplates.keepExisting') },
  { value: 'enabled', label: t('admin.imageStudioTemplates.enabled') },
  { value: 'draft', label: t('admin.imageStudioTemplates.draft') },
])

const tagOperationOptions = computed<SelectOption[]>(() => [
  { value: 'replace', label: t('admin.imageStudioTemplates.tagOperationReplace') },
  { value: 'append', label: t('admin.imageStudioTemplates.tagOperationAppend') },
  { value: 'remove', label: t('admin.imageStudioTemplates.tagOperationRemove') },
])

const visibleTemplates = computed(() => {
  if (statusFilter.value === 'draft') {
    return allTemplates.value.filter((item) => !item.enabled)
  }
  if (statusFilter.value === 'enabled') {
    return allTemplates.value.filter((item) => item.enabled)
  }
  return allTemplates.value
})

const selectedCount = computed(() => selectedIds.value.size)
const visibleIds = computed(() => visibleTemplates.value.map((item) => item.id))
const allVisibleSelected = computed(
  () => visibleIds.value.length > 0 && visibleIds.value.every((id) => selectedIds.value.has(id)),
)
const someVisibleSelected = computed(
  () => !allVisibleSelected.value && visibleIds.value.some((id) => selectedIds.value.has(id)),
)
const draftCount = computed(() => allTemplates.value.filter((item) => !item.enabled).length)
const enabledCount = computed(() => allTemplates.value.filter((item) => item.enabled).length)
const imageErrorCount = computed(() => allTemplates.value.filter((item) => !!item.image_download_error).length)
const hasBulkPayload = computed(() => Object.keys(buildBulkPayload()).length > 0)
const allTags = computed(() => {
  const tags = new Set<string>()
  for (const template of allTemplates.value) {
    for (const tag of template.tags || []) {
      const clean = normalizeTag(tag)
      if (clean) tags.add(clean)
    }
  }
  return [...tags].sort((a, b) => a.localeCompare(b))
})
const tagSuggestions = computed(() => {
  const used = new Set(parseTags(tagEditValue.value))
  return allTags.value.filter((tag) => !used.has(tag)).slice(0, 24)
})

async function loadTemplates() {
  loading.value = true
  try {
    const response = await adminAPI.imageStudioTemplates.list({
      include_disabled: true,
      q: searchQuery.value.trim() || undefined,
    })
    allTemplates.value = response.items
    pruneSelection()
  } catch (error) {
    console.error('Failed to load image studio templates:', error)
    appStore.showError(t('admin.imageStudioTemplates.loadFailed'))
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  window.clearTimeout(searchTimer)
  searchTimer = window.setTimeout(() => {
    loadTemplates()
  }, 350)
}

async function handleImport() {
  importing.value = true
  try {
    const result = await adminAPI.imageStudioTemplates.importGitHub()
    appStore.showSuccess(
      t('admin.imageStudioTemplates.importSuccess', {
        created: result.created,
        updated: result.updated,
        images: result.image_downloaded,
      }),
      6000,
    )
    if (result.errors?.length) {
      appStore.showWarning(t('admin.imageStudioTemplates.importPartialErrors', { count: result.errors.length }), 6000)
    }
    await loadTemplates()
  } catch (error) {
    console.error('Failed to import image studio templates:', error)
    appStore.showError(t('admin.imageStudioTemplates.importFailed'))
  } finally {
    importing.value = false
  }
}

async function toggleEnabled(template: AdminImageStudioTemplate, enabled: boolean) {
  const previousEnabled = template.enabled
  template.enabled = enabled
  try {
    const updated = await adminAPI.imageStudioTemplates.update(template.id, { enabled })
    replaceTemplate(updated)
    if (selectedTemplate.value?.id === updated.id) {
      selectedTemplate.value = updated
    }
    appStore.showSuccess(enabled ? t('admin.imageStudioTemplates.enableSuccess') : t('admin.imageStudioTemplates.disableSuccess'))
  } catch (error) {
    console.error('Failed to update image studio template:', error)
    template.enabled = previousEnabled
    appStore.showError(t('admin.imageStudioTemplates.updateFailed'))
  }
}

function toggleSelect(id: number, selected: boolean) {
  const next = new Set(selectedIds.value)
  if (selected) {
    next.add(id)
  } else {
    next.delete(id)
  }
  selectedIds.value = next
}

function toggleSelectAllVisible(selected: boolean) {
  const next = new Set(selectedIds.value)
  for (const id of visibleIds.value) {
    if (selected) {
      next.add(id)
    } else {
      next.delete(id)
    }
  }
  selectedIds.value = next
}

function clearSelection() {
  selectedIds.value = new Set()
}

function pruneSelection() {
  const availableIds = new Set(allTemplates.value.map((item) => item.id))
  selectedIds.value = new Set([...selectedIds.value].filter((id) => availableIds.has(id)))
}

async function bulkSetEnabled(enabled: boolean) {
  await runBulkUpdate({ enabled }, enabled ? 'bulkEnableSuccess' : 'bulkDisableSuccess')
}

function openBulkEditDialog() {
  bulkForm.value = {
    enabled: 'keep',
    model: '',
    tags: '',
    tagOperation: 'replace',
  }
  showBulkEditDialog.value = true
}

function closeBulkEditDialog() {
  if (bulkUpdating.value) return
  showBulkEditDialog.value = false
}

async function applyBulkEdit() {
  const payload = buildBulkPayload()
  if (Object.keys(payload).length === 0) return
  await runBulkUpdate(payload, 'bulkEditSuccess')
  showBulkEditDialog.value = false
}

function buildBulkPayload(): UpdateImageStudioTemplateRequest {
  const payload: UpdateImageStudioTemplateRequest = {}
  if (bulkForm.value.enabled === 'enabled') {
    payload.enabled = true
  } else if (bulkForm.value.enabled === 'draft') {
    payload.enabled = false
  }

  const model = bulkForm.value.model.trim()
  if (model) {
    payload.model = model
  }

  const tags = parseTags(bulkForm.value.tags)
  if (tags.length > 0) {
    payload.tags = tags
  }

  return payload
}

async function runBulkUpdate(payload: UpdateImageStudioTemplateRequest, successKey: string) {
  if (selectedIds.value.size === 0) return
  bulkUpdating.value = true
  const ids = [...selectedIds.value]
  try {
    const updatedItems = await Promise.all(ids.map((id) => {
      const template = allTemplates.value.find((item) => item.id === id)
      const itemPayload = buildItemPayload(template, payload)
      return adminAPI.imageStudioTemplates.update(id, itemPayload)
    }))
    for (const updated of updatedItems) {
      replaceTemplate(updated)
    }
    if (selectedTemplate.value) {
      const updatedSelected = updatedItems.find((item) => item.id === selectedTemplate.value?.id)
      if (updatedSelected) {
        selectedTemplate.value = updatedSelected
      }
    }
    clearSelection()
    appStore.showSuccess(t(`admin.imageStudioTemplates.${successKey}`, { count: updatedItems.length }))
  } catch (error) {
    console.error('Failed to bulk update image studio templates:', error)
    appStore.showError(t('admin.imageStudioTemplates.bulkUpdateFailed'))
    await loadTemplates()
  } finally {
    bulkUpdating.value = false
  }
}

function buildItemPayload(template: AdminImageStudioTemplate | undefined, payload: UpdateImageStudioTemplateRequest): UpdateImageStudioTemplateRequest {
  const itemPayload: UpdateImageStudioTemplateRequest = { ...payload }
  if (payload.tags && template) {
    if (bulkForm.value.tagOperation === 'append') {
      itemPayload.tags = mergeTags(template.tags || [], payload.tags)
    } else if (bulkForm.value.tagOperation === 'remove') {
      const removeSet = new Set(payload.tags)
      itemPayload.tags = (template.tags || []).map(normalizeTag).filter((tag) => tag && !removeSet.has(tag))
    }
  }
  return itemPayload
}

function replaceTemplate(updated: AdminImageStudioTemplate) {
  const index = allTemplates.value.findIndex((item) => item.id === updated.id)
  if (index >= 0) {
    allTemplates.value.splice(index, 1, updated)
  }
}

function openDetail(template: AdminImageStudioTemplate) {
  selectedTemplate.value = template
}

function openTagDialog(template: AdminImageStudioTemplate) {
  tagEditingTemplate.value = template
  tagEditValue.value = (template.tags || []).join(', ')
}

function closeTagDialog() {
  if (tagUpdating.value) return
  tagEditingTemplate.value = null
  tagEditValue.value = ''
}

async function saveTagDialog() {
  if (!tagEditingTemplate.value) return
  tagUpdating.value = true
  try {
    const updated = await adminAPI.imageStudioTemplates.update(tagEditingTemplate.value.id, {
      tags: parseTags(tagEditValue.value),
    })
    replaceTemplate(updated)
    if (selectedTemplate.value?.id === updated.id) selectedTemplate.value = updated
    tagEditingTemplate.value = updated
    appStore.showSuccess(t('admin.imageStudioTemplates.tagUpdateSuccess'))
    closeTagDialog()
  } catch (error) {
    console.error('Failed to update image studio template tags:', error)
    appStore.showError(t('admin.imageStudioTemplates.tagUpdateFailed'))
  } finally {
    tagUpdating.value = false
  }
}

function appendTagToEditor(tag: string) {
  tagEditValue.value = mergeTags(parseTags(tagEditValue.value), [tag]).join(', ')
}

function normalizeTag(tag: string): string {
  return tag.trim().toLowerCase()
}

function parseTags(value: string): string[] {
  return mergeTags(value.split(/[,，\n]/), [])
}

function mergeTags(base: string[], extra: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const tag of [...base, ...extra]) {
    const clean = normalizeTag(tag)
    if (!clean || seen.has(clean)) continue
    seen.add(clean)
    out.push(clean)
  }
  return out
}

onMounted(loadTemplates)
</script>

<style scoped>
.template-stat {
  @apply rounded-lg border border-gray-200 bg-white px-4 py-3 dark:border-dark-700 dark:bg-dark-800;
}

.template-stat-label {
  @apply block text-xs font-medium uppercase text-gray-500 dark:text-dark-400;
}

.template-stat strong {
  @apply mt-1 block text-2xl font-semibold text-gray-900 dark:text-white;
}

.bulk-bar {
  @apply flex flex-col justify-between gap-3 rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 dark:border-primary-800 dark:bg-primary-900/20 md:flex-row md:items-center;
}

.bulk-count {
  @apply text-sm font-medium text-primary-900 dark:text-primary-100;
}

.bulk-link {
  @apply text-sm font-medium text-primary-700 hover:text-primary-800 dark:text-primary-300 dark:hover:text-primary-200;
}

.template-checkbox {
  @apply h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 dark:border-dark-500 dark:bg-dark-700;
}

.template-preview-button {
  @apply rounded-md outline-none ring-primary-500 transition focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-dark-800;
}

.template-tag {
  @apply inline-flex items-center rounded bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-700 dark:bg-dark-700 dark:text-dark-200;
}

.template-tag-button {
  @apply inline-flex items-center rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-700 transition hover:border-primary-300 hover:text-primary-700 dark:border-dark-600 dark:bg-dark-800 dark:text-dark-200 dark:hover:border-primary-700 dark:hover:text-primary-300;
}

.template-action {
  @apply flex flex-col items-center gap-0.5 rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-primary-600 dark:hover:bg-dark-700 dark:hover:text-primary-400;
}

.template-meta-row {
  @apply flex items-center justify-between gap-3 rounded-md bg-gray-50 px-3 py-2 dark:bg-dark-700/70;
}

.template-meta-row span {
  @apply text-gray-500 dark:text-dark-300;
}

.template-meta-row strong {
  @apply text-right font-medium text-gray-900 dark:text-white;
}

.template-section-title {
  @apply mb-2 text-sm font-semibold text-gray-900 dark:text-white;
}

.template-prompt {
  @apply max-h-72 whitespace-pre-wrap overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-6 text-gray-800 dark:border-dark-700 dark:bg-dark-800 dark:text-dark-100;
}

.bulk-field {
  @apply block space-y-1.5;
}

.bulk-field-label {
  @apply block text-sm font-medium text-gray-700 dark:text-dark-200;
}
</style>
