import { describe, expect, it } from 'vitest'

import { getWindowEndState } from '@/utils/subscriptionQuota'

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
      parts: { days: 1, hours: 11, minutes: 0 },
    })
  })
})
