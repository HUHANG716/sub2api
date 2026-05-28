<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="show"
        class="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-[8vh] backdrop-blur-md"
        @click="$emit('close')"
      >
        <div
          class="w-full max-w-[620px] overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-dark-800 dark:ring-white/10"
          @click.stop
        >
          <div class="relative overflow-hidden border-b border-gray-100 bg-gray-50 px-6 py-5 dark:border-dark-700 dark:bg-dark-900">
            <div class="relative z-10 flex items-start justify-between">
              <div>
                <div class="flex items-center gap-2">
                  <div class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-500 text-white shadow-lg shadow-primary-500/30">
                    <Icon name="bell" size="sm" />
                  </div>
                  <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                    {{ t('announcements.title') }}
                  </h2>
                </div>
                <p v-if="unreadCount > 0" class="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  <span class="font-medium text-primary-600 dark:text-primary-400">{{ unreadCount }}</span>
                  {{ t('announcements.unread') }}
                </p>
              </div>
              <div class="flex items-center gap-2">
                <button
                  v-if="unreadCount > 0"
                  @click="$emit('mark-all-read')"
                  :disabled="loading"
                  class="rounded-lg bg-primary-500 px-4 py-2 text-xs font-medium text-white shadow-lg shadow-primary-500/30 transition-all hover:bg-primary-600 hover:shadow-xl disabled:opacity-50"
                >
                  {{ t('announcements.markAllRead') }}
                </button>
                <button
                  @click="$emit('close')"
                  class="flex h-9 w-9 items-center justify-center rounded-lg bg-white/50 text-gray-500 backdrop-blur-sm transition-all hover:bg-white hover:text-gray-700 dark:bg-dark-700/50 dark:text-gray-400 dark:hover:bg-dark-700 dark:hover:text-gray-300"
                  :aria-label="t('common.close')"
                >
                  <Icon name="x" size="sm" />
                </button>
              </div>
            </div>
          </div>

          <div class="max-h-[65vh] overflow-y-auto">
            <div v-if="loading" class="flex items-center justify-center py-16">
              <LoadingSpinner size="lg" />
            </div>

            <div v-else-if="announcements.length > 0">
              <button
                v-for="item in announcements"
                :key="item.id"
                type="button"
                class="group relative flex w-full items-center gap-4 border-b border-gray-100 px-6 py-4 text-left transition-all hover:bg-gray-50 dark:border-dark-700 dark:hover:bg-dark-700/30"
                :class="{ 'bg-primary-50/40 dark:bg-primary-950/20': !item.read_at }"
                style="min-height: 72px"
                @click="$emit('open-detail', item)"
              >
                <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center">
                  <div
                    v-if="!item.read_at"
                    class="relative flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500 text-white shadow-lg shadow-primary-500/30"
                  >
                    <span class="absolute inline-flex h-full w-full animate-ping rounded-xl bg-primary-400 opacity-75"></span>
                    <Icon name="infoCircle" size="md" class="relative z-10" :stroke-width="2.5" />
                  </div>
                  <div
                    v-else
                    class="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-400 dark:bg-dark-700 dark:text-gray-600"
                  >
                    <Icon name="checkCircle" size="md" :stroke-width="2" />
                  </div>
                </div>

                <div class="flex min-w-0 flex-1 items-center justify-between gap-4">
                  <div class="min-w-0 flex-1">
                    <h3 class="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {{ item.title }}
                    </h3>
                    <div class="mt-1 flex items-center gap-2">
                      <time class="text-xs text-gray-500 dark:text-gray-400">
                        {{ formatRelativeTime(item.created_at) }}
                      </time>
                      <span
                        v-if="!item.read_at"
                        class="inline-flex items-center gap-1 rounded-md bg-primary-100 px-1.5 py-0.5 text-xs font-medium text-primary-700 dark:bg-primary-950/40 dark:text-primary-300"
                      >
                        <span class="relative flex h-1.5 w-1.5">
                          <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-500 opacity-75"></span>
                          <span class="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary-600"></span>
                        </span>
                        {{ t('announcements.unread') }}
                      </span>
                    </div>
                  </div>

                  <Icon name="chevronRight" size="md" class="flex-shrink-0 text-gray-400 transition-transform group-hover:translate-x-1 dark:text-gray-600" />
                </div>

                <div
                  v-if="!item.read_at"
                  class="absolute left-0 top-0 h-full w-1 bg-primary-500"
                ></div>
              </button>
            </div>

            <div v-else class="flex flex-col items-center justify-center py-16">
              <div class="relative mb-4">
                <div class="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100 dark:bg-dark-700">
                  <Icon name="inbox" size="xl" class="text-gray-400 dark:text-gray-500" />
                </div>
                <div class="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-green-500 text-white">
                  <Icon name="check" size="xs" :stroke-width="3" />
                </div>
              </div>
              <p class="text-sm font-medium text-gray-900 dark:text-white">{{ t('announcements.empty') }}</p>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">{{ t('announcements.emptyDescription') }}</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { UserAnnouncement } from '@/types'
import { formatRelativeTime } from '@/utils/format'
import Icon from '@/components/icons/Icon.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'

defineProps<{
  show: boolean
  announcements: UserAnnouncement[]
  loading: boolean
  unreadCount: number
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'mark-all-read'): void
  (e: 'open-detail', announcement: UserAnnouncement): void
}>()

const { t } = useI18n()
</script>

<style scoped>
.modal-fade-enter-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-fade-leave-active {
  transition: all 0.2s cubic-bezier(0.4, 0, 1, 1);
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from > div {
  transform: scale(0.94) translateY(-12px);
  opacity: 0;
}

.modal-fade-leave-to > div {
  transform: scale(0.96) translateY(-8px);
  opacity: 0;
}
</style>
