import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

const MAX_SIZE = 50 * 1024 * 1024 // 50MB

function getSourceType(mimeType: string): 'pdf' | 'text' | 'docx' | 'md' {
  switch (mimeType) {
    case 'application/pdf':
      return 'pdf'
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'docx'
    case 'text/markdown':
      return 'md'
    default:
      return 'text'
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const replace = formData.get('replace') === 'true'

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'E101', message: 'No file provided' } },
        { status: 400 }
      )
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: { code: 'E103', message: 'Invalid file type. Accepted: PDF, TXT, DOCX, MD' } },
        { status: 400 }
      )
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: { code: 'E104', message: 'File exceeds 50MB limit' } },
        { status: 400 }
      )
    }

    // Calculate file hash
    const arrayBuffer = await file.arrayBuffer()
    const hash = crypto.createHash('sha256').update(Buffer.from(arrayBuffer)).digest('hex')

    // Check for duplicate by filename
    const { data: existingByName } = await supabaseAdmin
      .from('documents')
      .select('id')
      .eq('file_name', file.name)
      .single()

    if (existingByName && !replace) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'E102', message: 'A file with this name already exists' },
          existingId: existingByName.id
        },
        { status: 409 }
      )
    }

    // If replacing, delete the existing document
    if (existingByName && replace) {
      await supabaseAdmin
        .from('documents')
        .delete()
        .eq('id', existingByName.id)
    }

    // Upload to Supabase Storage
    const storagePath = `documents/${crypto.randomUUID()}-${file.name}`
    const { error: storageError } = await supabaseAdmin
      .storage
      .from('documents')
      .upload(storagePath, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      })

    if (storageError) {
      console.error('Storage error:', storageError)
      return NextResponse.json(
        { success: false, error: { code: 'E105', message: 'Failed to upload file to storage' } },
        { status: 500 }
      )
    }

    // Create document record
    const { data: document, error: dbError } = await supabaseAdmin
      .from('documents')
      .insert({
        title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension for title
        source_type: getSourceType(file.type),
        file_name: file.name,
        file_path: storagePath,
        file_size: file.size,
        file_hash: hash,
        status: 'pending',
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Clean up storage on failure
      await supabaseAdmin.storage.from('documents').remove([storagePath])
      return NextResponse.json(
        { success: false, error: { code: 'E106', message: 'Failed to create document record' } },
        { status: 500 }
      )
    }

    // Trigger document processing asynchronously
    // We don't await this - it runs in background
    triggerProcessing(document.id, request.url).catch(console.error)

    return NextResponse.json({
      success: true,
      document: {
        id: document.id,
        title: document.title,
        status: document.status,
      },
    })
  } catch (error) {
    console.error('Ingest error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'E100', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

async function triggerProcessing(documentId: string, requestUrl: string) {
  try {
    const baseUrl = new URL(requestUrl).origin
    await fetch(`${baseUrl}/api/process`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId }),
    })
  } catch (error) {
    console.error('Failed to trigger processing:', error)
  }
}
