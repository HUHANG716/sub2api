<template>
  <span
    :class="[
      'inline-flex min-w-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
      badgeClass
    ]"
  >
    <!-- Platform logo -->
    <PlatformIcon v-if="platform" :platform="platform" size="sm" />
    <!-- Group name -->
    <span class="truncate">{{ name }}</span>
    <!-- Right side label -->
    <span v-if="showLabel" :class="labelClass">
      <template v-if="showDiscountRateLayout">
        <span class="flex flex-col items-start leading-tight">
          <span class="whitespace-nowrap">
            <span v-if="hasCustomRate" class="mr-0.5 line-through opacity-50">{{ rateMultiplier }}x</span>
            <span class="font-bold">{{ discountedRateLabel }}</span>
          </span>
          <span class="mt-0.5 whitespace-nowrap opacity-80">{{ globalDiscountLabel }}</span>
        </span>
      </template>
      <template v-else-if="hasCustomRate">
        <!-- 原倍率删除线 + 专属倍率高亮 -->
        <span class="line-through opacity-50 mr-0.5">{{ rateMultiplier }}x</span>
        <span class="font-bold">{{ activeRateLabel }}</span>
      </template>
      <template v-else>
        {{ labelText }}
      </template>
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SubscriptionType, GroupPlatform } from '@/types'
import PlatformIcon from './PlatformIcon.vue'

interface Props {
  name: string
  platform?: GroupPlatform
  subscriptionType?: SubscriptionType
  rateMultiplier?: number
  userRateMultiplier?: number | null // 用户专属倍率
  globalDiscountRate?: number | null
  showRate?: boolean
  daysRemaining?: number | null // 剩余天数（订阅类型时使用）
  /**
   * 订阅分组默认在右侧 label 展示"订阅"或剩余天数；
   * 开启后订阅分组也改为显示倍率（保留订阅主题色 label，配合可用渠道这类
   * 只关心费率、不关心有效期的场景）。
   */
  alwaysShowRate?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  subscriptionType: 'standard',
  showRate: true,
  daysRemaining: null,
  userRateMultiplier: null,
  globalDiscountRate: null,
  alwaysShowRate: false
})

const i18n = useI18n()
const { t } = i18n

const isSubscription = computed(() => props.subscriptionType === 'subscription')

// 是否有专属倍率（且与默认倍率不同）
const hasCustomRate = computed(() => {
  return (
    props.userRateMultiplier !== null &&
    props.userRateMultiplier !== undefined &&
    props.rateMultiplier !== undefined &&
    props.userRateMultiplier !== props.rateMultiplier
  )
})

const activeRate = computed(() => hasCustomRate.value
  ? props.userRateMultiplier as number
  : props.rateMultiplier
)

const hasGlobalDiscount = computed(() => {
  const discountRate = props.globalDiscountRate
  return typeof discountRate === 'number'
    && Number.isFinite(discountRate)
    && discountRate > 0
    && discountRate < 1
})

function formatRate(value: number): string {
  return value.toFixed(3)
}

function formatDiscount(value: number): string {
  return String(Number((value * 10).toPrecision(10)))
}

function formatPercentOff(value: number): string {
  return String(Number(((1 - value) * 100).toPrecision(10)))
}

const globalDiscountLabel = computed(() => {
  if (!hasGlobalDiscount.value) return ''
  const locale = String(i18n.locale?.value ?? 'zh')
  if (locale.startsWith('en')) {
    return t('keys.globalDiscountPercentOffLabel', {
      percent: formatPercentOff(props.globalDiscountRate as number),
    })
  }
  return t('keys.globalDiscountRateLabel', {
    discount: formatDiscount(props.globalDiscountRate as number),
  })
})

const activeRateLabel = computed(() => {
  const rate = activeRate.value
  if (rate === undefined) return ''
  if (!hasGlobalDiscount.value) return `${formatRate(rate)}x`
  return t('keys.effectiveRateWithDiscount', {
    base: formatRate(rate),
    effective: formatRate(rate * (props.globalDiscountRate as number)),
    discountLabel: globalDiscountLabel.value,
  })
})

const discountedRateLabel = computed(() => {
  const rate = activeRate.value
  if (rate === undefined || !hasGlobalDiscount.value) return ''
  return `${formatRate(rate)}x → ${formatRate(rate * (props.globalDiscountRate as number))}x`
})

const showDiscountRateLayout = computed(() => {
  return hasGlobalDiscount.value
    && activeRate.value !== undefined
    && (!isSubscription.value || props.alwaysShowRate)
})

// 是否显示右侧标签
const showLabel = computed(() => {
  if (!props.showRate) return false
  // 订阅类型：显示天数或"订阅"
  if (isSubscription.value) return true
  // 标准类型：显示倍率（包括专属倍率）
  return props.rateMultiplier !== undefined || hasCustomRate.value
})

// Label text
const labelText = computed(() => {
  const rateLabel = activeRateLabel.value
  if (isSubscription.value && !props.alwaysShowRate) {
    // 如果有剩余天数，显示天数
    if (props.daysRemaining !== null && props.daysRemaining !== undefined) {
      if (props.daysRemaining <= 0) {
        return t('admin.users.expired')
      }
      return t('admin.users.daysRemaining', { days: props.daysRemaining })
    }
    // 否则显示"订阅"
    return t('groups.subscription')
  }
  return rateLabel
})

// Label style based on type and days remaining
const labelClass = computed(() => {
  const base = 'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold'

  if (!isSubscription.value) {
    // Standard: subtle background (不再为专属倍率使用不同的背景色)
    return `${base} bg-black/10 dark:bg-white/10`
  }

  // 订阅类型：根据剩余天数显示不同颜色
  if (props.daysRemaining !== null && props.daysRemaining !== undefined) {
    if (props.daysRemaining <= 0 || props.daysRemaining <= 3) {
      // 已过期或紧急（<=3天）：红色
      return `${base} bg-red-200/80 text-red-800 dark:bg-red-800/50 dark:text-red-300`
    }
    if (props.daysRemaining <= 7) {
      // 警告（<=7天）：橙色
      return `${base} bg-amber-200/80 text-amber-800 dark:bg-amber-800/50 dark:text-amber-300`
    }
  }

  // 正常状态或无天数：根据平台显示主题色
  if (props.platform === 'anthropic') {
    return `${base} bg-orange-200/60 text-orange-800 dark:bg-orange-800/40 dark:text-orange-300`
  }
  if (props.platform === 'openai') {
    return `${base} bg-emerald-200/60 text-emerald-800 dark:bg-emerald-800/40 dark:text-emerald-300`
  }
  if (props.platform === 'gemini') {
    return `${base} bg-blue-200/60 text-blue-800 dark:bg-blue-800/40 dark:text-blue-300`
  }
  return `${base} bg-violet-200/60 text-violet-800 dark:bg-violet-800/40 dark:text-violet-300`
})

// Badge color based on platform and subscription type
const badgeClass = computed(() => {
  if (props.platform === 'anthropic') {
    // Claude: orange theme
    return isSubscription.value
      ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
      : 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
  } else if (props.platform === 'openai') {
    // OpenAI: green theme
    return isSubscription.value
      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
      : 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
  }
  if (props.platform === 'gemini') {
    return isSubscription.value
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
      : 'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400'
  }
  // Fallback: original colors
  return isSubscription.value
    ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400'
    : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
})
</script>
