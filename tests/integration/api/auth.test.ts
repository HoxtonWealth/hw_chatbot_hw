import { describe, it, expect, vi, beforeEach } from 'vitest'

// Story 1-3: Authentication Middleware acceptance criteria

vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({
    set: vi.fn(),
    has: vi.fn().mockReturnValue(true),
    delete: vi.fn(),
    get: vi.fn().mockReturnValue({ name: 'gtm-kb-session', value: 'authenticated' }),
  }),
}))

vi.mock('@/lib/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth')>()
  return {
    ...actual,
    createSession: vi.fn(),
    clearSession: vi.fn(),
  }
})

import { POST, DELETE } from '@/app/api/auth/route'

function createAuthRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('Story 1-3: POST /api/auth (Login)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.SITE_PASSWORD = 'test-password-123'
  })

  // AC: Login page with password input field
  it('accepts correct password', async () => {
    const request = createAuthRequest({ password: 'test-password-123' })
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
  })

  // AC: Rejects wrong password
  it('returns 401 for incorrect password', async () => {
    const request = createAuthRequest({ password: 'wrong-password' })
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(401)
    expect(body.error).toBe('Invalid password')
  })

  // AC: Validates password field present
  it('returns 400 when password missing', async () => {
    const request = createAuthRequest({})
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toBe('Password is required')
  })

  it('returns 400 for non-string password', async () => {
    const request = createAuthRequest({ password: 123 })
    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  // AC: HTTP-only cookie set on successful auth
  it('creates session on successful login', async () => {
    const { createSession } = await import('@/lib/auth')
    const request = createAuthRequest({ password: 'test-password-123' })
    await POST(request)

    expect(createSession).toHaveBeenCalled()
  })
})

describe('Story 1-3: DELETE /api/auth (Logout)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('clears session on logout', async () => {
    const { clearSession } = await import('@/lib/auth')
    const response = await DELETE()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(clearSession).toHaveBeenCalled()
  })
})
