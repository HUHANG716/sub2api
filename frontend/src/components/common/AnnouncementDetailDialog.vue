<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="show && announcement"
        class="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-[6vh] backdrop-blur-md"
        @click="$emit('close')"
      >
        <div
          class="w-full max-w-[780px] overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 dark:bg-dark-800 dark:ring-white/10"
          @click.stop
        >
          <div class="relative overflow-hidden border-b border-gray-100 bg-gray-50 px-8 py-6 dark:border-dark-700 dark:bg-dark-900">
            <div class="relative z-10 flex items-start justify-between gap-4">
              <div class="min-w-0 flex-1">
                <div class="mb-3 flex items-center gap-2">
                  <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-500 text-white shadow-lg shadow-primary-500/30">
                    <Icon name="bell" size="md" />
                  </div>
                  <div class="flex items-center gap-2">
                    <span class="rounded-lg bg-primary-100 px-2.5 py-1 text-xs font-medium text-primary-700 dark:bg-primary-950/40 dark:text-primary-300">
                      {{ t('announcements.title') }}
                    </span>
                    <span
                      v-if="!announcement.read_at"
                      class="inline-flex items-center gap-1.5 rounded-lg bg-primary-500 px-2.5 py-1 text-xs font-medium text-white shadow-lg shadow-primary-500/30"
                    >
                      <span class="relative flex h-2 w-2">
                        <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75"></span>
                        <span class="relative inline-flex h-2 w-2 rounded-full bg-white"></span>
                      </span>
                      {{ t('announcements.unread') }}
                    </span>
                  </div>
                </div>

                <h2 class="mb-3 text-2xl font-bold leading-tight text-gray-900 dark:text-white">
                  {{ announcement.title }}
                </h2>

                <div class="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                  <div class="flex items-center gap-1.5">
                    <Icon name="clock" size="sm" />
                    <time>{{ formatRelativeWithDateTime(announcement.created_at) }}</time>
                  </div>
                  <div class="flex items-center gap-1.5">
                    <Icon name="eye" size="sm" />
                    <span>{{ announcement.read_at ? t('announcements.read') : t('announcements.unread') }}</span>
                  </div>
                </div>
              </div>

              <button
                @click="$emit('close')"
                class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/50 text-gray-500 backdrop-blur-sm transition-all hover:bg-white hover:text-gray-700 hover:shadow-lg dark:bg-dark-700/50 dark:text-gray-400 dark:hover:bg-dark-700 dark:hover:text-gray-300"
                :aria-label="t('common.close')"
              >
                <Icon name="x" size="md" />
              </button>
            </div>
          </div>

          <div class="max-h-[60vh] overflow-y-auto bg-white px-8 py-8 dark:bg-dark-800">
            <div class="relative">
              <div class="absolute bottom-0 left-0 top-0 w-1 rounded-full bg-primary-500"></div>
              <div class="pl-6">
                <div
                  class="markdown-body prose prose-sm max-w-none dark:prose-invert"
                  v-html="renderMarkdown(announcement.content)"
                ></div>
              </div>
            </div>
          </div>

          <div class="border-t border-gray-100 bg-gray-50/50 px-8 py-5 dark:border-dark-700 dark:bg-dark-900/30">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Icon name="infoCircle" size="sm" />
                <span>{{ announcement.read_at ? t('announcements.readStatus') : t('announcements.markReadHint') }}</span>
              </div>
              <div class="flex items-center gap-3">
                <button
                  @click="$emit('close')"
                  class="rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow dark:border-dark-600 dark:bg-dark-700 dark:text-gray-300 dark:hover:bg-dark-600"
                >
                  {{ t('common.close') }}
                </button>
                <button
                  v-if="!announcement.read_at"
                  @click="$emit('mark-read')"
                  class="rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-primary-500/30 transition-all hover:bg-primary-600 hover:scale-105 hover:shadow-xl"
                >
                  <span class="flex items-center gap-2">
                    <Icon name="check" size="sm" />
                    {{ t('announcements.markRead') }}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import { useI18n } from 'vue-i18n'
import { formatRelativeWithDateTime } from '@/utils/format'
import type { UserAnnouncement } from '@/types'
import Icon from '@/components/icons/Icon.vue'

defineProps<{
  show: boolean
  announcement: UserAnnouncement | null
}>()

defineEmits<{
  (e: 'close'): void
  (e: 'mark-read'): void
}>()

const { t } = useI18n()

marked.setOptions({
  breaks: true,
  gfm: true,
})

function renderMarkdown(content: string): string {
  if (!content) return ''
  const html = marked.parse(content) as string
  return DOMPurify.sanitize(html)
}
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

.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 4px;
}

.dark .overflow-y-auto::-webkit-scrollbar-thumb {
  background: #4b5563;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #64748b;
}

.dark .overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: #6b7280;
}
</style>

<style>
.markdown-body {
  @apply text-[15px] leading-[1.75];
  @apply text-gray-700 dark:text-gray-300;
}

.markdown-body h1 {
  @apply mb-6 mt-8 border-b border-gray-200 pb-3 text-3xl font-bold text-gray-900 dark:border-dark-600 dark:text-white;
}

.markdown-body h2 {
  @apply mb-4 mt-7 border-b border-gray-100 pb-2 text-2xl font-bold text-gray-900 dark:border-dark-700 dark:text-white;
}

.markdown-body h3 {
  @apply mb-3 mt-6 text-xl font-semibold text-gray-900 dark:text-white;
}

.markdown-body h4 {
  @apply mb-2 mt-5 text-lg font-semibold text-gray-900 dark:text-white;
}

.markdown-body p {
  @apply mb-4 leading-relaxed;
}

.markdown-body a {
  @apply font-medium text-blue-600 underline decoration-blue-600/30 decoration-2 underline-offset-2 transition-all hover:decoration-blue-600 dark:text-blue-400 dark:decoration-blue-400/30 dark:hover:decoration-blue-400;
}

.markdown-body ul,
.markdown-body ol {
  @apply mb-4 ml-6 space-y-2;
}

.markdown-body ul {
  @apply list-disc;
}

.markdown-body ol {
  @apply list-decimal;
}

.markdown-body li {
  @apply pl-2 leading-relaxed;
}

.markdown-body li::marker {
  @apply text-blue-600 dark:text-blue-400;
}

.markdown-body blockquote {
  @apply relative my-5 border-l-4 border-blue-500 bg-blue-50/50 py-3 pl-5 pr-4 italic text-gray-700 dark:border-blue-400 dark:bg-blue-900/10 dark:text-gray-300;
}

.markdown-body blockquote::before {
  content: '"';
  @apply absolute -left-1 top-0 font-serif text-5xl text-blue-500/20 dark:text-blue-400/20;
}

.markdown-body code {
  @apply rounded-lg bg-gray-100 px-2 py-1 font-mono text-[13px] text-pink-600 dark:bg-dark-700 dark:text-pink-400;
}

.markdown-body pre {
  @apply my-5 overflow-x-auto rounded-xl border border-gray-200 bg-gray-50 p-5 dark:border-dark-600 dark:bg-dark-900/50;
}

.markdown-body pre code {
  @apply bg-transparent p-0 text-[13px] text-gray-800 dark:text-gray-200;
}

.markdown-body hr {
  @apply my-8 border-0 border-t-2 border-gray-200 dark:border-dark-700;
}

.markdown-body table {
  @apply mb-5 w-full overflow-hidden rounded-lg border border-gray-200 dark:border-dark-600;
}

.markdown-body th,
.markdown-body td {
  @apply border-b border-r border-gray-200 px-4 py-3 text-left dark:border-dark-600;
}

.markdown-body th:last-child,
.markdown-body td:last-child {
  @apply border-r-0;
}

.markdown-body tr:last-child td {
  @apply border-b-0;
}

.markdown-body th {
  @apply bg-gray-50 font-semibold text-gray-900 dark:bg-dark-800 dark:text-white;
}

.markdown-body tbody tr {
  @apply transition-colors hover:bg-gray-50 dark:hover:bg-dark-700/30;
}

.markdown-body img {
  @apply my-5 max-w-full rounded-xl border border-gray-200 shadow-md dark:border-dark-600;
}

.markdown-body strong {
  @apply font-semibold text-gray-900 dark:text-white;
}

.markdown-body em {
  @apply italic text-gray-600 dark:text-gray-400;
}
</style>
