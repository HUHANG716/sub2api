import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const paymentViewSource = readFileSync(resolve(process.cwd(), 'src/views/user/PaymentView.vue'), 'utf-8')
const amountInputSource = readFileSync(resolve(process.cwd(), 'src/components/payment/AmountInput.vue'), 'utf-8')
const methodSelectorSource = readFileSync(resolve(process.cwd(), 'src/components/payment/PaymentMethodSelector.vue'), 'utf-8')
const planCardSource = readFileSync(resolve(process.cwd(), 'src/components/payment/SubscriptionPlanCard.vue'), 'utf-8')
const statusPanelSource = readFileSync(resolve(process.cwd(), 'src/components/payment/PaymentStatusPanel.vue'), 'utf-8')
const qrDialogSource = readFileSync(resolve(process.cwd(), 'src/components/payment/PaymentQRDialog.vue'), 'utf-8')
const stripeInlineSource = readFileSync(resolve(process.cwd(), 'src/components/payment/StripePaymentInline.vue'), 'utf-8')
const orderStatusBadgeSource = readFileSync(resolve(process.cwd(), 'src/components/payment/OrderStatusBadge.vue'), 'utf-8')
const providerCardSource = readFileSync(resolve(process.cwd(), 'src/components/payment/ProviderCard.vue'), 'utf-8')
const providerDialogSource = readFileSync(resolve(process.cwd(), 'src/components/payment/PaymentProviderDialog.vue'), 'utf-8')
const providerListSource = readFileSync(resolve(process.cwd(), 'src/components/payment/PaymentProviderList.vue'), 'utf-8')
const toggleSwitchSource = readFileSync(resolve(process.cwd(), 'src/components/payment/ToggleSwitch.vue'), 'utf-8')

describe('payment theme tokens', () => {
  it('uses theme-tokenized surfaces for visible checkout controls', () => {
    const checkoutSources = [
      paymentViewSource,
      amountInputSource,
      methodSelectorSource,
      planCardSource,
      statusPanelSource,
      qrDialogSource,
      stripeInlineSource,
      orderStatusBadgeSource,
      providerCardSource,
      providerDialogSource,
      providerListSource,
      toggleSwitchSource,
    ].join('\n')

    expect(checkoutSources).toContain('payment-tab-group')
    expect(checkoutSources).toContain('payment-option-button')
    expect(checkoutSources).toContain('payment-method-button')
    expect(checkoutSources).toContain('subscription-plan-card')
    expect(checkoutSources).toContain('payment-inner-panel')
    expect(checkoutSources).toContain('payment-status-badge')
    expect(checkoutSources).toContain('provider-card')
    expect(checkoutSources).toContain('provider-dialog-chip')
    expect(checkoutSources).toContain('payment-toggle-switch')
    expect(checkoutSources).toContain('background: var(--theme-surface-muted);')
    expect(checkoutSources).toContain('background: var(--theme-surface);')
    expect(checkoutSources).toContain('border: 1px solid var(--theme-border);')

    const paymentTabActiveBlock = paymentViewSource.match(
      /\.payment-tab-button-active\s*\{[\s\S]*?\n\}/
    )?.[0] ?? ''

    expect(paymentTabActiveBlock).toContain('background: var(--theme-primary-soft);')
    expect(paymentTabActiveBlock).toContain('color: var(--theme-primary);')
    expect(paymentTabActiveBlock).toContain('border-color: color-mix(in srgb, var(--theme-primary) 46%, transparent);')

    expect(checkoutSources).not.toContain('dark:bg-dark-800')
    expect(checkoutSources).not.toContain('dark:bg-dark-700')
    expect(checkoutSources).not.toContain('dark:bg-blue-950')
    expect(checkoutSources).not.toContain('dark:bg-green-950')
    expect(checkoutSources).not.toContain('dark:bg-indigo-950')
    expect(checkoutSources).not.toContain('dark:bg-orange-950')
    expect(checkoutSources).not.toContain('dark:bg-primary-950')
    expect(checkoutSources).not.toContain('bg-gray-100 p-1 dark:bg-dark-800')
    expect(checkoutSources).not.toContain('bg-gray-50 p-4 dark:bg-dark-800')
    expect(checkoutSources).not.toContain('bg-white p-4 shadow-sm dark:bg-dark-800')
  })
})
