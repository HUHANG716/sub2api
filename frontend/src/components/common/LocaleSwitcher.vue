<template>
  <div class="locale-switcher" ref="dropdownRef">
    <button
      data-testid="locale-switcher-trigger"
      type="button"
      @click="toggleDropdown"
      :disabled="switching"
      class="locale-trigger"
      :aria-label="t('locale.switchTo')"
      aria-haspopup="menu"
      :aria-expanded="isOpen"
      :title="t('locale.switchTo')"
    >
      <span class="locale-trigger-icon" aria-hidden="true">
        <Icon name="globe" size="sm" />
      </span>
      <span class="locale-trigger-copy">
        <span class="locale-trigger-label">{{ t('locale.label') }}</span>
        <span class="locale-trigger-value">{{ currentLocaleLabel }}</span>
      </span>
      <Icon
        v-if="!switching"
        name="chevronDown"
        size="xs"
        class="locale-chevron"
        :class="{ 'rotate-180': isOpen }"
      />
      <span v-else class="locale-spinner" :aria-label="t('locale.loading')"></span>
    </button>

    <transition name="dropdown">
      <div
        v-if="isOpen"
        data-testid="locale-switcher-menu"
        class="locale-menu"
        role="menu"
        :aria-label="t('locale.switchTo')"
      >
        <div class="locale-menu-header">
          <span>{{ t('locale.current') }}</span>
          <strong>{{ currentLocaleLabel }}</strong>
        </div>
        <button
          v-for="locale in availableLocales"
          :key="locale.code"
          :data-testid="`locale-option-${locale.code}`"
          type="button"
          :disabled="switching"
          @click="selectLocale(locale.code)"
          class="locale-option"
          :class="{ 'is-active': locale.code === currentLocaleCode }"
          role="menuitemradio"
          :aria-checked="locale.code === currentLocaleCode"
        >
          <span class="locale-option-code">{{ locale.code.toUpperCase() }}</span>
          <span class="locale-option-copy">
            <strong>{{ getLocaleLabel(locale.code) }}</strong>
            <em>{{ getLocaleDescription(locale.code) }}</em>
          </span>
          <Icon v-if="locale.code === currentLocaleCode" name="check" size="sm" class="locale-option-check" />
        </button>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '@/components/icons/Icon.vue'
import { setLocale, availableLocales } from '@/i18n'

const { locale, t } = useI18n()

const isOpen = ref(false)
const dropdownRef = ref<HTMLElement | null>(null)
const switching = ref(false)

const currentLocaleCode = computed(() => locale.value)
const currentLocale = computed(() => availableLocales.find((l) => l.code === locale.value))
const currentLocaleLabel = computed(() => getLocaleLabel(currentLocale.value?.code ?? currentLocaleCode.value))

function getLocaleLabel(code: string) {
  return t(`locale.${code}.nativeName`)
}

function getLocaleDescription(code: string) {
  return t(`locale.${code}.description`)
}

function toggleDropdown() {
  if (switching.value) {
    return
  }
  isOpen.value = !isOpen.value
}

async function selectLocale(code: string) {
  if (switching.value || code === currentLocaleCode.value) {
    isOpen.value = false
    return
  }
  switching.value = true
  try {
    await setLocale(code)
    isOpen.value = false
  } finally {
    switching.value = false
  }
}

function handleClickOutside(event: MouseEvent) {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    isOpen.value = false
  }
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    isOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
  document.addEventListener('keydown', handleEscape)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
  document.removeEventListener('keydown', handleEscape)
})
</script>

<style scoped>
.locale-switcher {
  --locale-text: #334155;
  --locale-text-strong: #0f172a;
  --locale-code-bg: var(--theme-surface-muted);
  --locale-hover-bg: var(--theme-surface-muted);
  --locale-active-bg: rgba(249, 115, 22, 0.1);
  --locale-active-text: #c2410c;
  position: relative;
}

.dark .locale-switcher {
  --locale-text: #e2e8f0;
  --locale-text-strong: #ffffff;
  --locale-code-bg: rgba(148, 163, 184, 0.14);
  --locale-active-bg: rgba(249, 115, 22, 0.16);
  --locale-active-text: #fed7aa;
}

.locale-trigger {
  display: inline-flex;
  min-height: 2.4rem;
  align-items: center;
  gap: 0.45rem;
  border: 1px solid var(--theme-border);
  border-radius: 999px;
  background: var(--theme-surface-muted);
  padding: 0.22rem 0.38rem 0.22rem 0.28rem;
  color: var(--locale-text);
  transition:
    border-color 180ms ease,
    background-color 180ms ease,
    color 180ms ease;
}

.locale-trigger:hover,
.locale-trigger[aria-expanded='true'] {
  border-color: rgba(249, 115, 22, 0.48);
  background: var(--theme-surface);
  color: var(--locale-text-strong);
}

.locale-trigger:focus-visible {
  outline: 2px solid rgba(249, 115, 22, 0.8);
  outline-offset: 3px;
}

.locale-trigger:disabled {
  cursor: wait;
  opacity: 0.72;
}

.locale-trigger-icon {
  display: inline-flex;
  height: 1.85rem;
  width: 1.85rem;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: #f97316;
  color: #ffffff;
}

.locale-trigger-copy {
  display: none;
  min-width: 0;
  text-align: left;
}

.locale-trigger-label,
.locale-trigger-value {
  display: block;
  line-height: 1.05;
}

.locale-trigger-label {
  color: var(--theme-text-muted);
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0;
}

.locale-trigger-value {
  margin-top: 0.05rem;
  max-width: 4.6rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.76rem;
  font-weight: 800;
}

.locale-chevron {
  color: var(--theme-text-muted);
  transition: transform 180ms ease;
}

.locale-spinner {
  height: 0.85rem;
  width: 0.85rem;
  border: 2px solid rgba(249, 115, 22, 0.22);
  border-top-color: #f97316;
  border-radius: 999px;
  animation: locale-spin 700ms linear infinite;
}

.locale-menu {
  position: absolute;
  right: 0;
  z-index: 50;
  margin-top: 0.45rem;
  width: 14.5rem;
  overflow: hidden;
  border: 1px solid var(--theme-border);
  border-radius: 0.75rem;
  background: var(--theme-surface);
  box-shadow: var(--theme-shadow-hover);
  backdrop-filter: blur(16px);
}

.locale-menu-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-bottom: 1px solid var(--theme-border);
  padding: 0.62rem 0.75rem;
  color: var(--theme-text-muted);
  font-size: 0.7rem;
  font-weight: 700;
}

.locale-menu-header strong {
  color: var(--locale-text-strong);
  font-size: 0.74rem;
}

.locale-option {
  display: flex;
  min-height: 3.35rem;
  width: 100%;
  align-items: center;
  gap: 0.58rem;
  padding: 0.55rem 0.72rem;
  color: var(--locale-text);
  text-align: left;
  transition:
    background-color 160ms ease,
    color 160ms ease;
}

.locale-option:hover {
  background: var(--locale-hover-bg);
}

.locale-option:focus-visible {
  outline: 2px solid rgba(249, 115, 22, 0.8);
  outline-offset: -3px;
}

.locale-option.is-active {
  background: var(--locale-active-bg);
  color: var(--locale-active-text);
}

.locale-option-code {
  display: inline-flex;
  height: 1.95rem;
  width: 1.95rem;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: 0.55rem;
  background: var(--locale-code-bg);
  color: var(--locale-text-strong);
  font-size: 0.66rem;
  font-weight: 900;
  letter-spacing: 0;
}

.locale-option.is-active .locale-option-code {
  background: #f97316;
  color: #ffffff;
}

.locale-option-copy {
  min-width: 0;
  flex: 1;
}

.locale-option-copy strong,
.locale-option-copy em {
  display: block;
}

.locale-option-copy strong {
  font-size: 0.84rem;
  font-weight: 850;
}

.locale-option-copy em {
  margin-top: 0.08rem;
  color: var(--theme-text-muted);
  font-size: 0.7rem;
  font-style: normal;
  line-height: 1.25;
}

.locale-option-check {
  color: #f97316;
}

.dark .locale-trigger:hover,
.dark .locale-trigger[aria-expanded='true'] {
  border-color: rgba(249, 115, 22, 0.58);
}

@media (min-width: 640px) {
  .locale-trigger {
    padding-right: 0.58rem;
  }

  .locale-trigger-copy {
    display: block;
  }
}

@keyframes locale-spin {
  to {
    transform: rotate(360deg);
  }
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition:
    opacity 160ms ease,
    transform 160ms ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-0.35rem) scale(0.98);
}
</style>
