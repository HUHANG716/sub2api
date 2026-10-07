<template>
  <div class="space-y-4">
    <!-- Quick Amount Buttons -->
    <div>
      <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
        {{ t('payment.quickAmounts') }}
      </label>
      <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <button
          v-for="option in filteredAmountOptions"
          :key="option.amount"
          type="button"
          :class="[
            'payment-option-button relative',
            modelValue === option.amount
              ? 'payment-option-button-active'
              : 'payment-option-button-inactive',
            option.badge ? 'payment-option-button-with-badge' : '',
          ]"
          :data-testid="`quick-amount-${option.amount}`"
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
          <!-- 促销价签（单行）：仅命中档位的金额显示；红底白字、内圈点线、右侧圆孔、整体旋转 -->
          <span
            v-if="!option.badge && quoteFor(option.amount).percent > 0"
            class="pointer-events-none absolute -right-2 -top-3 z-10 rotate-12"
            data-testid="quick-amount-bonus-badge"
          >
            <span
              class="relative flex items-center gap-1 whitespace-nowrap rounded bg-red-600 py-0.5 pl-1.5 pr-1 text-[11px] font-extrabold leading-tight tracking-tight text-white shadow-md ring-2 ring-white before:pointer-events-none before:absolute before:inset-[2px] before:rounded-sm before:border before:border-dotted before:border-white/70 dark:bg-red-500 dark:ring-dark-800"
            >
              <span>{{ badgeText(option.amount) }}</span>
              <span class="h-1 w-1 shrink-0 rounded-full bg-white"></span>
            </span>
          </span>
          <!-- 配置了优惠阶梯时，所有按钮都显示第二行，保持高度一致：赠金显示到账 USD，折扣显示折后实付 -->
          <span
            v-if="!option.badge && showSecondLine"
            :class="[
              'mt-0.5 block text-[11px] font-normal leading-tight',
              quoteFor(option.amount).percent > 0 ? 'text-red-600 dark:text-red-300' : 'text-gray-400 dark:text-gray-500',
            ]"
            data-testid="quick-amount-credited"
          >{{ secondLine(option.amount) }}</span>
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
          @change="commitCustomAmount"
          @blur="commitCustomAmount"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { RechargeBonusTier } from '@/types/payment'
import { formatRechargeBonusNumber, quoteRechargeBonus, type RechargeBonusMode } from '@/utils/rechargeBonus'
import { formatPaymentAmount } from './currency'

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
  /** 充值优惠阶梯（按 min_amount 升序）；为空时不显示价签与第二行 */
  bonusTiers?: RechargeBonusTier[]
  /** 阶梯模式：bonus 赠金 / discount 折扣 */
  bonusMode?: RechargeBonusMode
  /** 充值倍率（1 支付币种 = multiplier USD），用于计算到账金额 */
  multiplier?: number
  /** 支付币种（折扣模式第二行实付金额的币种与精度） */
  currency?: string
}>(), {
  amounts: () => [10, 20, 50, 100, 200, 500, 1000, 2000, 5000],
  min: 0,
  max: 0,
  amountBadges: () => ({}),
  amountFormatter: undefined,
  amountPrefixLabel: '',
  inputPrefix: '$',
  bonusTiers: () => [],
  bonusMode: 'bonus',
  multiplier: 1,
  currency: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
  'amount-select': [payload: { amount: number; source: 'quick' | 'custom' }]
}>()

const { t } = useI18n()

const customText = ref('')
const customInputDirty = ref(false)
const lastCommittedCustomAmount = ref<number | null>(null)

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
const showSecondLine = computed(() => props.bonusTiers.length > 0)

function currencyDigits(): number {
  if (!props.currency) return 2
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: props.currency }).resolvedOptions().maximumFractionDigits ?? 2
  } catch {
    return 2
  }
}

function quoteFor(amt: number) {
  return quoteRechargeBonus(props.bonusTiers, amt, {
    multiplier: props.multiplier,
    mode: props.bonusMode,
    currencyDigits: currencyDigits(),
  })
}

// 价签文案：赠金「+20%」，折扣「20% OFF」
function badgeText(amt: number): string {
  const percent = formatRechargeBonusNumber(quoteFor(amt).percent)
  return props.bonusMode === 'discount' ? `${percent}% OFF` : `+${percent}%`
}

function secondLine(amt: number): string {
  const quote = quoteFor(amt)
  if (props.bonusMode === 'discount') {
    return t('payment.rechargeBonus.payShort', { amount: formatPaymentAmount(quote.payBase, props.currency) })
  }
  return t('payment.rechargeBonus.creditedShort', { amount: '$' + quote.credited.toFixed(2) })
}

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
  customInputDirty.value = false
  lastCommittedCustomAmount.value = null
  emit('update:modelValue', amt)
  emit('amount-select', { amount: amt, source: 'quick' })
}

function handleInput(e: Event) {
  const input = e.target as HTMLInputElement
  const val = input.value
  if (!AMOUNT_PATTERN.test(val)) {
    input.value = customText.value
    return
  }
  customText.value = val
  customInputDirty.value = true
  lastCommittedCustomAmount.value = null
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

function commitCustomAmount() {
  if (!customInputDirty.value) return
  const num = parseFloat(customText.value)
  if (!isNaN(num) && num > 0 && num !== lastCommittedCustomAmount.value) {
    lastCommittedCustomAmount.value = num
    customInputDirty.value = false
    emit('amount-select', { amount: num, source: 'custom' })
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
  @apply flex min-h-[58px] flex-col items-center justify-center rounded-lg px-3 py-2.5 text-center font-medium transition-all;
  border: 1px solid var(--theme-border);
}

.payment-option-button-with-badge {
  @apply gap-1;
}

.payment-option-amount {
  @apply leading-none text-[15px] font-semibold;
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
  background: color-mix(in srgb, var(--theme-accent-soft) 58%, var(--theme-surface));
  border-color: color-mix(in srgb, var(--theme-accent) 72%, var(--theme-border));
  color: var(--theme-accent);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, var(--theme-accent) 28%, transparent),
    0 10px 24px color-mix(in srgb, var(--theme-accent) 12%, transparent);
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
