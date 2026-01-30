import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const { data: documents, error } = await supabaseAdmin
      .from('documents')
      .select('id, title, source_type, status, created_at, chunk_count, file_name')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching documents:', error)
      return NextResponse.json(
        { success: false, error: { code: 'E100', message: 'Failed to fetch documents' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      documents: documents || [],
    })
  } catch (error) {
    console.error('Documents API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'E100', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
