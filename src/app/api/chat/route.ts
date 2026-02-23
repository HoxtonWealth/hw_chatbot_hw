import { streamText } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { NextRequest } from 'next/server'
import { retrieveContext } from '@/lib/retrieval/pipeline'
import { RETRIEVAL_CONFIG } from '@/lib/retrieval/config'
import { buildRAGPrompt, buildEmptyContextPrompt, generateFollowUpSuggestions } from '@/lib/rag'
import { supabaseAdmin } from '@/lib/supabase'

export const maxDuration = 30 // 30 second timeout

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const body = await request.json()
    const { message, conversationId, documentIds, messageCount = 0 } = body

    if (!message?.trim()) {
      return new Response(
        JSON.stringify({ error: 'Message is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // 1. Retrieve relevant context
    const retrievalStartTime = Date.now()
    const { chunks, queryVariants, totalCandidates } = await retrieveContext(
      message,
      documentIds,
      { expandQueries: RETRIEVAL_CONFIG.expandQueries, useReranking: RETRIEVAL_CONFIG.useReranking, topK: RETRIEVAL_CONFIG.topK }
    )
    const retrievalTime = Date.now() - retrievalStartTime

    // 2. Build prompt
    const hasContext = chunks.length > 0
    const ragResult = hasContext ? buildRAGPrompt(chunks, messageCount) : null
    const systemPrompt = ragResult
      ? ragResult.systemPrompt
      : buildEmptyContextPrompt(messageCount)
    const sources = ragResult?.sources ?? []
    const confidence = ragResult?.confidence ?? 0

    const followUpSuggestions = generateFollowUpSuggestions(chunks, messageCount)

    // 3. Stream response
    const result = streamText({
      model: createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })(process.env.CHAT_MODEL || 'openai/gpt-4o-mini'),
      system: systemPrompt,
      messages: [{ role: 'user' as const, content: message }],
      onFinish: async () => {
        // Log query metrics
        try {
          await supabaseAdmin.from('query_logs').insert({
            conversation_id: conversationId || null,
            query_text: message,
            expanded_queries: queryVariants,
            chunks_retrieved: chunks.map(c => c.id),
            similarity_scores: chunks.map(c => c.combined_score),
            retrieval_method: 'hybrid',
            retrieval_latency_ms: retrievalTime,
            generation_latency_ms: Date.now() - startTime - retrievalTime,
            total_latency_ms: Date.now() - startTime,
          })
        } catch (logError) {
          console.error('Failed to log query metrics:', logError)
        }
      },
    })

    // Return streaming response with metadata in a custom format
    const stream = result.textStream

    // Create response with sources in first chunk
    const encoder = new TextEncoder()
    const metadataChunk = JSON.stringify({
      type: 'metadata',
      sources,
      confidence,
      suggestions: followUpSuggestions,
      retrievalTime,
      totalCandidates,
    })

    const readable = new ReadableStream({
      async start(controller) {
        // Send metadata first
        controller.enqueue(encoder.encode(`data: ${metadataChunk}\n\n`))

        // Stream text chunks
        for await (const chunk of stream) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: chunk })}\n\n`))
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'An error occurred'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
