import { describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import AmountInput from '../AmountInput.vue'

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
  }),
}))

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
})
