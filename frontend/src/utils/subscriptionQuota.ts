import type { UserSubscription } from '@/types'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

export interface RemainingDurationParts {
  days: number
  hours: number
  minutes: number
}

export function isOneTimeDailyQuota(
  subscription: Pick<UserSubscription, 'starts_at' | 'expires_at'>
): boolean {
  if (!subscription.starts_at || !subscription.expires_at) return false

  const startsAt = new Date(subscription.starts_at).getTime()
  const expiresAt = new Date(subscription.expires_at).getTime()

  if (!Number.isFinite(startsAt) || !Number.isFinite(expiresAt)) return false

  return expiresAt <= startsAt + ONE_DAY_MS
}

export function getRemainingDurationParts(
  targetAt: Date | string,
  now: Date = new Date()
): RemainingDurationParts | null {
  const targetTime = targetAt instanceof Date ? targetAt.getTime() : new Date(targetAt).getTime()
  const nowTime = now.getTime()

  if (!Number.isFinite(targetTime) || !Number.isFinite(nowTime)) return null

  const diffMs = targetTime - nowTime
  if (diffMs <= 0) return null

  const totalMinutes = Math.floor(diffMs / (1000 * 60))
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = totalMinutes % 60

  return { days, hours, minutes }
}

export function getWindowEndState(
  windowStart: string | null | undefined,
  windowHours: number,
  expiresAt?: string | null,
  now: Date = new Date(),
  anchorStart?: string | null
): { type: 'reset' | 'quota_end'; parts: RemainingDurationParts } | null {
  if (!windowStart) return null

  const startTime = effectiveWindowStart(windowStart, windowHours, now, anchorStart)
  if (!Number.isFinite(startTime)) return null

  const resetTime = new Date(startTime + windowHours * 60 * 60 * 1000)
  let targetTime = resetTime
  let type: 'reset' | 'quota_end' = 'reset'

  if (expiresAt) {
    const expiresTime = new Date(expiresAt).getTime()
    if (Number.isFinite(expiresTime) && expiresTime < resetTime.getTime()) {
      targetTime = new Date(expiresTime)
      type = 'quota_end'
    }
  }

  const parts = getRemainingDurationParts(targetTime, now)
  return parts ? { type, parts } : null
}

function effectiveWindowStart(
  windowStart: string,
  windowHours: number,
  now: Date,
  anchorStart?: string | null
): number {
  const startTime = new Date(windowStart).getTime()
  if (!Number.isFinite(startTime) || !anchorStart) return startTime

  const anchorTime = new Date(anchorStart).getTime()
  if (!Number.isFinite(anchorTime)) return startTime

  const windowDate = new Date(windowStart)
  const anchorDate = new Date(anchorStart)
  const isLegacyMidnightWindow = isLocalMidnight(windowDate) || isUTCMidnight(windowDate)
  const anchorHasTimeOfDay = !isLocalMidnight(anchorDate) && !isUTCMidnight(anchorDate)

  if (!isLegacyMidnightWindow || !anchorHasTimeOfDay) return startTime

  const windowMs = windowHours * 60 * 60 * 1000
  if (windowMs <= 0 || now.getTime() < anchorTime + windowMs) return anchorTime

  return anchorTime + Math.floor((now.getTime() - anchorTime) / windowMs) * windowMs
}

function isLocalMidnight(date: Date): boolean {
  return date.getHours() === 0
    && date.getMinutes() === 0
    && date.getSeconds() === 0
    && date.getMilliseconds() === 0
}

function isUTCMidnight(date: Date): boolean {
  return date.getUTCHours() === 0
    && date.getUTCMinutes() === 0
    && date.getUTCSeconds() === 0
    && date.getUTCMilliseconds() === 0
}
