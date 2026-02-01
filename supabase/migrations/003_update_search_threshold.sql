-- Update default similarity threshold from 0.5 to 0.3 and match_count from 10 to 30
-- This makes the RAG pipeline less restrictive, returning more candidate chunks

CREATE OR REPLACE FUNCTION match_chunks_hybrid(
  query_embedding vector(1536),
  query_text TEXT,
  match_count INT DEFAULT 30,
  similarity_threshold FLOAT DEFAULT 0.3,
  filter_document_ids UUID[] DEFAULT NULL,
  use_mmr BOOLEAN DEFAULT true,
  mmr_diversity FLOAT DEFAULT 0.2
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
