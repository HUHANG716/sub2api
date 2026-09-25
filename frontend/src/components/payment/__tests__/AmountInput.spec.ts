import { afterEach, describe, expect, it, vi } from 'vitest'
import { enableAutoUnmount, mount } from '@vue/test-utils'
import AmountInput from '../AmountInput.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))
enableAutoUnmount(afterEach)

function mountInput(value: number | null = null) {
  return mount(AmountInput, { props: { modelValue: value } })
}

describe('AmountInput', () => {
  it('emits quick amount selections immediately', async () => {
    const wrapper = mount(AmountInput, {
      props: {
        modelValue: null,
        amounts: [10, 20],
      },
    })

    await wrapper.findAll('button')[1].trigger('click')

    expect(wrapper.emitted('update:modelValue')).toEqual([[20]])
    expect(wrapper.emitted('amount-select')).toEqual([[{ amount: 20, source: 'quick' }]])
  })

  it('emits custom amount selections only after user input is committed', async () => {
    const wrapper = mount(AmountInput, {
      props: {
        modelValue: 10,
        amounts: [10],
      },
    })
    const input = wrapper.get('input')

    await input.trigger('blur')
    expect(wrapper.emitted('amount-select')).toBeUndefined()

    await input.setValue('88')
    await input.trigger('change')
    await input.trigger('blur')

    expect(wrapper.emitted('update:modelValue')).toEqual([[88]])
    expect(wrapper.emitted('amount-select')).toEqual([[{ amount: 88, source: 'custom' }]])
  })

  it('keeps pending custom analytics when the parent normalizes decimal text', async () => {
    const wrapper = mount(AmountInput, {
      props: {
        modelValue: null,
        amounts: [10],
      },
    })
    const input = wrapper.get('input')

    await input.setValue('88.00')
    await wrapper.setProps({ modelValue: 88 })
    await input.trigger('change')

    expect(wrapper.emitted('update:modelValue')).toEqual([[88]])
    expect(wrapper.emitted('amount-select')).toEqual([[{ amount: 88, source: 'custom' }]])
  })

  it.each(['10abc', '10.555', '-10', '1e2'])('restores the accepted amount after rejecting %s', async (value) => {
    const wrapper = mountInput(10)
    const input = wrapper.get('input')
    await input.setValue(value)
    expect((input.element as HTMLInputElement).value).toBe('10')
    expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  })

  it('restores the last typed amount rather than a stale prop', async () => {
    const wrapper = mountInput()
    const input = wrapper.get('input')
    await input.setValue('12.50')
    await input.setValue('12.500')
    expect((input.element as HTMLInputElement).value).toBe('12.50')
    expect(wrapper.emitted('update:modelValue')).toEqual([[12.5]])
  })

  it('preserves decimal editing and allows clearing the amount', async () => {
    const wrapper = mountInput()
    const input = wrapper.get('input')
    for (const value of ['0', '0.', '0.5', '0.50', '']) await input.setValue(value)
    expect(wrapper.emitted('update:modelValue')).toEqual([[null], [null], [0.5], [0.5], [null]])
    expect((input.element as HTMLInputElement).value).toBe('')
  })
})
