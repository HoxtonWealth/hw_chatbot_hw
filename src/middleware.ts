import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const COOKIE_NAME = 'gtm-kb-session'
const SESSION_DURATION = 3600 // 60 minutes in seconds

const PUBLIC_PATHS = [
  '/login',
  '/api/auth',
  '/api/process',
  '/api/feedback',
  '/api/glossary',
  '/api/documents',
  '/api/commands',
  '/api/chat/public',
  '/embed',
]

// --- IP-based rate limiting for /api/chat/public ---
const RATE_LIMIT_WINDOW_MS = 60 * 1000 // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 20      // max 20 requests per minute per IP

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  entry.count++
  return entry.count > RATE_LIMIT_MAX_REQUESTS
}

// --- Authenticated /api/chat rate limiting ---
const AUTH_RATE_LIMIT_MAX = 30 // 30 requests per minute for authenticated users
const authRateLimitMap = new Map<string, { count: number; resetAt: number }>()

function isAuthRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = authRateLimitMap.get(ip)

  if (!entry || now > entry.resetAt) {
    authRateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return false
  }

  entry.count++
  return entry.count > AUTH_RATE_LIMIT_MAX
}

// Clean up old entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(ip)
    }
  }
  for (const [ip, entry] of authRateLimitMap.entries()) {
    if (now > entry.resetAt) {
      authRateLimitMap.delete(ip)
    }
  }
}, 5 * 60 * 1000)
// --- End rate limiting ---

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public paths
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    // Rate limit the public chat endpoint
    if (pathname === '/api/chat/public') {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
      if (isRateLimited(ip)) {
        return new NextResponse(
          JSON.stringify({ error: 'Too many requests. Please wait a moment.' }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }
    return NextResponse.next()
  }

  // Allow static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Check for session cookie
  const session = request.cookies.get(COOKIE_NAME)
  if (!session) {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  // Rate limit authenticated chat endpoint
  if (pathname === '/api/chat') {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (isAuthRateLimited(ip)) {
      return new NextResponse(
        JSON.stringify({ error: 'Too many requests. Please wait a moment.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }

  // Refresh cookie (sliding window) - extends session on each valid request
  const response = NextResponse.next()
  response.cookies.set(COOKIE_NAME, 'authenticated', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION,
    path: '/',
  })

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
