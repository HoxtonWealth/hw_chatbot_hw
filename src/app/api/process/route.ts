import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { extractPDF, PDFEncryptedError } from '@/lib/extraction/pdf'
import { extractDocx } from '@/lib/extraction/docx'
import { extractText } from '@/lib/extraction/text'
import { extractSpreadsheet, extractCSV } from '@/lib/extraction/xlsx'
import { chunkWithSections } from '@/lib/chunking/semantic'
import { buildHierarchy, flattenHierarchy } from '@/lib/chunking/hierarchy'
import { generateEmbeddingsForDocument } from '@/lib/embeddings'
import { extractGlossaryTerms } from '@/lib/glossary'

export async function POST(request: NextRequest) {
  let documentId: string | undefined

  try {
    const body = await request.json()
    documentId = body.documentId

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: { code: 'E100', message: 'Document ID required' } },
        { status: 400 }
      )
    }

    // Fetch document record
    const { data: document, error: docError } = await supabaseAdmin
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json(
        { success: false, error: { code: 'E100', message: 'Document not found' } },
        { status: 404 }
      )
    }

    // Update status to processing
    await supabaseAdmin
      .from('documents')
      .update({ status: 'processing' })
      .eq('id', documentId)

    // Download file from storage
    const { data: fileData, error: storageError } = await supabaseAdmin
      .storage
      .from('documents')
      .download(document.file_path)

    if (storageError || !fileData) {
      await updateDocumentError(documentId, 'E105', 'Failed to download file from storage')
      return NextResponse.json(
        { success: false, error: { code: 'E105', message: 'Failed to download file' } },
        { status: 500 }
      )
    }

    const buffer = Buffer.from(await fileData.arrayBuffer())
    let sections: Array<{ header?: string; content: string; pageNumber?: number }> = []
    let fullText = ''

    // Extract based on file type
    try {
      switch (document.source_type) {
        case 'pdf': {
          const pdfResult = await extractPDF(buffer)

          if (pdfResult.isScanned) {
            // For now, we'll skip OCR and just warn
            // In production, integrate with an OCR service
            console.warn('Scanned PDF detected, OCR not implemented')
          }

          sections = pdfResult.pages.map(page => ({
            content: page.content,
            pageNumber: page.pageNumber,
          }))
          fullText = pdfResult.pages.map(p => p.content).join('\n\n')
          break
        }

        case 'docx': {
          const docxResult = await extractDocx(buffer)
          sections = docxResult.sections.map(section => ({
            header: section.header,
            content: section.content,
          }))
          fullText = docxResult.fullText
          break
        }

        case 'text':
        case 'md': {
          const textContent = buffer.toString('utf-8')
          const textResult = extractText(textContent)
          sections = textResult.sections.map(section => ({
            header: section.header,
            content: section.content,
          }))
          fullText = textResult.fullText
          break
        }

        case 'xlsx': {
          const xlsxResult = extractSpreadsheet(buffer)
          if (xlsxResult.truncated) {
            console.warn(`Spreadsheet truncated: exceeded row limit for document ${documentId}`)
          }
          sections = xlsxResult.sections.map(section => ({
            header: section.header,
            content: section.content,
          }))
          fullText = xlsxResult.fullText
          break
        }

        case 'csv': {
          const csvResult = extractCSV(buffer)
          if (csvResult.truncated) {
            console.warn(`CSV truncated: exceeded row limit for document ${documentId}`)
          }
          sections = csvResult.sections.map(section => ({
            header: section.header,
            content: section.content,
          }))
          fullText = csvResult.fullText
          break
        }

        default:
          await updateDocumentError(documentId, 'E103', `Unsupported file type: ${document.source_type}`)
          return NextResponse.json(
            { success: false, error: { code: 'E103', message: 'Unsupported file type' } },
            { status: 400 }
          )
      }
    } catch (error) {
      if (error instanceof PDFEncryptedError) {
        await updateDocumentError(documentId, 'E107', 'PDF is password protected')
        return NextResponse.json(
          { success: false, error: { code: 'E107', message: 'PDF is password protected' } },
          { status: 400 }
        )
      }
      throw error
    }

    // Check if we got any content
    if (!fullText.trim()) {
      await updateDocumentError(documentId, 'E201', 'No text content extracted')
      return NextResponse.json(
        { success: false, error: { code: 'E201', message: 'No text content extracted' } },
        { status: 400 }
      )
    }

    // Chunk the content
    const chunks = chunkWithSections(sections)

    // Build hierarchy
    const hierarchy = buildHierarchy(
      document.title,
      fullText,
      sections,
      chunks
    )

    // Store chunks in database
    const flatNodes = flattenHierarchy(hierarchy)

    // Insert document-level node first
    const { data: docChunk, error: docChunkError } = await supabaseAdmin
      .from('document_chunks')
      .insert({
        document_id: documentId,
        level: 'document',
        chunk_index: 0,
        content: hierarchy.document.content.slice(0, 10000), // Limit for document level
        summary: hierarchy.document.summary,
        token_count: hierarchy.document.tokenCount,
        metadata: {},
      })
      .select()
      .single()

    if (docChunkError) {
      console.error('Document chunk error:', docChunkError)
      await updateDocumentError(documentId, 'E202', 'Failed to store document chunk')
      return NextResponse.json(
        { success: false, error: { code: 'E202', message: 'Failed to store chunks' } },
        { status: 500 }
      )
    }

    // Insert section-level nodes
    const sectionChunkIds: Record<number, string> = {}
    for (let i = 0; i < hierarchy.sections.length; i++) {
      const section = hierarchy.sections[i]
      const { data: sectionChunk, error: sectionError } = await supabaseAdmin
        .from('document_chunks')
        .insert({
          document_id: documentId,
          level: 'section',
          parent_chunk_id: docChunk.id,
          chunk_index: i,
          content: section.content,
          summary: section.summary,
          section_header: section.sectionHeader,
          token_count: section.tokenCount,
          metadata: {},
        })
        .select()
        .single()

      if (!sectionError && sectionChunk) {
        sectionChunkIds[i] = sectionChunk.id
      }
    }

    // Insert chunk-level nodes
    const chunkInserts = hierarchy.chunks.map((chunk, index) => {
      // Find parent section by matching section header
      const parentSectionIndex = hierarchy.sections.findIndex(
        s => s.sectionHeader === chunk.sectionHeader
      )
      const parentId = parentSectionIndex >= 0
        ? sectionChunkIds[parentSectionIndex]
        : docChunk.id

      return {
        document_id: documentId,
        level: 'chunk' as const,
        parent_chunk_id: parentId,
        chunk_index: index,
        content: chunk.content,
        section_header: chunk.sectionHeader,
        page_number: chunk.pageNumber,
        token_count: chunk.tokenCount,
        metadata: {},
      }
    })

    const { error: chunksError } = await supabaseAdmin
      .from('document_chunks')
      .insert(chunkInserts)

    if (chunksError) {
      console.error('Chunks insert error:', chunksError)
      await updateDocumentError(documentId, 'E202', 'Failed to store chunks')
      return NextResponse.json(
        { success: false, error: { code: 'E202', message: 'Failed to store chunks' } },
        { status: 500 }
      )
    }

    // Generate embeddings for chunks
    const embeddingResult = await generateEmbeddingsForDocument(documentId)

    if (!embeddingResult.success) {
      // Partial success - mark as completed but log the issue
      console.warn(`Embedding generation had ${embeddingResult.failedCount} failures`)
    }

    // Extract glossary terms (non-blocking, fire-and-forget)
    // Concatenate first 3 chunks to keep costs down
    const glossaryContent = chunkInserts
      .slice(0, 3)
      .map((c) => c.content)
      .join('\n\n')

    if (glossaryContent.trim()) {
      extractGlossaryTerms(glossaryContent, documentId).catch((err) => {
        console.warn('Glossary extraction failed (non-blocking):', err)
      })
    }

    // Update document status to completed
    await supabaseAdmin
      .from('documents')
      .update({
        status: 'completed',
        chunk_count: chunkInserts.length,
        error_code: null,
        error_message: null,
      })
      .eq('id', documentId)

    return NextResponse.json({
      success: true,
      document: {
        id: documentId,
        status: 'completed',
        chunkCount: chunkInserts.length,
        embeddingsGenerated: embeddingResult.processedCount,
      },
    })
  } catch (error) {
    console.error('Processing error:', error)

    if (documentId) {
      await updateDocumentError(
        documentId,
        'E200',
        error instanceof Error ? error.message : 'Processing failed'
      )
    }

    return NextResponse.json(
      { success: false, error: { code: 'E200', message: 'Processing failed' } },
      { status: 500 }
    )
  }
}

async function updateDocumentError(
  documentId: string,
  errorCode: string,
  errorMessage: string
) {
  await supabaseAdmin
    .from('documents')
    .update({
      status: 'failed',
      error_code: errorCode,
      error_message: errorMessage,
    })
    .eq('id', documentId)
}
