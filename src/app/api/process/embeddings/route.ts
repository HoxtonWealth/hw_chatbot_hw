import { NextRequest, NextResponse } from 'next/server'
import { generateEmbeddingsForDocument } from '@/lib/embeddings'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    const { documentId } = await request.json()

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: 'documentId required' },
        { status: 400 }
      )
    }

    const result = await generateEmbeddingsForDocument(documentId)

    if (!result.success) {
      console.warn(`Embedding generation for ${documentId}: ${result.processedCount} ok, ${result.failedCount} failed`)
    }

    return NextResponse.json({
      success: true,
      processedCount: result.processedCount,
      failedCount: result.failedCount,
    })
  } catch (error) {
    console.error('Embeddings error:', error)
    return NextResponse.json(
      { success: false, error: 'Embedding generation failed' },
      { status: 500 }
    )
  }
}
