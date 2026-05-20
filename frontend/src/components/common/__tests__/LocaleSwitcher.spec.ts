import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import LocaleSwitcher from '../LocaleSwitcher.vue'

const localeState = vi.hoisted(() => ({ value: 'en' }))
const setLocaleMock = vi.hoisted(() => vi.fn())

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    locale: localeState,
    t: (key: string) => {
      const messages: Record<string, string> = {
        'locale.label': 'Language',
        'locale.switchTo': 'Switch language',
        'locale.current': 'Current language',
        'locale.loading': 'Changing language...',
        'locale.en.nativeName': 'English',
        'locale.en.description': 'English interface',
        'locale.zh.nativeName': '简体中文',
        'locale.zh.description': '中文界面'
      }
      return messages[key] ?? key
    }
  })
}))

vi.mock('@/i18n', () => ({
  availableLocales: [
    { code: 'en', name: 'English', nativeName: 'English', description: 'English interface' },
    { code: 'zh', name: 'Chinese', nativeName: '简体中文', description: '中文界面' }
  ],
  setLocale: (code: string) => setLocaleMock(code)
}))

describe('LocaleSwitcher', () => {
  it('renders a compact accessible trigger and locale menu', async () => {
    const wrapper = mount(LocaleSwitcher, {
      global: {
        stubs: {
          Icon: true
        }
      }
    })

    const trigger = wrapper.get('[data-testid="locale-switcher-trigger"]')
    expect(trigger.attributes('aria-label')).toBe('Switch language')
    expect(trigger.attributes('aria-haspopup')).toBe('menu')
    expect(trigger.text()).toContain('English')

    await trigger.trigger('click')

    const menu = wrapper.get('[data-testid="locale-switcher-menu"]')
    expect(menu.attributes('role')).toBe('menu')
    expect(menu.text()).not.toContain('Current language')
    expect(menu.text()).not.toContain('English interface')
    expect(menu.text()).not.toContain('中文界面')
    expect(menu.text()).toContain('简体中文')
    expect(wrapper.findAll('[role="menuitemradio"]')).toHaveLength(2)
    expect(wrapper.findAll('.locale-option-code')).toHaveLength(0)
  })

  it('selects a locale and delegates persistence to i18n', async () => {
    setLocaleMock.mockResolvedValue(undefined)
    const wrapper = mount(LocaleSwitcher, {
      global: {
        stubs: {
          Icon: true
        }
      }
    })

    await wrapper.get('[data-testid="locale-switcher-trigger"]').trigger('click')
    await wrapper.get('[data-testid="locale-option-zh"]').trigger('click')

    expect(setLocaleMock).toHaveBeenCalledWith('zh')
  })
})
