import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import DefaultHashAvatar from '@/components/common/DefaultHashAvatar.vue'

const { toSvgMock } = vi.hoisted(() => ({
  toSvgMock: vi.fn(() => '<svg viewBox="0 0 64 64"><rect width="64" height="64"/></svg>')
}))

vi.mock('jdenticon/browser', () => ({
  toSvg: toSvgMock
}))

describe('DefaultHashAvatar', () => {
  it('renders a deterministic identicon from the provided seed', () => {
    const wrapper = mount(DefaultHashAvatar, {
      props: {
        seed: 'user:5:alice@example.com',
        label: 'alice@example.com'
      }
    })

    expect(toSvgMock).toHaveBeenCalledWith('user:5:alice@example.com', 64, expect.any(Object))
    expect(wrapper.get('[data-testid="default-hash-avatar"]').html()).toContain('<svg')
    expect(wrapper.text()).toBe('')
  })
})
