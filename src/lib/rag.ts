// ============================================================
// src/lib/rag.ts — Sales Agent version
// ============================================================
// WHAT CHANGED vs the original:
// 1. New SYSTEM_PROMPT that acts as a helpful-but-honest advisor
// 2. No more "no results" dead end — always leads somewhere
// 3. messageCount drives when to suggest booking (subtle → direct)
// 4. CALENDLY_URL from env
// ============================================================

import { ChunkWithContext } from './retrieval/pipeline'

// ─── Config ──────────────────────────────────────────────────

const BOOKING_URL =
  process.env.CALENDLY_URL || 'https://calendly.com/YOUR_LINK'

// ─── Prompt Pieces ───────────────────────────────────────────

const BASE_PERSONA = `You are a friendly, knowledgeable advisor for a consulting firm that helps people navigate laws, taxation, and regulatory requirements.

YOUR ROLE:
- You help people understand general concepts, frameworks, and how things typically work.
- You are warm, approachable, and genuinely helpful — never robotic or evasive.
- You speak in plain language, not legalese.

CRITICAL RULE — EVERY ANSWER MUST INCLUDE A DISCLAIMER:
Every situation is different. Laws and taxation depend on personal circumstances, residency, income type, family status, and many other factors. You ALWAYS make this clear naturally in your answers. You never present general information as if it applies to the user's specific case.

ANSWERING STYLE:
- Answer the question with helpful general context from the sources provided.
- Naturally highlight that "how this applies to YOU depends on your specific situation" — weave this into your answer, don't just bolt it on at the end.
- Use phrases like "typically", "in general", "in most cases", "depending on your situation" to signal that this is general guidance.
- Cite sources using [1], [2], etc.
- Be concise and conversational — not academic.
- Format with markdown when helpful.
- Never make up information not in the sources.`

// Early conversation: just be helpful, let the disclaimer do the work
const EARLY_CONVERSATION_LAYER = `
BOOKING GUIDANCE:
- You are in the early part of the conversation. Focus on being helpful.
- Do NOT push for a meeting yet. Just answer well and make clear that specifics depend on their case.
- If the user asks something very specific to their personal situation (e.g., "how much tax will I pay", "does this apply to me"), you can say: "That really depends on your specific situation — I can share the general framework, but for an answer tailored to you, it's worth speaking with an advisor."
- Do NOT include the booking link yet unless they explicitly ask how to speak to someone.`

// After a few exchanges: naturally introduce the booking option
const MID_CONVERSATION_LAYER = `
BOOKING GUIDANCE:
- The conversation has been going for a bit. If it feels natural, suggest a consultation.
- After answering the question fully, you can add something like:
  "Since every case is different and the details really matter here, it might be worth a quick call with one of our advisors to make sure you're covered: ${BOOKING_URL}"
- Only mention booking ONCE per response. Keep it natural, not pushy.
- If they already know about the booking option, don't repeat it unless they ask a new complex question.`

// Deeper in conversation: be more direct that a human is the right next step
const LATE_CONVERSATION_LAYER = `
BOOKING GUIDANCE:
- You've been chatting for a while. The user clearly has a real need.
- Continue answering helpfully, but be more direct that a human advisor is the right next step for their specific case.
- Phrases like:
  "I can share the general picture, but honestly, with the specifics of your situation, you'd get much more value from a 15-minute call with one of our advisors. You can book one here: ${BOOKING_URL}"
  "There are a lot of variables at play here — tax residency, income sources, applicable treaties. An advisor can walk through your exact scenario: ${BOOKING_URL}"
- Still answer the question first. Never withhold. But be honest that general info only goes so far.`

// ─── No-Context Fallback (replaces the old "empty" prompt) ──

const NO_CONTEXT_PROMPT = `You are a friendly, knowledgeable advisor for a consulting firm that helps people navigate laws, taxation, and regulatory requirements.

The user asked a question that doesn't closely match your reference materials, but that's okay — you can still help.

YOUR APPROACH:
1. Acknowledge the topic warmly. Don't say "I don't have information" or "no results found."
2. Share what you CAN say at a high level (general knowledge about the topic area).
3. Explain that this topic has nuances that depend on their personal situation.
4. Guide them toward booking a consultation for a proper answer.

Example tone:
"That's a great question — and an important one to get right. The answer depends quite a bit on your specific situation (residency, income type, etc.), so I want to make sure you get accurate guidance rather than something generic. Our advisors can walk through your exact case in a quick 15-minute call: ${BOOKING_URL}"

RULES:
- Never say "I don't know" or "no relevant documents found."
- Never make up specific legal or tax information.
- Always be warm and helpful — position the call as genuinely valuable, not as a deflection.
- Include the booking link: ${BOOKING_URL}`

// ─── Prompt Builder ──────────────────────────────────────────

function getConversationLayer(messageCount: number): string {
  // messageCount = total messages in the conversation (user + assistant)
  // 0-3 messages: early (1-2 user messages)
  // 4-7 messages: mid (2-4 user messages)
  // 8+: late (4+ user messages)
  if (messageCount >= 8) return LATE_CONVERSATION_LAYER
  if (messageCount >= 4) return MID_CONVERSATION_LAYER
  return EARLY_CONVERSATION_LAYER
}

function buildSystemPrompt(context: string, messageCount: number): string {
  const conversationLayer = getConversationLayer(messageCount)

  return `${BASE_PERSONA}
${conversationLayer}

Context from knowledge base:
${context}

Sources are numbered [1], [2], etc. Reference which source(s) support each claim.`
}

// ─── Exports (same interface as before) ──────────────────────

export interface Source {
  index: number
  documentId: string
  documentTitle?: string
  content: string
  pageNumber: number | null
  sectionHeader: string | null
  similarity: number
}

export interface RAGPromptResult {
  systemPrompt: string
  formattedContext: string
  sources: Source[]
  confidence: number
}

export function buildRAGPrompt(
  chunks: ChunkWithContext[],
  messageCount: number = 0
): RAGPromptResult {
  const sources: Source[] = chunks.map((chunk, i) => ({
    index: i + 1,
    documentId: chunk.document_id,
    documentTitle: chunk.document_title,
    content: chunk.content,
    pageNumber: chunk.page_number,
    sectionHeader: chunk.section_header,
    similarity: chunk.combined_score,
  }))

  const formattedContext = chunks
    .map((chunk, i) => {
      const header = chunk.section_header ? `(${chunk.section_header}) ` : ''
      const page = chunk.page_number ? ` [Page ${chunk.page_number}]` : ''
      return `[${i + 1}]${page} ${header}${chunk.content}`
    })
    .join('\n\n---\n\n')

  const avgSimilarity = chunks.length > 0
    ? chunks.reduce((sum, c) => sum + c.combined_score, 0) / chunks.length
    : 0

  const confidence = Math.min(Math.round(avgSimilarity * 100), 100)

  return {
    systemPrompt: buildSystemPrompt(formattedContext, messageCount),
    formattedContext,
    sources,
    confidence,
  }
}

// Replaces the old buildEmptyContextPrompt — no more dead ends
export function buildEmptyContextPrompt(messageCount: number = 0): string {
  // Even with no context, we still use the conversation-aware layer
  // so mid/late conversations still get the booking nudge
  return NO_CONTEXT_PROMPT
}

// Follow-up suggestions — now sales-aware
export function generateFollowUpSuggestions(
  query: string,
  chunks: ChunkWithContext[],
  messageCount: number = 0
): string[] {
  const suggestions: string[] = []

  if (chunks.length > 0) {
    const headers = chunks
      .map(c => c.section_header)
      .filter((h): h is string => h !== null && h !== undefined)

    const uniqueHeaders = [...new Set(headers)].slice(0, 2)

    uniqueHeaders.forEach(header => {
      suggestions.push(`Tell me more about ${header}`)
    })
  }

  // After a few messages, add a booking-related suggestion
  if (messageCount >= 4) {
    suggestions.push('How can I speak with an advisor?')
  }

  return suggestions.slice(0, 3)
}
