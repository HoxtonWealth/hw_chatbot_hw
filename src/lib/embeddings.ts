import { generateEmbeddings as generateOpenAIEmbeddings } from './openai'
import { supabaseAdmin } from './supabase'

const BATCH_SIZE = 100
const MAX_RETRIES = 3
const BACKOFF_DELAYS = [1000, 5000, 15000] // milliseconds

export interface ChunkToEmbed {
  id: string
  content: string
}

export interface EmbeddingResult {
  chunkId: string
  embedding: number[]
  tokenCount: number
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('rate_limit') ||
           error.message.includes('429') ||
           error.message.includes('Rate limit')
  }
  return false
}

function isTimeoutError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('timeout') ||
           error.message.includes('ETIMEDOUT') ||
           error.message.includes('ECONNRESET')
  }
  return false
}

async function generateEmbeddingsWithRetry(
  texts: string[]
): Promise<number[][]> {
  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await generateOpenAIEmbeddings(texts)
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      if (attempt === MAX_RETRIES - 1) {
        throw lastError
      }

      if (isRateLimitError(error) || isTimeoutError(error)) {
        console.log(`Retry attempt ${attempt + 1} after ${BACKOFF_DELAYS[attempt]}ms`)
        await sleep(BACKOFF_DELAYS[attempt])
        continue
      }

      // Non-retryable error
      throw lastError
    }
  }

  throw lastError || new Error('Unknown embedding error')
}

export async function generateAndStoreEmbeddings(
  documentId: string,
  chunks: ChunkToEmbed[],
  onProgress?: (progress: number) => void
): Promise<{ success: boolean; processedCount: number; failedCount: number }> {
  let processedCount = 0
  let failedCount = 0

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE)
    const texts = batch.map(c => c.content)

    try {
      const embeddings = await generateEmbeddingsWithRetry(texts)

      // Store embeddings in database
      for (let j = 0; j < batch.length; j++) {
        const chunk = batch[j]
        const embedding = embeddings[j]
        const tokenCount = Math.ceil(chunk.content.length / 4)

        const { error } = await supabaseAdmin
          .from('document_chunks')
          .update({
            embedding: JSON.stringify(embedding),
            token_count: tokenCount,
          })
          .eq('id', chunk.id)

        if (error) {
          console.error(`Failed to store embedding for chunk ${chunk.id}:`, error)
          failedCount++
        } else {
          processedCount++
        }
      }
    } catch (error) {
      console.error(`Batch embedding failed at index ${i}:`, error)
      failedCount += batch.length
    }

    // Report progress
    if (onProgress) {
      const progress = Math.round(((i + batch.length) / chunks.length) * 100)
      onProgress(progress)
    }
  }

  return {
    success: failedCount === 0,
    processedCount,
    failedCount,
  }
}

export async function generateEmbeddingsForDocument(
  documentId: string
): Promise<{ success: boolean; processedCount: number; failedCount: number }> {
  // Get all chunks for this document that need embeddings
  const { data: chunks, error } = await supabaseAdmin
    .from('document_chunks')
    .select('id, content')
    .eq('document_id', documentId)
    .eq('level', 'chunk')
    .is('embedding', null)

  if (error) {
    console.error('Failed to fetch chunks:', error)
    return { success: false, processedCount: 0, failedCount: 0 }
  }

  if (!chunks || chunks.length === 0) {
    return { success: true, processedCount: 0, failedCount: 0 }
  }

  return generateAndStoreEmbeddings(
    documentId,
    chunks as ChunkToEmbed[],
    (progress) => {
      console.log(`Embedding progress for ${documentId}: ${progress}%`)
    }
  )
}
