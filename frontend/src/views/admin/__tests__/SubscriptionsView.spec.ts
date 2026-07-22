import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const viewPath = resolve(dirname(fileURLToPath(import.meta.url)), '../SubscriptionsView.vue')
const viewSource = readFileSync(viewPath, 'utf8')

describe('SubscriptionsView expiration display', () => {
  it('shows expiration date and time to the minute in the table and adjust dialog', () => {
    expect(viewSource).toContain("import { formatDateTimeToMinute } from '@/utils/format'")
    expect(viewSource).toContain('{{ formatDateTimeToMinute(value) }}')
    expect(viewSource).toContain('? formatDateTimeToMinute(extendingSubscription.expires_at)')
    expect(viewSource).not.toContain('formatDateOnly(value)')
    expect(viewSource).not.toContain('formatDateOnly(extendingSubscription.expires_at)')
  })
})
