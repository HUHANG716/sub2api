<template>
  <span
    class="payment-status-badge inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
    :class="statusClass"
  >
    {{ statusLabel }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { OrderStatus } from '@/types/payment'

const props = defineProps<{
  status: OrderStatus
}>()

const { t } = useI18n()

const statusMap: Record<OrderStatus, { key: string; class: string }> = {
  PENDING: { key: 'payment.status.pending', class: 'payment-status-warning' },
  PAID: { key: 'payment.status.paid', class: 'payment-status-info' },
  RECHARGING: { key: 'payment.status.recharging', class: 'payment-status-info' },
  COMPLETED: { key: 'payment.status.completed', class: 'payment-status-success' },
  EXPIRED: { key: 'payment.status.expired', class: 'payment-status-muted' },
  CANCELLED: { key: 'payment.status.cancelled', class: 'payment-status-muted' },
  FAILED: { key: 'payment.status.failed', class: 'payment-status-danger' },
  REFUND_REQUESTED: { key: 'payment.status.refund_requested', class: 'payment-status-orange' },
  REFUNDING: { key: 'payment.status.refunding', class: 'payment-status-orange' },
  REFUNDED: { key: 'payment.status.refunded', class: 'payment-status-purple' },
  PARTIALLY_REFUNDED: { key: 'payment.status.partially_refunded', class: 'payment-status-purple' },
  REFUND_FAILED: { key: 'payment.status.refund_failed', class: 'payment-status-danger' },
}

const statusLabel = computed(() => {
  const entry = statusMap[props.status]
  return entry ? t(entry.key) : props.status
})

const statusClass = computed(() => {
  const entry = statusMap[props.status]
  return entry?.class ?? 'payment-status-muted'
})
</script>

<style scoped>
.payment-status-badge {
  --payment-status-accent: var(--theme-accent);
  background: color-mix(in srgb, var(--payment-status-accent) 12%, var(--theme-surface));
  color: color-mix(in srgb, var(--payment-status-accent) 82%, var(--theme-text));
  border: 1px solid color-mix(in srgb, var(--payment-status-accent) 22%, var(--theme-border));
}

.payment-status-warning {
  --payment-status-accent: #d97706;
}

.payment-status-info {
  --payment-status-accent: #2563eb;
}

.payment-status-success {
  --payment-status-accent: #16a34a;
}

.payment-status-danger {
  --payment-status-accent: #dc2626;
}

.payment-status-orange {
  --payment-status-accent: #ea580c;
}

.payment-status-purple {
  --payment-status-accent: #7c3aed;
}

.payment-status-muted {
  --payment-status-accent: var(--theme-text-muted);
}
</style>
