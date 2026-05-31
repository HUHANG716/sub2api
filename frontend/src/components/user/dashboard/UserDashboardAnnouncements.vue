<template>
  <div class="card flex h-full min-h-[16rem] flex-col overflow-hidden">
    <div class="flex min-h-[3.75rem] items-center justify-between gap-4 border-b border-gray-100 px-4 dark:border-dark-700/80">
      <div class="min-w-0">
        <div class="flex items-center gap-2">
          <span class="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-gray-600 dark:bg-dark-700 dark:text-dark-300">
            <Icon name="bell" size="sm" />
          </span>
          <h2 class="truncate text-sm font-semibold text-gray-950 dark:text-white">
            {{ t('announcements.title') }}
          </h2>
        </div>
        <p class="mt-1.5 truncate text-xs font-medium text-gray-500 dark:text-dark-400">
          {{ unreadHeadline }}
        </p>
      </div>

      <button
        v-if="unreadCount > 0"
        type="button"
        class="inline-flex h-8 flex-shrink-0 cursor-pointer items-center rounded-lg border border-gray-200 px-3 text-xs font-semibold text-gray-700 transition-colors hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700 dark:border-dark-600 dark:text-dark-200 dark:hover:border-primary-800/70 dark:hover:bg-primary-900/20 dark:hover:text-primary-300"
        @click="markAllAsRead"
      >
        {{ t('announcements.markAllRead') }}
      </button>
    </div>

    <div class="flex flex-1 flex-col bg-white/40 dark:bg-dark-900/10">
      <div v-if="loading" class="flex flex-1 items-center justify-center">
        <LoadingSpinner size="md" />
      </div>

      <template v-else-if="announcements.length > 0">
        <div class="flex flex-1 flex-col">
          <div class="flex-1">
            <button
              v-for="item in visibleAnnouncements"
              :key="item.id"
              type="button"
              class="group grid min-h-[3.25rem] w-full cursor-pointer grid-cols-[auto,minmax(0,1fr),auto] items-center gap-3 border-b border-gray-100 px-4 text-left transition-colors hover:bg-gray-50/90 focus:outline-none focus-visible:bg-gray-50 dark:border-dark-700/80 dark:hover:bg-dark-700/30 dark:focus-visible:bg-dark-700/30"
              @click="openDetail(item)"
            >
              <span
                class="h-2.5 w-2.5 rounded-full ring-4"
                :class="item.read_at ? 'bg-gray-300 ring-gray-100 dark:bg-dark-500 dark:ring-dark-800' : 'bg-emerald-500 ring-emerald-100 dark:bg-emerald-400 dark:ring-emerald-950/60'"
                :title="item.read_at ? t('announcements.read') : t('announcements.unread')"
              />
              <span class="min-w-0">
                <span
                  class="block truncate text-sm font-semibold leading-5 text-gray-900 group-hover:text-primary-700 dark:text-white dark:group-hover:text-primary-300"
                  :title="item.title"
                >
                  {{ item.title }}
                </span>
                <span class="mt-0.5 flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-dark-400 sm:hidden">
                  {{ formatAnnouncementRelativeTime(item.created_at) }}
                </span>
              </span>
              <span class="flex items-center gap-2">
                <span
                  v-if="!item.read_at"
                  class="hidden rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 sm:inline-flex"
                >
                  {{ t('announcements.unread') }}
                </span>
                <time
                  class="hidden flex-shrink-0 text-xs font-semibold text-gray-500 dark:text-dark-400 sm:block"
                  :title="formatAnnouncementDate(item.created_at)"
                >
                  {{ formatAnnouncementRelativeTime(item.created_at) }}
                </time>
                <Icon name="chevronRight" size="sm" class="hidden text-gray-300 transition-colors group-hover:text-gray-500 dark:text-dark-600 dark:group-hover:text-dark-300 sm:block" />
              </span>
            </button>
          </div>

          <div class="mt-auto flex min-h-[2.75rem] items-center justify-between gap-3 border-t border-gray-100 bg-gray-50/70 px-4 dark:border-dark-700/80 dark:bg-dark-800/30">
            <span class="text-xs font-medium text-gray-500 dark:text-dark-400">
              {{ announcements.length }} {{ t('announcements.total') }}
            </span>
            <button
              type="button"
              class="group inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-primary-700 transition-colors hover:text-primary-800 dark:text-primary-300 dark:hover:text-primary-200"
              @click="openList"
            >
              <span>{{ t('announcements.viewAllFull') }}</span>
              <Icon name="chevronRight" size="sm" class="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </template>

      <div v-else class="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <div class="mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-400 dark:border-dark-700 dark:bg-dark-800 dark:text-dark-400">
          <Icon name="inbox" size="md" />
        </div>
        <p class="text-sm font-semibold text-gray-900 dark:text-white">{{ t('announcements.empty') }}</p>
        <p class="mt-1 max-w-[16rem] text-xs leading-5 text-gray-500 dark:text-gray-400">{{ t('announcements.emptyDescription') }}</p>
      </div>
    </div>

    <AnnouncementDetailDialog
      :show="detailOpen"
      :announcement="selectedAnnouncement"
      @close="closeDetail"
      @mark-read="selectedAnnouncement && markAsReadAndClose(selectedAnnouncement.id)"
    />

    <AnnouncementListDialog
      :show="listOpen"
      :announcements="announcements"
      :loading="loading"
      :unread-count="unreadCount"
      @close="closeList"
      @mark-all-read="markAllAsRead"
      @open-detail="openDetail"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { useAnnouncementStore } from '@/stores/announcements'
import type { UserAnnouncement } from '@/types'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import Icon from '@/components/icons/Icon.vue'
import AnnouncementDetailDialog from '@/components/common/AnnouncementDetailDialog.vue'
import AnnouncementListDialog from '@/components/common/AnnouncementListDialog.vue'
import { formatRelativeTime } from '@/utils/format'

const { t } = useI18n()
const appStore = useAppStore()
const announcementStore = useAnnouncementStore()
const { announcements, loading } = storeToRefs(announcementStore)
const visibleAnnouncements = computed(() => announcements.value.slice(0, 5))
const unreadCount = computed(() => announcementStore.unreadCount)
const unreadHeadline = computed(() =>
  unreadCount.value > 0
    ? t('announcements.unreadCount', { count: unreadCount.value })
    : t('announcements.emptyUnread')
)
const detailOpen = ref(false)
const listOpen = ref(false)
const selectedAnnouncement = ref<UserAnnouncement | null>(null)

function formatAnnouncementDate(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatAnnouncementRelativeTime(value: string | null | undefined) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000
  return Date.now() - date.getTime() > sevenDaysMs
    ? formatAnnouncementDate(value)
    : formatRelativeTime(value)
}

function openDetail(item: UserAnnouncement) {
  selectedAnnouncement.value = item
  detailOpen.value = true
  if (!item.read_at) {
    void announcementStore.markAsRead(item.id)
  }
}

function closeDetail() {
  detailOpen.value = false
  selectedAnnouncement.value = null
}

async function markAsReadAndClose(id: number) {
  await announcementStore.markAsRead(id)
  closeDetail()
}

function openList() {
  listOpen.value = true
}

function closeList() {
  listOpen.value = false
}

async function markAllAsRead() {
  try {
    await announcementStore.markAllAsRead()
    appStore.showSuccess(t('announcements.allMarkedAsRead'))
  } catch (err: any) {
    appStore.showError(err?.message || t('common.unknownError'))
  }
}

function handleEscape(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (detailOpen.value) {
      closeDetail()
    } else if (listOpen.value) {
      closeList()
    }
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleEscape)
  document.body.style.overflow = ''
})

watch([detailOpen, listOpen, () => announcementStore.currentPopup], ([detail, list, popup]) => {
  document.body.style.overflow = detail || list || popup ? 'hidden' : ''
})
</script>
