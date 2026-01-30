import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Client-side Supabase client (uses anon key)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side Supabase client (uses service role key for admin operations)
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Type definitions for database tables
export interface Document {
  id: string
  title: string
  source_type: 'pdf' | 'url' | 'text' | 'docx' | 'md'
  source_url?: string
  file_name?: string
  file_path?: string
  file_size?: number
  file_hash?: string
  chunk_count: number
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial'
  error_code?: string
  error_message?: string
  retry_count: number
  language: string
  priority: number
  version: number
  created_at: string
  updated_at: string
}

export interface DocumentChunk {
  id: string
  document_id: string
  level: 'document' | 'section' | 'chunk'
  parent_chunk_id?: string
  chunk_index: number
  content: string
  summary?: string
  page_number?: number
  section_header?: string
  embedding?: number[]
  token_count?: number
  metadata: Record<string, unknown>
  created_at: string
}

export interface Conversation {
  id: string
  title?: string
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  sources?: Record<string, unknown>[]
  confidence_score?: number
  chunks_used?: string[]
  command?: string
  created_at: string
}

export interface Feedback {
  id: string
  message_id: string
  rating: -1 | 1
  comment?: string
  created_at: string
}

export interface QueryLog {
  id: string
  conversation_id?: string
  query_text: string
  query_embedding?: number[]
  expanded_queries?: string[]
  chunks_retrieved?: string[]
  similarity_scores?: number[]
  retrieval_method?: string
  retrieval_latency_ms?: number
  generation_latency_ms?: number
  total_latency_ms?: number
  filters?: Record<string, unknown>
  created_at: string
}

export interface GlossaryEntry {
  id: string
  term: string
  definition: string
  source_document_id?: string
  documents?: { title: string } | null
  auto_extracted: boolean
  created_at: string
}
