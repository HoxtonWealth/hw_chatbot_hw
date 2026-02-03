import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

const ALLOWED_TYPES = [
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]

const MAX_SIZE = 50 * 1024 * 1024 // 50MB

function getSourceType(mimeType: string): 'pdf' | 'text' | 'docx' | 'md' | 'xlsx' | 'csv' {
  switch (mimeType) {
    case 'application/pdf':
      return 'pdf'
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return 'docx'
    case 'text/markdown':
      return 'md'
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'application/vnd.ms-excel':
      return 'xlsx'
    case 'text/csv':
      return 'csv'
    default:
      return 'text'
  }
}

// GET: Create a signed upload URL for direct client-to-storage upload
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const fileName = searchParams.get('fileName')
    const fileType = searchParams.get('fileType')
    const fileSize = parseInt(searchParams.get('fileSize') || '0')

    if (!fileName || !fileType) {
      return NextResponse.json(
        { success: false, error: { code: 'E101', message: 'fileName and fileType are required' } },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(fileType)) {
      return NextResponse.json(
        { success: false, error: { code: 'E103', message: 'Invalid file type. Accepted: PDF, TXT, DOCX, MD, XLSX, XLS, CSV' } },
        { status: 400 }
      )
    }

    if (fileSize > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: { code: 'E104', message: 'File exceeds 50MB limit' } },
        { status: 400 }
      )
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `documents/${crypto.randomUUID()}-${safeName}`

    const { data, error } = await supabaseAdmin.storage
      .from('documents')
      .createSignedUploadUrl(storagePath)

    if (error) {
      console.error('[ingest] Signed URL error:', error)
      return NextResponse.json(
        { success: false, error: { code: 'E105', message: 'Failed to create upload URL' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      signedUrl: data.signedUrl,
      token: data.token,
      path: storagePath,
    })
  } catch (error) {
    console.error('Signed URL error:', error)
    return NextResponse.json(
      { success: false, error: { code: 'E100', message: 'Internal server error' } },
      { status: 500 }
    )
  }
}

// POST: Register an already-uploaded file and trigger processing
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || ''

    // New JSON-based flow: file already uploaded to storage
    if (contentType.includes('application/json')) {
      const body = await request.json()
      const { storagePath, fileName, fileType, fileSize, replace } = body

      if (!storagePath || !fileName || !fileType) {
        return NextResponse.json(
          { success: false, error: { code: 'E101', message: 'storagePath, fileName, and fileType are required' } },
          { status: 400 }
        )
      }

      // Check for duplicate by filename
      const { data: existingByName } = await supabaseAdmin
        .from('documents')
        .select('id')
        .eq('file_name', fileName)
        .single()

      if (existingByName && !replace) {
        // Clean up the uploaded file since we're rejecting
        await supabaseAdmin.storage.from('documents').remove([storagePath])
        return NextResponse.json(
          {
            success: false,
            error: { code: 'E102', message: 'A file with this name already exists' },
            existingId: existingByName.id
          },
          { status: 409 }
        )
      }

      if (existingByName && replace) {
        await supabaseAdmin.from('documents').delete().eq('id', existingByName.id)
      }

      // Download file from storage to calculate hash
      const { data: fileData } = await supabaseAdmin.storage
        .from('documents')
        .download(storagePath)

      const hash = fileData
        ? crypto.createHash('sha256').update(Buffer.from(await fileData.arrayBuffer())).digest('hex')
        : crypto.randomUUID()

      // Create document record
      const { data: document, error: dbError } = await supabaseAdmin
        .from('documents')
        .insert({
          title: fileName.replace(/\.[^/.]+$/, ''),
          source_type: getSourceType(fileType),
          file_name: fileName,
          file_path: storagePath,
          file_size: fileSize || 0,
          file_hash: hash,
          status: 'pending',
        })
        .select()
        .single()

      if (dbError) {
        console.error('Database error:', dbError)
        await supabaseAdmin.storage.from('documents').remove([storagePath])
        return NextResponse.json(
          { success: false, error: { code: 'E106', message: 'Failed to create document record' } },
          { status: 500 }
        )
      }

      triggerProcessing(document.id, request.url).catch(console.error)

      return NextResponse.json({
        success: true,
        document: { id: document.id, title: document.title, status: document.status },
      })
    }

    // Legacy FormData flow (for small files / local dev)
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const replace = formData.get('replace') === 'true'

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: 'E101', message: 'No file provided' } },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: { code: 'E103', message: 'Invalid file type. Accepted: PDF, TXT, DOCX, MD, XLSX, XLS, CSV' } },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { success: false, error: { code: 'E104', message: 'File exceeds 50MB limit' } },
        { status: 400 }
      )
    }

    const arrayBuffer = await file.arrayBuffer()
    const hash = crypto.createHash('sha256').update(Buffer.from(arrayBuffer)).digest('hex')

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

    if (existingByName && replace) {
      await supabaseAdmin.from('documents').delete().eq('id', existingByName.id)
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const storagePath = `documents/${crypto.randomUUID()}-${safeName}`

    const { error: storageError } = await supabaseAdmin
      .storage
      .from('documents')
      .upload(storagePath, arrayBuffer, { contentType: file.type, upsert: false })

    if (storageError) {
      console.error('[ingest] Storage upload FAILED:', storageError)
      return NextResponse.json(
        { success: false, error: { code: 'E105', message: 'Failed to upload file to storage', detail: storageError.message } },
        { status: 500 }
      )
    }

    const { data: document, error: dbError } = await supabaseAdmin
      .from('documents')
      .insert({
        title: file.name.replace(/\.[^/.]+$/, ''),
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
      await supabaseAdmin.storage.from('documents').remove([storagePath])
      return NextResponse.json(
        { success: false, error: { code: 'E106', message: 'Failed to create document record' } },
        { status: 500 }
      )
    }

    triggerProcessing(document.id, request.url).catch(console.error)

    return NextResponse.json({
      success: true,
      document: { id: document.id, title: document.title, status: document.status },
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
