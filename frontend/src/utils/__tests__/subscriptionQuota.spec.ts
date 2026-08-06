import { describe, expect, it } from 'vitest'

import {
  getExpirationDateRelation,
  getRemainingExpiryDuration,
  getWindowEndState
} from '@/utils/subscriptionQuota'

describe('subscriptionQuota', () => {
  it('anchors legacy midnight windows to the subscription purchase time', () => {
    const state = getWindowEndState(
      '2026-05-18T00:00:00Z',
      7 * 24,
      '2026-05-25T14:22:32Z',
      new Date('2026-05-24T03:22:32Z'),
      '2026-05-18T14:22:32Z'
    )

    expect(state).toEqual({
      type: 'reset',
      parts: { days: 1, hours: 11, minutes: 0 }
    })
  })
})

describe('subscription expiry timing', () => {
  it('uses local calendar dates for today and tomorrow', () => {
    const now = new Date(2026, 2, 7, 23, 30)

    expect(getExpirationDateRelation(new Date(2026, 2, 7, 23, 45), now)).toBe('today')
    expect(getExpirationDateRelation(new Date(2026, 2, 8, 3, 30), now)).toBe('tomorrow')
  })

  it('treats the exact expiry instant and elapsed expiries as expired', () => {
    const now = new Date(2026, 6, 30, 9, 0)

    expect(getExpirationDateRelation(now, now)).toBe('expired')
    expect(getRemainingExpiryDuration(now, now)).toBeNull()
    expect(getExpirationDateRelation(new Date(2026, 6, 30, 8, 59), now)).toBe('expired')
    expect(getRemainingExpiryDuration(new Date(2026, 6, 30, 8, 59), now)).toBeNull()
  })

  it('rejects invalid target and current dates', () => {
    const invalid = new Date('invalid')
    const valid = new Date(2026, 6, 30, 9, 0)

    expect(getExpirationDateRelation(invalid, valid)).toBeNull()
    expect(getExpirationDateRelation(valid, invalid)).toBeNull()
    expect(getRemainingExpiryDuration(invalid, valid)).toBeNull()
    expect(getRemainingExpiryDuration(valid, invalid)).toBeNull()
  })

  it('returns rounded-up hours and minutes for an expiry under 24 hours away', () => {
    const now = new Date(2026, 6, 30, 9, 0)

    expect(getRemainingExpiryDuration(new Date(2026, 6, 31, 8, 30), now)).toEqual({
      unit: 'hoursMinutes',
      hours: 23,
      minutes: 30
    })
    expect(getRemainingExpiryDuration(new Date(now.getTime() + 1), now)).toEqual({
      unit: 'hoursMinutes',
      hours: 0,
      minutes: 1
    })
    expect(getRemainingExpiryDuration(new Date(now.getTime() + 23 * 60 * 60 * 1000 + 1), now)).toEqual({
      unit: 'hoursMinutes',
      hours: 23,
      minutes: 1
    })
  })

  it('preserves rounded-up day display from 24 hours onward', () => {
    const now = new Date(2026, 6, 30, 9, 0)

    expect(getRemainingExpiryDuration(new Date(now.getTime() + 24 * 60 * 60 * 1000), now)).toEqual({
      unit: 'days',
      days: 1
    })
    expect(getRemainingExpiryDuration(new Date(now.getTime() + 24 * 60 * 60 * 1000 + 1), now)).toEqual({
      unit: 'days',
      days: 2
    })
  })

  it('anchors a later midnight window when it follows the purchase cadence', () => {
    const state = getWindowEndState(
      '2026-05-25T00:00:00Z',
      7 * 24,
      undefined,
      new Date('2026-05-30T03:00:00Z'),
      '2026-05-18T14:22:32Z'
    )

    expect(state).toEqual({
      type: 'reset',
      parts: { days: 2, hours: 11, minutes: 22 }
    })
  })

  it('anchors a previous cadence midnight window at the next purchase boundary', () => {
    const state = getWindowEndState(
      '2026-05-25T00:00:00Z',
      7 * 24,
      undefined,
      new Date('2026-06-01T15:00:00Z'),
      '2026-05-18T14:22:32Z'
    )

    expect(state).toEqual({
      type: 'reset',
      parts: { days: 6, hours: 23, minutes: 22 }
    })
  })

  it('keeps a midnight window from an unrelated manual reset date', () => {
    const state = getWindowEndState(
      '2026-05-21T00:00:00Z',
      7 * 24,
      undefined,
      new Date('2026-05-22T03:00:00Z'),
      '2026-05-18T14:22:32Z'
    )

    expect(state).toEqual({
      type: 'reset',
      parts: { days: 5, hours: 21, minutes: 0 }
    })
  })
})
