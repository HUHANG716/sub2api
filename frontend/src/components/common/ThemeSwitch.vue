<template>
  <button
    type="button"
    role="switch"
    :aria-checked="isDark"
    :aria-label="isDark ? t('home.switchToLight') : t('home.switchToDark')"
    :title="isDark ? t('home.switchToLight') : t('home.switchToDark')"
    class="theme-switch"
    @click="toggleTheme"
  >
    <span class="theme-switch-icon-wrap" aria-hidden="true">
      <Icon :name="isDark ? 'sun' : 'moon'" size="sm" :stroke-width="1.8" />
    </span>
  </button>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useTheme } from '@/composables/useTheme'
import Icon from '@/components/icons/Icon.vue'

const { t } = useI18n()
const { isDark, toggleTheme } = useTheme()
</script>

<style scoped>
.theme-switch {
  display: inline-flex;
  height: 2.25rem;
  width: 2.25rem;
  align-items: center;
  justify-content: center;
  border-radius: 0.625rem;
  border: 1px solid var(--theme-border);
  background: color-mix(in srgb, var(--theme-surface-muted) 86%, transparent);
  padding: 0.25rem 0.5rem;
  color: var(--theme-text-muted);
  box-shadow: var(--theme-shadow);
  transition:
    border-color 0.2s ease,
    background 0.2s ease,
    color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease;
}

.theme-switch:hover {
  border-color: var(--theme-border-strong);
  background: color-mix(in srgb, var(--theme-surface-strong) 88%, var(--theme-accent-soft));
  color: color-mix(in srgb, var(--theme-text-muted) 55%, var(--theme-accent));
  box-shadow: var(--theme-shadow-hover);
}

.theme-switch:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--theme-accent) 55%, transparent);
  outline-offset: 2px;
}

.theme-switch:active {
  transform: scale(0.97);
}

.theme-switch-icon-wrap {
  display: inline-flex;
  height: 1.25rem;
  width: 1.25rem;
  align-items: center;
  justify-content: center;
}

</style>
