import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const { data: document, error } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !document) {
      return NextResponse.json(
        { success: false, error: { code: 'E100', message: 'Document not found' } },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      document,
    })
  } catch (error) {
    console.error('Document API error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'E100', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get document to find storage path
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('file_path')
      .eq('id', id)
      .single()

    if (fetchError || !document) {
      return NextResponse.json(
        { success: false, error: { code: 'E100', message: 'Document not found' } },
        { status: 404 }
      )
    }

    // Delete from storage if file exists
    if (document.file_path) {
      await supabaseAdmin.storage
        .from('documents')
        .remove([document.file_path])
    }

    // Delete document (cascade will delete chunks)
    const { error: deleteError } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json(
        { success: false, error: { code: 'E100', message: 'Failed to delete document' } },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Document delete error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'E100', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}
