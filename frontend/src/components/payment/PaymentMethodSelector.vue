<template>
  <div>
    <label class="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
      {{ t('payment.paymentMethod') }}
    </label>
    <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:flex">
      <button
        v-for="method in sortedMethods"
        :key="method.type"
        type="button"
        :disabled="!method.available"
        :class="[
          'payment-method-button',
          !method.available
            ? 'payment-method-button-disabled'
            : selected === method.type
              ? methodSelectedClass(method.type)
              : 'payment-method-button-inactive',
        ]"
        @click="method.available && emit('select', method.type)"
      >
        <span class="flex w-full items-center gap-3">
          <span class="payment-method-icon">
            <img :src="methodIcon(method.type)" :alt="t(`payment.methods.${method.type}`)" class="h-6 w-6 object-contain" />
          </span>
          <span class="flex flex-col items-start leading-none">
            <span class="text-base font-semibold">{{ t(`payment.methods.${method.type}`) }}</span>
            <span
              v-if="method.fee_rate > 0"
              class="text-[10px] text-gray-500 dark:text-dark-400"
            >
              {{ t('payment.fee') }} {{ method.fee_rate }}%
            </span>
          </span>
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { METHOD_ORDER } from './providerConfig'
import alipayIcon from '@/assets/icons/alipay.svg'
import wxpayIcon from '@/assets/icons/wxpay.svg'
import stripeIcon from '@/assets/icons/stripe.svg'
import airwallexIcon from '@/assets/icons/airwallex.svg'

export interface PaymentMethodOption {
  type: string
  fee_rate: number
  available: boolean
}

const props = defineProps<{
  methods: PaymentMethodOption[]
  selected: string
}>()

const emit = defineEmits<{
  select: [type: string]
}>()

const { t } = useI18n()

const METHOD_ICONS: Record<string, string> = {
  alipay: alipayIcon,
  wxpay: wxpayIcon,
  stripe: stripeIcon,
  airwallex: airwallexIcon,
}

const sortedMethods = computed(() => {
  const order: readonly string[] = METHOD_ORDER
  return [...props.methods].sort((a, b) => {
    const ai = order.indexOf(a.type)
    const bi = order.indexOf(b.type)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })
})

function methodIcon(type: string): string {
  if (type.includes('alipay')) return METHOD_ICONS.alipay
  if (type.includes('wxpay')) return METHOD_ICONS.wxpay
  if (type === 'airwallex') return METHOD_ICONS.airwallex
  return METHOD_ICONS[type] || alipayIcon
}

function methodSelectedClass(type: string): string {
  if (type.includes('alipay')) return 'payment-method-button-active payment-method-alipay'
  if (type.includes('wxpay')) return 'payment-method-button-active payment-method-wxpay'
  if (type === 'stripe') return 'payment-method-button-active payment-method-stripe'
  if (type === 'airwallex') return 'payment-method-button-active payment-method-airwallex'
  return 'payment-method-button-active'
}
</script>

<style scoped>
.payment-method-button {
  @apply relative flex min-h-[64px] flex-col items-center justify-center rounded-lg px-3 transition-all xl:flex-1;
  border: 1px solid var(--theme-border);
}

.payment-method-icon {
  @apply flex h-10 w-10 shrink-0 items-center justify-center rounded-md;
  background: var(--theme-surface-muted);
  border: 1px solid color-mix(in srgb, var(--theme-border) 82%, transparent);
}

.payment-method-button-inactive {
  background: var(--theme-surface);
  @apply text-gray-700 dark:text-gray-200;
}

.payment-method-button-inactive:hover {
  background: var(--theme-surface-muted);
  border-color: var(--theme-border-strong);
}

.payment-method-button-disabled {
  @apply cursor-not-allowed opacity-50;
  background: var(--theme-surface-muted);
  color: var(--theme-text-muted);
}

.payment-method-button-active {
  --payment-method-accent: var(--theme-accent);
  background: color-mix(in srgb, var(--payment-method-accent) 8%, var(--theme-surface));
  border-color: color-mix(in srgb, var(--payment-method-accent) 64%, var(--theme-border));
  color: var(--theme-text);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--payment-method-accent) 18%, transparent);
}

.payment-method-button-active .payment-method-icon {
  background: color-mix(in srgb, var(--payment-method-accent) 12%, var(--theme-surface));
  border-color: color-mix(in srgb, var(--payment-method-accent) 32%, var(--theme-border));
}

.payment-method-alipay {
  --payment-method-accent: #02a9f1;
}

.payment-method-wxpay {
  --payment-method-accent: #09bb07;
}

.payment-method-stripe {
  --payment-method-accent: #676be5;
}

.payment-method-airwallex {
  --payment-method-accent: #ff6b3d;
}
</style>
