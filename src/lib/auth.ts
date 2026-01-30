import { cookies } from 'next/headers'

const COOKIE_NAME = 'gtm-kb-session'
const SESSION_DURATION = 2 * 60 * 1000 // 2 minutes in milliseconds

export function validatePassword(password: string): boolean {
  return password === process.env.SITE_PASSWORD
}

export async function createSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION / 1000, // Convert to seconds
    path: '/',
  })
}

export async function validateSession(): Promise<boolean> {
  const cookieStore = await cookies()
  return cookieStore.has(COOKIE_NAME)
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}

export function getCookieName(): string {
  return COOKIE_NAME
}

export function getSessionDuration(): number {
  return SESSION_DURATION / 1000 // Return in seconds
}
