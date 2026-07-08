import { describe, expect, it } from 'vitest'

import en from '../locales/en'
import zh from '../locales/zh'

describe('admin dashboard locale keys', () => {
  it('contains labels for dashboard summary cards', () => {
    expect(zh.admin.dashboard.totalUserBalance).toBe('用户余额总量')
    expect(zh.admin.dashboard.balanceOnly).toBe('仅余额')
    expect(zh.admin.dashboard.currentConcurrency).toBe('当前并发')

    expect(en.admin.dashboard.totalUserBalance).toBe('Total User Balance')
    expect(en.admin.dashboard.balanceOnly).toBe('Balance only')
    expect(en.admin.dashboard.currentConcurrency).toBe('Current Concurrency')
  })

  it('contains the image playground navigation label', () => {
    expect(zh.nav.imagePlayground).toBe('生图工作台')
    expect(en.nav.imagePlayground).toBe('Image Playground')
  })
})
