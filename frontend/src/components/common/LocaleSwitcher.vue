<template>
  <div class="locale-switcher" ref="dropdownRef">
    <button
      data-testid="locale-switcher-trigger"
      type="button"
      @click="toggleDropdown"
      class="locale-trigger"
      :class="{ 'locale-trigger-icon-only': iconOnly }"
      :aria-label="t('locale.switchTo')"
      aria-haspopup="menu"
      :aria-expanded="isOpen"
      :title="t('locale.switchTo')"
    >
      <span class="locale-trigger-icon" aria-hidden="true">
        <Icon name="globe" size="sm" />
      </span>
      <span class="locale-trigger-value" :class="{ 'locale-trigger-value-hidden': iconOnly }">
        {{ currentLocaleLabel }}
      </span>
      <Icon
        v-if="!switching && !iconOnly"
        name="chevronDown"
        size="xs"
        class="locale-chevron"
        :class="{ 'rotate-180': isOpen }"
      />
    </button>

    <transition name="dropdown">
      <div
        v-if="isOpen"
        data-testid="locale-switcher-menu"
        class="locale-menu"
        role="menu"
        :aria-label="t('locale.switchTo')"
      >
        <button
          v-for="locale in availableLocales"
          :key="locale.code"
          :data-testid="`locale-option-${locale.code}`"
          type="button"
          @click="selectLocale(locale.code)"
          class="locale-option"
          :class="{ 'is-active': locale.code === currentLocaleCode }"
          role="menuitemradio"
          :aria-checked="locale.code === currentLocaleCode"
        >
          <span class="locale-option-label">{{ getLocaleLabel(locale.code) }}</span>
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

defineProps<{
  iconOnly?: boolean
}>()

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
  min-height: 2.25rem;
  align-items: center;
  gap: 0.42rem;
  border: 0;
  border-radius: 999px;
  background: transparent;
  padding: 0.28rem 0.58rem;
  color: var(--locale-text);
  transition:
    color 180ms ease;
}

.locale-trigger:hover,
.locale-trigger[aria-expanded='true'] {
  color: var(--locale-text-strong);
}

.locale-trigger:focus-visible {
  outline: 2px solid rgba(249, 115, 22, 0.8);
  outline-offset: 3px;
}

.locale-trigger-icon {
  display: inline-flex;
  height: 1rem;
  width: 1rem;
  align-items: center;
  justify-content: center;
  color: currentColor;
}

.locale-trigger-icon-only {
  width: 2.25rem;
  justify-content: center;
  gap: 0;
  padding: 0;
}

.locale-trigger-value-hidden {
  display: none;
}

.locale-trigger-value {
  max-width: 4.6rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1;
}

.locale-chevron {
  color: var(--theme-text-muted);
  transition: transform 180ms ease;
}

.locale-menu {
  position: absolute;
  right: 0;
  z-index: 50;
  margin-top: 0.45rem;
  width: 10.5rem;
  overflow: hidden;
  border: 1px solid var(--theme-border);
  border-radius: 0.7rem;
  background: var(--theme-surface);
  box-shadow: var(--theme-shadow-hover);
  backdrop-filter: blur(16px);
}

.locale-option {
  display: flex;
  min-height: 2.5rem;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
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

.locale-option-label {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.84rem;
  font-weight: 700;
}

.locale-option-check {
  flex: 0 0 auto;
  color: #f97316;
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
