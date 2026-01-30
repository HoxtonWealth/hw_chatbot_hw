import { NextResponse } from 'next/server'
import { validatePassword, createSession, clearSession } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { password } = body

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required' },
        { status: 400 }
      )
    }

    if (!validatePassword(password)) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      )
    }

    await createSession()

    return NextResponse.json({ success: true }, { status: 200 })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    await clearSession()
    return NextResponse.json({ success: true }, { status: 200 })
  } catch {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
