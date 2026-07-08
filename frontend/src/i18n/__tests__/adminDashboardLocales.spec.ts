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

  it('contains labels for image playground usage analytics', () => {
    expect(zh.admin.usage.imagePlayground.title).toBe('生图统计')
    expect(zh.admin.usage.imagePlayground.description).toBe('查看生图工作台的提交、成功、失败和最近事件。')
    expect(zh.admin.usage.imagePlayground.submitCount).toBe('提交次数')
    expect(zh.admin.usage.imagePlayground.successCount).toBe('成功次数')
    expect(zh.admin.usage.imagePlayground.errorCount).toBe('失败次数')
    expect(zh.admin.usage.imagePlayground.successRate).toBe('成功率')
    expect(zh.admin.usage.imagePlayground.avgDuration).toBe('平均耗时')
    expect(zh.admin.usage.imagePlayground.errorReasons).toBe('失败原因')
    expect(zh.admin.usage.imagePlayground.models).toBe('模型')
    expect(zh.admin.usage.imagePlayground.apiModes).toBe('API 模式')
    expect(zh.admin.usage.imagePlayground.recentEvents).toBe('最近事件')
    expect(zh.admin.usage.imagePlayground.totalEvents).toBe('共 {count} 条')
    expect(zh.admin.usage.imagePlayground.pageInfo).toBe('第 {page} / {total} 页')
    expect(zh.admin.usage.imagePlayground.event).toBe('事件')
    expect(zh.admin.usage.imagePlayground.apiMode).toBe('API 模式')
    expect(zh.admin.usage.imagePlayground.reason).toBe('原因')
    expect(zh.admin.usage.imagePlayground.submit).toBe('提交')
    expect(zh.admin.usage.imagePlayground.success).toBe('成功')
    expect(zh.admin.usage.imagePlayground.error).toBe('失败')
    expect(zh.admin.usage.imagePlayground.loadFailed).toBe('加载生图统计失败。')

    expect(en.admin.usage.imagePlayground.title).toBe('Image Playground Analytics')
    expect(en.admin.usage.imagePlayground.description).toBe('Review image playground submissions, successes, failures, and recent events.')
    expect(en.admin.usage.imagePlayground.submitCount).toBe('Submissions')
    expect(en.admin.usage.imagePlayground.successCount).toBe('Successes')
    expect(en.admin.usage.imagePlayground.errorCount).toBe('Failures')
    expect(en.admin.usage.imagePlayground.successRate).toBe('Success Rate')
    expect(en.admin.usage.imagePlayground.avgDuration).toBe('Avg Duration')
    expect(en.admin.usage.imagePlayground.errorReasons).toBe('Failure Reasons')
    expect(en.admin.usage.imagePlayground.models).toBe('Models')
    expect(en.admin.usage.imagePlayground.apiModes).toBe('API Modes')
    expect(en.admin.usage.imagePlayground.recentEvents).toBe('Recent Events')
    expect(en.admin.usage.imagePlayground.totalEvents).toBe('{count} total')
    expect(en.admin.usage.imagePlayground.pageInfo).toBe('Page {page} / {total}')
    expect(en.admin.usage.imagePlayground.event).toBe('Event')
    expect(en.admin.usage.imagePlayground.apiMode).toBe('API Mode')
    expect(en.admin.usage.imagePlayground.reason).toBe('Reason')
    expect(en.admin.usage.imagePlayground.submit).toBe('Submit')
    expect(en.admin.usage.imagePlayground.success).toBe('Success')
    expect(en.admin.usage.imagePlayground.error).toBe('Error')
    expect(en.admin.usage.imagePlayground.loadFailed).toBe('Failed to load image playground analytics.')
  })
})
