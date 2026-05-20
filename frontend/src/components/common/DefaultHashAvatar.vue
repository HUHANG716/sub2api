<template>
  <span
    data-testid="default-hash-avatar"
    class="default-hash-avatar block h-full w-full"
    role="img"
    :aria-label="label || undefined"
    v-html="svgMarkup"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { toSvg, type JdenticonConfig } from 'jdenticon/browser'

const props = withDefaults(defineProps<{
  seed?: string | number | null
  label?: string
  size?: number
}>(), {
  label: '',
  size: 64
})

const identiconConfig: JdenticonConfig = {
  padding: 0.08,
  saturation: {
    color: 0.62,
    grayscale: 0.18
  },
  lightness: {
    color: [0.34, 0.7],
    grayscale: [0.32, 0.82]
  },
  backColor: '#ffffff00'
}

const normalizedSeed = computed(() => {
  const seed = String(props.seed ?? '').trim()
  return seed || 'user:anonymous'
})

const svgMarkup = computed(() => toSvg(normalizedSeed.value, props.size, identiconConfig))
</script>

<style scoped>
.default-hash-avatar :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
