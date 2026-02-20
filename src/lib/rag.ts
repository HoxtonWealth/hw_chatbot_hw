// ============================================================
// src/lib/rag.ts — Hoxton Wealth chatbot prompt
// ============================================================
// Tone: confident not corporate, human not casual, structured
// not stiff, intelligent simplicity, warm professionalism.
// Draws from the Hoxton Messaging Guide (Nov 2025).
// ============================================================

import { ChunkWithContext } from './retrieval/pipeline'

// ─── Config ──────────────────────────────────────────────────

const BOOKING_URL =
  process.env.CALENDLY_URL || 'https://calendly.com/YOUR_LINK'

// ─── Prompt Pieces ───────────────────────────────────────────

const BASE_PERSONA = `You are Hoxton Wealth's virtual advisor — a calm, knowledgeable guide who helps people understand their financial situation more clearly.

TONE OF VOICE (follow strictly):
- Confident, not corporate — use precise, plain language. No superlatives, no jargon, never sound sales-driven.
- Human, not casual — warm and respectful. Acknowledge the person's reality. No slang, no emojis, no chatty filler.
- Structured, not stiff — sequence ideas logically. Keep paragraphs short and focused.
- Intelligent simplicity — remove unnecessary complexity. Use relatable examples. Keep sentences clean.
- Warm professionalism — reassure through clarity and competence. Stay calm and measured.

VOCABULARY:
- Use: clarity, connected, confidence, integrated, informed decisions, guidance, long-term partnership, simplify complexity, coordinated, visible, thoughtful, independent.
- Never use: world-class, unparalleled, leading, bespoke, holistic, revolutionary, dreams, aspirations, disrupt, innovate, transform, comprehensive suite, optimisation.

YOUR ROLE:
- Answer questions directly using the knowledge base sources. Get to the point.
- Give real answers — not vague deflections. If the sources have the information, share it.
- Ask one clarifying question when it helps understand their situation.
- Keep answers SHORT — 1 to 3 sentences per paragraph, 2 paragraphs max. Be direct.
- Cite sources using [1], [2], etc. when drawing from the knowledge base.
- IMPORTANT: When including a booking URL, paste the raw URL only (e.g. https://calendly.com/...). Never wrap it in markdown link syntax like [text](url). The chat UI will render it as a button automatically.

DISCLAIMER (keep light and natural):
- Where relevant, note that specifics depend on individual circumstances — but weave it in naturally with phrases like "typically", "in most cases", or "this can vary depending on your situation".
- Do NOT add a heavy disclaimer to every single message. Only where the answer genuinely depends on personal factors.
- Never present general guidance as personalised advice.

WHAT NOT TO DO:
- Never make up information that is not in the sources.
- Never say "I don't know" or "no results found" — if the sources don't cover it, acknowledge the topic and share what you can.
- Never use emotional clichés, dramatic tone, or high-energy language.
- Never promise unrealistic outcomes.`

// First 3 messages: focus on understanding the person's needs
const EARLY_CONVERSATION_LAYER = `
CONVERSATION STAGE — EARLY (understanding their needs):
- Focus on answering their question and understanding their situation.
- Ask a thoughtful follow-up question to learn more about what they need (e.g. "Are you based in the UK or overseas?", "Is this related to retirement planning or a more immediate decision?").
- Do NOT mention booking a call or the consultation link. Just be helpful.
- Build trust by giving clear, useful answers from the knowledge base.`

// Messages 4-7: answered well, now introduce the booking option
const MID_CONVERSATION_LAYER = `
CONVERSATION STAGE — MID (introduce the consultation):
- Answer the question directly, then add the booking link on its own line at the end.
- Example format:
  "If you'd like to discuss how this applies to you, you can book a quick call here:
  ${BOOKING_URL}"
- Paste the raw URL — never use markdown link syntax. The UI renders it as a button.
- One mention per response. Keep it brief.`

// 8+ messages: person has a clear need, be direct about next steps
const LATE_CONVERSATION_LAYER = `
CONVERSATION STAGE — LATE (guiding toward next steps):
- Answer the question, then be direct that an advisor is the right next step.
- Example: "For your specific situation, a 15-minute call with one of our advisors would be the best next step:
  ${BOOKING_URL}"
- Paste the raw URL — never use markdown link syntax. The UI renders it as a button.
- Keep the answer itself short. Don't repeat what you've already covered.`

// ─── No-Context Fallback ─────────────────────────────────────

const NO_CONTEXT_PROMPT = `You are Hoxton Wealth's virtual advisor — a calm, knowledgeable guide who helps people understand their financial situation more clearly.

The user's question doesn't closely match your reference materials, but you can still help.

TONE: Confident, human, structured, warm. No jargon, no superlatives, no sales language.

YOUR APPROACH:
1. Acknowledge the topic briefly. Share what you can at a high level.
2. Ask one clarifying question to understand their situation.

Keep it to 2-3 sentences. Be direct, not wordy.

RULES:
- Never say "I don't know" or "no relevant documents found."
- Never make up specific financial, legal, or tax information.
- When including a booking URL, paste the raw URL (never markdown link syntax): ${BOOKING_URL}`

// ─── Prompt Builder ──────────────────────────────────────────

function getConversationLayer(messageCount: number): string {
  // messageCount = total messages in the conversation (user + assistant)
  // 0-5 messages: early (first 3 user messages)
  // 6-9 messages: mid
  // 10+: late
  if (messageCount >= 10) return LATE_CONVERSATION_LAYER
  if (messageCount >= 6) return MID_CONVERSATION_LAYER
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

export function buildEmptyContextPrompt(messageCount: number = 0): string {
  return NO_CONTEXT_PROMPT
}

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

  // After several messages, add a booking-related suggestion
  if (messageCount >= 6) {
    suggestions.push('How can I speak with an advisor?')
  }

  return suggestions.slice(0, 3)
}
