import { onMounted, onUnmounted, ref } from 'vue'

const isDark = ref(
  typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
)
let themeObserver: MutationObserver | null = null
let consumerCount = 0

function syncThemeFromDocument() {
  isDark.value = document.documentElement.classList.contains('dark')
}

function setTheme(dark: boolean) {
  isDark.value = dark
  document.documentElement.classList.toggle('dark', dark)
  localStorage.setItem('theme', dark ? 'dark' : 'light')
}

function handleStorage(event: StorageEvent) {
  if (event.key === 'theme') {
    const dark = event.newValue === 'dark'
    isDark.value = dark
    document.documentElement.classList.toggle('dark', dark)
  }
}

function startThemeSync() {
  if (themeObserver) return

  syncThemeFromDocument()
  themeObserver = new MutationObserver(syncThemeFromDocument)
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  })
  window.addEventListener('storage', handleStorage)
}

function stopThemeSync() {
  if (!themeObserver) return

  themeObserver.disconnect()
  themeObserver = null
  window.removeEventListener('storage', handleStorage)
}

export function useTheme() {
  onMounted(() => {
    consumerCount += 1
    startThemeSync()
  })

  onUnmounted(() => {
    consumerCount -= 1
    if (consumerCount <= 0) {
      consumerCount = 0
      stopThemeSync()
    }
  })

  function toggleTheme() {
    setTheme(!isDark.value)
  }

  return {
    isDark,
    setTheme,
    toggleTheme,
  }
}
