import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/headers before importing auth module
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    set: vi.fn(),
    has: vi.fn().mockReturnValue(false),
    delete: vi.fn(),
    get: vi.fn().mockReturnValue(undefined),
  }),
}))

import { validatePassword, getCookieName, getSessionDuration } from '@/lib/auth'

describe('validatePassword', () => {
  beforeEach(() => {
    process.env.SITE_PASSWORD = 'test-password-123'
  })

  it('returns true for correct password', () => {
    expect(validatePassword('test-password-123')).toBe(true)
  })

  it('returns false for incorrect password', () => {
    expect(validatePassword('wrong-password')).toBe(false)
  })

  it('returns false for empty password', () => {
    expect(validatePassword('')).toBe(false)
  })

  it('is case sensitive', () => {
    expect(validatePassword('Test-Password-123')).toBe(false)
  })

  it('returns false when env var is undefined', () => {
    delete process.env.SITE_PASSWORD
    expect(validatePassword('anything')).toBe(false)
  })
})

describe('getCookieName', () => {
  it('returns the session cookie name', () => {
    const name = getCookieName()
    expect(name).toBe('gtm-kb-session')
    expect(typeof name).toBe('string')
    expect(name.length).toBeGreaterThan(0)
  })
})

describe('getSessionDuration', () => {
  it('returns duration in seconds', () => {
    const duration = getSessionDuration()
    expect(duration).toBe(120) // 2 minutes
    expect(typeof duration).toBe('number')
  })
})
