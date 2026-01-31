import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

const MAX_CONTENT_LENGTH = 100_000 // 100K characters

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, content, description } = body as {
      title?: string
      content?: string
      description?: string
    }

    // Validate required fields
    if (!title || !title.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'E101', message: 'Title is required' } },
        { status: 400 }
      )
    }

    if (!content || !content.trim()) {
      return NextResponse.json(
        { success: false, error: { code: 'E101', message: 'Content is required' } },
        { status: 400 }
      )
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      return NextResponse.json(
        { success: false, error: { code: 'E104', message: `Content exceeds ${MAX_CONTENT_LENGTH.toLocaleString()} character limit` } },
        { status: 400 }
      )
    }

    const trimmedTitle = title.trim()
    const trimmedContent = content.trim()

    // Calculate content hash for duplicate detection
    const hash = crypto.createHash('sha256').update(trimmedContent).digest('hex')

    // Check for duplicate by content hash
    const { data: existingByHash } = await supabaseAdmin
      .from('documents')
      .select('id, title')
      .eq('file_hash', hash)
      .single()

    if (existingByHash) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'E102',
            message: `Duplicate content detected — matches existing document "${existingByHash.title}"`,
          },
          existingId: existingByHash.id,
        },
        { status: 409 }
      )
    }

    // Also check by title
    const safeName = trimmedTitle.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileName = `${safeName}.txt`

    const { data: existingByName } = await supabaseAdmin
      .from('documents')
      .select('id')
      .eq('file_name', fileName)
      .single()

    if (existingByName) {
      return NextResponse.json(
        {
          success: false,
          error: { code: 'E102', message: 'A document with this title already exists' },
          existingId: existingByName.id,
        },
        { status: 409 }
      )
    }

    // Determine source type: check if content looks like markdown
    const isMarkdown = trimmedContent.includes('#') ||
      trimmedContent.includes('**') ||
      trimmedContent.includes('```') ||
      trimmedContent.includes('- [')
    const sourceType = isMarkdown ? 'md' : 'text'
    const contentType = isMarkdown ? 'text/markdown' : 'text/plain'

    // Prepend description as metadata if provided
    let fileContent = trimmedContent
    if (description?.trim()) {
      fileContent = `> ${description.trim()}\n\n${trimmedContent}`
    }

    // Store as a file in Supabase Storage for consistency
    const storagePath = `documents/${crypto.randomUUID()}-${safeName}.txt`
    const buffer = Buffer.from(fileContent, 'utf-8')

    const { error: storageError } = await supabaseAdmin
      .storage
      .from('documents')
      .upload(storagePath, buffer, {
        contentType,
        upsert: false,
      })

    if (storageError) {
      console.error('[ingest/text] Storage upload failed:', storageError)
      return NextResponse.json(
        { success: false, error: { code: 'E105', message: 'Failed to store content' } },
        { status: 500 }
      )
    }

    // Create document record
    const { data: document, error: dbError } = await supabaseAdmin
      .from('documents')
      .insert({
        title: trimmedTitle,
        source_type: sourceType,
        file_name: fileName,
        file_path: storagePath,
        file_size: buffer.byteLength,
        file_hash: hash,
        status: 'pending',
      })
      .select()
      .single()

    if (dbError) {
      console.error('[ingest/text] Database error:', dbError)
      await supabaseAdmin.storage.from('documents').remove([storagePath])
      return NextResponse.json(
        { success: false, error: { code: 'E106', message: 'Failed to create document record' } },
        { status: 500 }
      )
    }

    // Trigger processing asynchronously
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
    console.error('[ingest/text] Error:', error)
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
