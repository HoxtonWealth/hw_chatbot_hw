import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { messageId, rating, comment } = body

    // Validate required fields
    if (!messageId) {
      return NextResponse.json(
        { success: false, error: { code: 'E400', message: 'messageId is required' } },
        { status: 400 }
      )
    }

    // Validate rating is 1 or -1
    if (rating !== 1 && rating !== -1) {
      return NextResponse.json(
        { success: false, error: { code: 'E400', message: 'rating must be 1 or -1' } },
        { status: 400 }
      )
    }

    // Validate comment length if provided
    if (comment && typeof comment === 'string' && comment.length > 500) {
      return NextResponse.json(
        { success: false, error: { code: 'E400', message: 'comment must be 500 characters or less' } },
        { status: 400 }
      )
    }

    // Check if messageId is a valid UUID (messages may not be persisted to DB yet)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const isValidUuid = uuidRegex.test(messageId)

    // Insert feedback into database
    const { data, error } = await supabaseAdmin
      .from('feedback')
      .insert({
        message_id: isValidUuid ? messageId : null,
        rating,
        comment: comment || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting feedback:', error)
      return NextResponse.json(
        { success: false, error: { code: 'E500', message: 'Failed to save feedback' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      feedback: data,
    })
  } catch (error) {
    console.error('Feedback API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'E500', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
