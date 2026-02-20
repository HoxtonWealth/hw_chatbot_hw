import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/chat/public',
  '/embed(.*)',
  '/api/feedback',
  '/api/glossary',
])

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

// Clean up old entries every 5 minutes to prevent memory leak
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(ip)
    }
  }
}, 5 * 60 * 1000)
// --- End rate limiting ---

export default clerkMiddleware(async (auth, request) => {
  const { pathname } = request.nextUrl

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

  // Allow public routes without auth
  if (isPublicRoute(request)) {
    return
  }

  // Protect everything else — redirects to sign-in if unauthenticated
  await auth.protect()
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}
