<template>
  <div v-if="layoutVariant === 'split'" class="auth-split-shell">
    <section class="auth-split-form">
      <div class="auth-split-form-inner">
        <div class="mb-8 text-left">
          <template v-if="settingsLoaded">
            <div
              class="brand-surface mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl shadow-lg shadow-primary-500/10"
            >
              <img :src="siteLogo || '/logo.png'" alt="Logo" class="h-full w-full object-contain" />
            </div>
            <h1 class="text-gradient mb-2 text-3xl font-bold">
              {{ siteName }}
            </h1>
            <p class="max-w-sm text-sm text-gray-400">
              {{ siteSubtitle }}
            </p>
          </template>
        </div>

        <div class="auth-split-content">
          <slot />
        </div>

        <div class="mt-6 text-left text-sm">
          <slot name="footer" />
        </div>
      </div>
    </section>

    <div class="auth-split-divider" aria-hidden="true"></div>

    <aside class="auth-split-visual" aria-hidden="true">
      <slot name="visual">
        <div class="auth-brand-visual">
          <div class="auth-brand-visual__mark">
            <img :src="siteLogo || '/logo.png'" alt="" />
          </div>
          <div>
            <div class="auth-brand-visual__name">
              <span class="auth-brand-visual__typed">{{ siteName }}</span>
            </div>
            <p class="auth-brand-visual__subtitle">{{ siteSubtitle }}</p>
          </div>
        </div>
      </slot>
    </aside>
  </div>

  <div v-else class="app-auth-shell">
    <!-- Content Container -->
    <div class="relative z-10 w-full max-w-md">
      <!-- Logo/Brand -->
      <div class="mb-8 text-center">
        <!-- Custom Logo or Default Logo -->
        <template v-if="settingsLoaded">
          <div
            class="brand-surface mb-4 inline-flex h-16 w-16 items-center justify-center rounded-xl shadow-lg shadow-primary-500/20"
          >
            <img :src="siteLogo || '/logo.png'" alt="Logo" class="h-full w-full object-contain" />
          </div>
          <h1 class="text-gradient mb-2 text-3xl font-bold">
            {{ siteName }}
          </h1>
          <p class="text-sm text-slate-300">
            {{ siteSubtitle }}
          </p>
        </template>
      </div>

      <!-- Card Container -->
      <div class="card-glass rounded-xl p-8 shadow-glass">
        <slot />
      </div>

      <!-- Footer Links -->
      <div class="mt-6 text-center text-sm">
        <slot name="footer" />
      </div>

      <!-- Copyright -->
      <div class="mt-8 text-center text-xs text-slate-500">
        &copy; {{ currentYear }} {{ siteName }}. All rights reserved.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useAppStore } from '@/stores'
import { sanitizeUrl } from '@/utils/url'

const props = withDefaults(defineProps<{
  variant?: 'centered' | 'split'
}>(), {
  variant: 'split'
})

const appStore = useAppStore()

const siteName = computed(() => appStore.siteName || 'Hahacode')
const siteLogo = computed(() => sanitizeUrl(appStore.siteLogo || '', { allowRelative: true, allowDataUrl: true }))
const siteSubtitle = computed(() => appStore.cachedPublicSettings?.site_subtitle || 'Subscription to API Conversion Platform')
const settingsLoaded = computed(() => appStore.publicSettingsLoaded)
const layoutVariant = computed(() => props.variant)

const currentYear = computed(() => new Date().getFullYear())

onMounted(() => {
  appStore.fetchPublicSettings()
})
</script>

<style scoped>
.text-gradient {
  color: var(--auth-primary);
  background-image: none;
  -webkit-text-fill-color: currentColor;
}

.auth-split-shell {
  --auth-bg: #0d1117;
  --auth-bg-soft: #111820;
  --auth-bg-deep: #070a0f;
  --auth-surface: rgba(19, 25, 33, 0.92);
  --auth-surface-muted: rgba(30, 39, 50, 0.78);
  --auth-border: rgba(148, 163, 184, 0.14);
  --auth-primary: #f97316;
  --auth-primary-hover: #fb923c;
  --auth-primary-soft: rgba(249, 115, 22, 0.18);
  --auth-accent: #22d3ee;
  --auth-accent-soft: rgba(34, 211, 238, 0.12);
  --theme-bg: var(--auth-bg);
  --theme-bg-soft: var(--auth-bg-soft);
  --theme-bg-deep: var(--auth-bg-deep);
  --theme-surface: var(--auth-surface);
  --theme-surface-strong: #171f29;
  --theme-surface-muted: var(--auth-surface-muted);
  --theme-main-surface: #151b23;
  --theme-border: var(--auth-border);
  --theme-border-strong: rgba(148, 163, 184, 0.24);
  --theme-text-muted: #9aa7b5;
  --theme-primary: var(--auth-primary);
  --theme-primary-hover: var(--auth-primary-hover);
  --theme-primary-soft: var(--auth-primary-soft);
  --theme-accent: var(--auth-accent);
  --theme-accent-soft: var(--auth-accent-soft);
  position: relative;
  display: grid;
  min-height: 100vh;
  overflow-x: hidden;
  background:
    radial-gradient(circle at 16% 18%, rgba(34, 211, 238, 0.08), transparent 25rem),
    radial-gradient(circle at 84% 74%, rgba(249, 115, 22, 0.08), transparent 26rem),
    linear-gradient(180deg, var(--auth-bg-soft) 0%, var(--auth-bg-deep) 100%);
  color-scheme: dark;
  color: #ffffff;
}

.app-auth-shell {
  --auth-bg: #0d1117;
  --auth-bg-soft: #111820;
  --auth-bg-deep: #070a0f;
  --auth-surface: rgba(19, 25, 33, 0.92);
  --auth-surface-muted: rgba(30, 39, 50, 0.78);
  --auth-border: rgba(148, 163, 184, 0.14);
  --auth-primary: #f97316;
  --auth-primary-hover: #fb923c;
  --auth-primary-soft: rgba(249, 115, 22, 0.18);
  --auth-accent: #22d3ee;
  --auth-accent-soft: rgba(34, 211, 238, 0.12);
  --theme-bg: var(--auth-bg);
  --theme-bg-soft: var(--auth-bg-soft);
  --theme-bg-deep: var(--auth-bg-deep);
  --theme-surface: var(--auth-surface);
  --theme-surface-strong: #171f29;
  --theme-surface-muted: var(--auth-surface-muted);
  --theme-main-surface: #151b23;
  --theme-border: var(--auth-border);
  --theme-border-strong: rgba(148, 163, 184, 0.24);
  --theme-text-muted: #9aa7b5;
  --theme-primary: var(--auth-primary);
  --theme-primary-hover: var(--auth-primary-hover);
  --theme-primary-soft: var(--auth-primary-soft);
  --theme-accent: var(--auth-accent);
  --theme-accent-soft: var(--auth-accent-soft);
  color-scheme: dark;
  background:
    radial-gradient(circle at 16% 18%, rgba(34, 211, 238, 0.08), transparent 25rem),
    radial-gradient(circle at 84% 74%, rgba(249, 115, 22, 0.08), transparent 26rem),
    linear-gradient(180deg, var(--auth-bg-soft) 0%, var(--auth-bg-deep) 100%);
}

.auth-split-form {
  position: relative;
  z-index: 1;
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  padding: 3rem 2.75rem;
}

.auth-split-form-inner {
  margin-inline: auto;
  width: min(100%, 28rem);
}

.auth-split-content {
  width: 100%;
}

.auth-split-content :deep(h2),
.app-auth-shell :deep(h2),
.auth-split-shell :deep(.text-gray-900),
.app-auth-shell :deep(.text-gray-900) {
  color: #ffffff;
}

.auth-split-content :deep(.text-gray-500),
.app-auth-shell :deep(.text-gray-500),
.auth-split-content :deep(.text-gray-400),
.app-auth-shell :deep(.text-gray-400),
.auth-split-content :deep(.input-hint),
.app-auth-shell :deep(.input-hint) {
  color: #9aa7b5;
}

.auth-split-content :deep(.input-label),
.app-auth-shell :deep(.input-label) {
  color: #d4d4d4;
}

.auth-split-shell :deep(.text-primary-600),
.auth-split-shell :deep(.hover\:text-primary-500:hover),
.app-auth-shell :deep(.text-primary-600),
.app-auth-shell :deep(.hover\:text-primary-500:hover) {
  color: var(--auth-primary);
}

.auth-split-shell :deep(.bg-gray-200),
.app-auth-shell :deep(.bg-gray-200) {
  background: rgba(148, 163, 184, 0.14);
}

.auth-split-content :deep(.input) {
  border-color: transparent;
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.auth-split-content :deep(.input::placeholder) {
  color: rgba(255, 255, 255, 0.42);
}

.auth-split-content :deep(.input:focus) {
  border-color: color-mix(in srgb, var(--auth-accent) 46%, transparent);
  background: rgba(255, 255, 255, 0.1);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--auth-accent) 16%, transparent);
}

.auth-split-divider {
  position: absolute;
  bottom: 0;
  left: 40%;
  top: 0;
  z-index: 2;
  display: none;
  width: 1px;
  background: rgba(255, 255, 255, 0.12);
}

.auth-split-visual {
  position: relative;
  display: none;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  padding: clamp(5.5rem, 16vh, 7.2rem) clamp(4rem, 7vw, 7rem) 3rem;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.04), transparent 42%),
    linear-gradient(160deg, rgba(15, 23, 42, 0.28), rgba(34, 211, 238, 0.07));
}

.auth-split-visual::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.07) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.06) 1px, transparent 1px);
  background-size: 54px 54px;
  mask-image: linear-gradient(120deg, rgba(0, 0, 0, 0.9), transparent 72%);
}

.auth-brand-visual {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: clamp(1.25rem, 2vw, 2rem);
}

.auth-brand-visual__mark {
  display: flex;
  height: clamp(5.5rem, 9vw, 8rem);
  width: clamp(5.5rem, 9vw, 8rem);
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
}

.auth-brand-visual__mark img {
  height: 100%;
  width: 100%;
  object-fit: contain;
}

.auth-brand-visual__name {
  color: #ffffff;
  font-size: clamp(3rem, 7vw, 6.5rem);
  font-weight: 800;
  letter-spacing: 0;
  line-height: 1;
}

.auth-brand-visual__typed {
  display: inline-block;
  max-width: max-content;
  overflow: hidden;
  border-right: 0.08em solid var(--auth-primary);
  animation:
    auth-brand-type 1.45s steps(12, end) 0.25s forwards,
    auth-brand-caret 0.9s step-end infinite;
  vertical-align: bottom;
  white-space: nowrap;
  width: 0;
}

.auth-brand-visual__subtitle {
  margin-top: 1rem;
  max-width: 32rem;
  color: rgba(255, 255, 255, 0.58);
  font-size: 1rem;
  line-height: 1.7;
}

@keyframes auth-brand-type {
  from {
    width: 0;
  }

  to {
    width: 100%;
  }
}

@keyframes auth-brand-caret {
  0%,
  100% {
    border-color: transparent;
  }

  50% {
    border-color: var(--auth-primary);
  }
}

@media (min-width: 1024px) {
  .auth-split-shell {
    grid-template-columns: 40% minmax(0, 1fr);
  }

  .auth-split-visual {
    display: flex;
  }

  .auth-split-divider {
    display: block;
  }
}

@media (max-width: 1023px) {
  .auth-split-form {
    justify-content: center;
    padding: 4rem 2rem 3rem;
  }

  .auth-split-form-inner {
    margin-inline: auto;
  }
}

@media (max-width: 640px) {
  .auth-split-form {
    min-height: 100vh;
    padding: 4.5rem 1.5rem 2.5rem;
  }
}
</style>
