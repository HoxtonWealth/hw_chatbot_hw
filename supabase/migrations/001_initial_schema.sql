-- GTM Knowledge Base - Initial Schema
-- Run this migration in Supabase SQL Editor or via CLI

------------------------------------------------------------
-- EXTENSIONS
------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

------------------------------------------------------------
-- DOCUMENTS
------------------------------------------------------------
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('pdf', 'url', 'text', 'docx', 'md')),
  source_url TEXT,
  file_name TEXT,
  file_path TEXT,
  file_size INTEGER,
  file_hash TEXT,
  chunk_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'partial'
  )),
  error_code TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  language TEXT DEFAULT 'en',
  priority INTEGER DEFAULT 0,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- DOCUMENT CHUNKS (with Hierarchy)
------------------------------------------------------------
CREATE TABLE document_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('document', 'section', 'chunk')),
  parent_chunk_id UUID REFERENCES document_chunks(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  page_number INTEGER,
  section_header TEXT,
  embedding vector(1536),
  token_count INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- DOCUMENT TABLES (Extracted structured data)
------------------------------------------------------------
CREATE TABLE document_tables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chunk_id UUID REFERENCES document_chunks(id) ON DELETE CASCADE,
  page_number INTEGER,
  table_data JSONB NOT NULL,
  table_text TEXT,
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- CONVERSATIONS
------------------------------------------------------------
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- MESSAGES
------------------------------------------------------------
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  sources JSONB,
  confidence_score FLOAT,
  chunks_used UUID[],
  command TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- FEEDBACK
------------------------------------------------------------
CREATE TABLE feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating IN (-1, 1)),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- QUERY LOGS (Analytics & Debugging)
------------------------------------------------------------
CREATE TABLE query_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  query_text TEXT NOT NULL,
  query_embedding vector(1536),
  expanded_queries TEXT[],
  chunks_retrieved UUID[],
  similarity_scores FLOAT[],
  retrieval_method TEXT,
  retrieval_latency_ms INTEGER,
  generation_latency_ms INTEGER,
  total_latency_ms INTEGER,
  filters JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- GLOSSARY (Domain Terms)
------------------------------------------------------------
CREATE TABLE glossary (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  term TEXT NOT NULL UNIQUE,
  definition TEXT NOT NULL,
  source_document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  auto_extracted BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- INDEXES
------------------------------------------------------------

-- Document indexes
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_hash ON documents(file_hash);
CREATE INDEX idx_documents_created ON documents(created_at DESC);

-- Chunk indexes
CREATE INDEX idx_chunks_document ON document_chunks(document_id);
CREATE INDEX idx_chunks_level ON document_chunks(level);
CREATE INDEX idx_chunks_parent ON document_chunks(parent_chunk_id);

-- HNSW vector index for fast similarity search
CREATE INDEX idx_chunks_embedding ON document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- GIN index for hybrid text search
CREATE INDEX idx_chunks_content_trgm ON document_chunks
  USING gin (content gin_trgm_ops);

-- Table indexes
CREATE INDEX idx_tables_document ON document_tables(document_id);
CREATE INDEX idx_tables_embedding ON document_tables
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Conversation indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- Analytics indexes
CREATE INDEX idx_query_logs_created ON query_logs(created_at DESC);
CREATE INDEX idx_feedback_message ON feedback(message_id);

-- Glossary indexes
CREATE INDEX idx_glossary_term ON glossary(term);

------------------------------------------------------------
-- FUNCTIONS
------------------------------------------------------------

-- Enhanced similarity search with hybrid scoring
CREATE OR REPLACE FUNCTION match_chunks_hybrid(
  query_embedding vector(1536),
  query_text TEXT,
  match_count INT DEFAULT 10,
  similarity_threshold FLOAT DEFAULT 0.5,
  filter_document_ids UUID[] DEFAULT NULL,
  use_mmr BOOLEAN DEFAULT true,
  mmr_diversity FLOAT DEFAULT 0.3
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  content TEXT,
  summary TEXT,
  page_number INTEGER,
  section_header TEXT,
  similarity FLOAT,
  keyword_score FLOAT,
  combined_score FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_results AS (
    SELECT
      dc.id,
      dc.document_id,
      dc.content,
      dc.summary,
      dc.page_number,
      dc.section_header,
      1 - (dc.embedding <=> query_embedding) AS similarity
    FROM document_chunks dc
    WHERE
      dc.level = 'chunk'
      AND dc.embedding IS NOT NULL
      AND (filter_document_ids IS NULL OR dc.document_id = ANY(filter_document_ids))
      AND 1 - (dc.embedding <=> query_embedding) >= similarity_threshold
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count * 2
  ),
  keyword_results AS (
    SELECT
      dc.id,
      similarity(dc.content, query_text) AS keyword_score
    FROM document_chunks dc
    WHERE
      dc.level = 'chunk'
      AND dc.content % query_text
  )
  SELECT
    vr.id,
    vr.document_id,
    vr.content,
    vr.summary,
    vr.page_number,
    vr.section_header,
    vr.similarity,
    COALESCE(kr.keyword_score, 0::FLOAT) AS keyword_score,
    (vr.similarity * 0.7 + COALESCE(kr.keyword_score, 0) * 0.3)::FLOAT AS combined_score
  FROM vector_results vr
  LEFT JOIN keyword_results kr ON vr.id = kr.id
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;

-- Get parent chunks for context retrieval
CREATE OR REPLACE FUNCTION get_chunk_with_parents(
  chunk_id UUID
)
RETURNS TABLE (
  id UUID,
  level TEXT,
  content TEXT,
  summary TEXT
)
LANGUAGE sql
AS $$
  WITH RECURSIVE chunk_tree AS (
    SELECT dc.id, dc.level, dc.content, dc.summary, dc.parent_chunk_id
    FROM document_chunks dc
    WHERE dc.id = chunk_id

    UNION ALL

    SELECT dc.id, dc.level, dc.content, dc.summary, dc.parent_chunk_id
    FROM document_chunks dc
    INNER JOIN chunk_tree ct ON dc.id = ct.parent_chunk_id
  )
  SELECT ct.id, ct.level, ct.content, ct.summary
  FROM chunk_tree ct
  ORDER BY
    CASE ct.level
      WHEN 'document' THEN 1
      WHEN 'section' THEN 2
      WHEN 'chunk' THEN 3
    END;
$$;

------------------------------------------------------------
-- TRIGGERS
------------------------------------------------------------

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

------------------------------------------------------------
-- ROW LEVEL SECURITY (Optional - enable if needed)
------------------------------------------------------------

-- Enable RLS on tables (uncomment if using Supabase Auth)
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
