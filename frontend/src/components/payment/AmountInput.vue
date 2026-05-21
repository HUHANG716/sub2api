<template>
  <div class="space-y-4">
    <!-- Quick Amount Buttons -->
    <div>
      <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ t('payment.quickAmounts') }}
      </label>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="option in filteredAmountOptions"
          :key="option.amount"
          type="button"
          :class="[
            'payment-option-button',
            modelValue === option.amount
              ? 'payment-option-button-active'
              : 'payment-option-button-inactive',
            option.badge ? 'payment-option-button-with-badge' : '',
          ]"
          @click="selectAmount(option.amount)"
        >
          <span v-if="amountPrefixLabel" class="payment-option-caption">
            {{ amountPrefixLabel }}
          </span>
          <span class="payment-option-amount">{{ formatAmount(option.amount) }}</span>
          <span v-if="option.badge" class="payment-option-badge">
            <template v-if="typeof option.badge === 'string'">
              {{ option.badge }}
            </template>
            <template v-else>
              <span class="payment-option-badge-total-line">
                <span class="payment-option-badge-label">{{ option.badge.label }}</span>
                <span class="payment-option-badge-total">{{ option.badge.total }}</span>
              </span>
              <span v-if="option.badge.bonus" class="payment-option-badge-breakdown">
                <span class="payment-option-badge-bonus">{{ option.badge.bonus }}</span>
              </span>
            </template>
          </span>
        </button>
      </div>
    </div>

    <!-- Custom Amount Input -->
    <div>
      <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ t('payment.customAmount') }}
      </label>
      <div class="relative">
        <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-dark-500">
          {{ inputPrefix }}
        </span>
        <input
          type="text"
          inputmode="decimal"
          :value="customText"
          :placeholder="placeholderText"
          class="input w-full py-3 pl-8 pr-4"
          @input="handleInput"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'

type AmountBadge = string | {
  label: string
  total: string
  bonus?: string
}

const props = withDefaults(defineProps<{
  amounts?: number[]
  modelValue: number | null
  min?: number
  max?: number
  amountBadges?: Record<number, AmountBadge>
  amountFormatter?: (amount: number) => string
  amountPrefixLabel?: string
  inputPrefix?: string
}>(), {
  amounts: () => [10, 20, 50, 100, 200, 500, 1000, 2000, 5000],
  min: 0,
  max: 0,
  amountBadges: () => ({}),
  amountFormatter: undefined,
  amountPrefixLabel: '',
  inputPrefix: '$',
})

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const { t } = useI18n()

const customText = ref('')

// 0 = no limit
const filteredAmounts = computed(() =>
  props.amounts.filter((a) => (props.min <= 0 || a >= props.min) && (props.max <= 0 || a <= props.max))
)

const filteredAmountOptions = computed(() =>
  filteredAmounts.value.map((amount) => ({
    amount,
    badge: props.amountBadges[amount],
  }))
)

const placeholderText = computed(() => {
  if (props.min > 0 && props.max > 0) return `${props.min} - ${props.max}`
  if (props.min > 0) return `≥ ${props.min}`
  if (props.max > 0) return `≤ ${props.max}`
  return t('payment.enterAmount')
})

const AMOUNT_PATTERN = /^\d*(\.\d{0,2})?$/

function formatAmount(amount: number) {
  return props.amountFormatter ? props.amountFormatter(amount) : String(amount)
}

function selectAmount(amt: number) {
  customText.value = String(amt)
  emit('update:modelValue', amt)
}

function handleInput(e: Event) {
  const val = (e.target as HTMLInputElement).value
  if (!AMOUNT_PATTERN.test(val)) return
  customText.value = val
  if (val === '') {
    emit('update:modelValue', null)
    return
  }
  const num = parseFloat(val)
  if (!isNaN(num) && num > 0) {
    emit('update:modelValue', num)
  } else {
    emit('update:modelValue', null)
  }
}

watch(() => props.modelValue, (v) => {
  if (v !== null && String(v) !== customText.value) {
    customText.value = String(v)
  }
}, { immediate: true })
</script>

<style scoped>
.payment-option-button {
  @apply flex min-h-[52px] flex-col items-center justify-center rounded-lg px-3 py-2 text-center font-medium transition-colors;
  border: 1px solid var(--theme-border);
}

.payment-option-button-with-badge {
  @apply gap-1;
}

.payment-option-amount {
  @apply leading-none;
}

.payment-option-caption {
  @apply text-[11px] font-semibold leading-none text-gray-500 dark:text-gray-400;
}

.payment-option-badge {
  @apply flex max-w-full flex-col items-center justify-center gap-1 text-[11px] font-semibold leading-none;
}

.payment-option-badge-total-line,
.payment-option-badge-breakdown {
  @apply inline-flex max-w-full flex-wrap items-center justify-center gap-1;
}

.payment-option-badge-label {
  @apply text-gray-500 dark:text-gray-400;
}

.payment-option-badge-total {
  @apply text-gray-800 dark:text-gray-100;
}

.payment-option-badge-bonus {
  @apply rounded px-1.5 py-0.5 text-emerald-700 dark:text-emerald-200;
  background: color-mix(in srgb, #22c55e 18%, var(--theme-surface));
  border: 1px solid color-mix(in srgb, #22c55e 38%, transparent);
}

.payment-option-button-active {
  background: color-mix(in srgb, var(--theme-accent-soft) 62%, var(--theme-surface));
  border-color: color-mix(in srgb, var(--theme-accent) 72%, var(--theme-border));
  color: var(--theme-accent);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--theme-accent) 32%, transparent);
}

.payment-option-button-active .payment-option-badge-bonus {
  @apply text-emerald-800 dark:text-emerald-100;
  background: color-mix(in srgb, #22c55e 28%, var(--theme-surface));
}

.payment-option-button-inactive {
  background: var(--theme-surface);
  @apply text-gray-700 dark:text-gray-200;
}

.payment-option-button-inactive:hover {
  background: var(--theme-surface-muted);
  border-color: var(--theme-border-strong);
}
</style>
