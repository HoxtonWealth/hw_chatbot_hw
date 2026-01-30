# RAG Knowledge Base - Enriched Technical Specifications

> **Generated:** 2026-01-29
> **Purpose:** Production-grade RAG system specifications for PM handoff
> **Status:** Ready for implementation planning

---

## Executive Summary

**Original scope:** Basic RAG with document upload, vector search, and chat
**Enriched scope:** Production-grade RAG with advanced retrieval, comprehensive error handling, professional UX, and analytics

### Key Enhancements

| Category | Original Spec | Enriched Spec |
|----------|---------------|---------------|
| **Chunking** | Fixed 1000 chars | Semantic + hierarchical + tables |
| **Retrieval** | Basic vector search | Hybrid + reranking + MMR + query expansion |
| **Error Handling** | Basic status field | Full error codes + retry + resilience |
| **Database** | 2 tables | 8 tables with audit trail |
| **API** | 3 endpoints | 12 endpoints |
| **UX** | Basic chat | Citations + confidence + filters + export |
| **UI** | Unspecified | Full shadcn architecture |
| **Features** | None | Slash commands + glossary + dashboard |

---

## Table of Contents

1. [Technology Stack](#1-technology-stack)
2. [Enhanced Architecture](#2-enhanced-architecture)
3. [Database Schema](#3-enhanced-database-schema)
4. [Chunking & Retrieval Pipeline](#4-enhanced-chunking--retrieval-pipeline)
5. [Error Handling Specifications](#5-error-handling-specifications)
6. [Observability Specifications](#6-observability-specifications)
7. [API Specifications](#7-api-specifications)
8. [UI Component Architecture](#8-ui-component-architecture-shadcnui)
9. [Configuration & Limits](#9-configuration--limits)
10. [File Structure](#10-file-structure)
11. [Slash Commands](#11-slash-commands-specification)
12. [Confidence Breakdown](#12-confidence-breakdown-specification)
13. [NPM Dependencies](#13-npm-dependencies)
14. [Environment Variables](#14-environment-variables)

---

## 1. Technology Stack

| Component | Choice | Cost |
|-----------|--------|------|
| Vector + Metadata DB | Supabase pgvector | $0-25/mo |
| Embeddings | OpenAI text-embedding-3-small | ~$0.10-0.50/mo |
| LLM | OpenAI GPT-4o-mini | $5-20/mo |
| Framework | LangChain.js + Vercel AI SDK | Free |
| Hosting | Vercel | $0-20/mo |
| File Storage | Supabase Storage | Included |
| **UI Framework** | **shadcn/ui + Tailwind** | **Free** |

**Total: $5-65/month** (depending on usage)

### OpenAI Embedding Specs

| Property | Value |
|----------|-------|
| Model | text-embedding-3-small |
| Dimensions | 1536 |
| Max Input | 8191 tokens |
| Cost | $0.02 / 1M tokens |

**Cost Calculation for 1000 documents:**
- Avg 10 chunks per doc × 500 tokens = 5M tokens
- Initial embedding: $0.10
- Monthly queries (3000 × 500 tokens): $0.03/month

---

## 2. Enhanced Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS APP (VERCEL)                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  PAGES                                                                      │
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌───────────┐ │
│  │ /          │ │ /chat      │ │ /chat/[id] │ │ /documents │ │ /dashboard│ │
│  │ Landing +  │ │ New chat   │ │ Conversation│ │ Doc mgmt  │ │ KB Health │ │
│  │ Upload     │ │ interface  │ │ with history│ │ + filters │ │ Analytics │ │
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘ └───────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│  API ROUTES                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ POST     │ │ POST     │ │ GET/POST │ │ GET/DEL  │ │ POST     │          │
│  │ /ingest  │ │ /chat    │ │ /convo   │ │ /docs    │ │ /feedback│          │
│  ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤ ├──────────┤          │
│  │ POST     │ │ GET      │ │ GET      │ │ GET      │ │          │          │
│  │ /search  │ │ /health  │ │ /glossary│ │ /analytics          │          │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘          │
├─────────────────────────────────────────────────────────────────────────────┤
│  BACKGROUND JOBS (Queue System)                                             │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐               │
│  │ Document        │ │ Embedding       │ │ Glossary        │               │
│  │ Processing      │ │ Generation      │ │ Extraction      │               │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘               │
└───────────────────────────────┬─────────────────────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌──────────────┐        ┌──────────────┐        ┌──────────────┐
│   OPENAI     │        │   SUPABASE   │        │   SUPABASE   │
│              │        │   POSTGRES   │        │   STORAGE    │
│ - Embeddings │        │              │        │              │
│ - Chat LLM   │        │ - pgvector   │        │ - PDFs       │
│ - Summaries  │        │ - metadata   │        │ - Original   │
│              │        │ - chunks     │        │   files      │
│              │        │ - convos     │        │              │
│              │        │ - feedback   │        │              │
│              │        │ - logs       │        │              │
└──────────────┘        └──────────────┘        └──────────────┘
```

---

## 3. Enhanced Database Schema

```sql
-- Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;  -- For hybrid text search

------------------------------------------------------------
-- DOCUMENTS (Enhanced)
------------------------------------------------------------
CREATE TABLE documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('pdf', 'url', 'text', 'docx')),
  source_url TEXT,
  file_name TEXT,
  file_path TEXT,
  file_size INTEGER,
  file_hash TEXT,                        -- SHA-256 for deduplication
  chunk_count INTEGER DEFAULT 0,

  -- Processing status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed', 'partial'
  )),
  error_code TEXT,                       -- Structured error code
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Metadata
  language TEXT DEFAULT 'en',
  priority INTEGER DEFAULT 0,            -- Source authority ranking
  version INTEGER DEFAULT 1,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- DOCUMENT CHUNKS (Enhanced with Hierarchy)
------------------------------------------------------------
CREATE TABLE document_chunks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,

  -- Hierarchy
  level TEXT NOT NULL CHECK (level IN ('document', 'section', 'chunk')),
  parent_chunk_id UUID REFERENCES document_chunks(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,

  -- Content
  content TEXT NOT NULL,
  summary TEXT,                          -- LLM-generated summary

  -- Location
  page_number INTEGER,
  section_header TEXT,                   -- Preserved header for context

  -- Embeddings
  embedding vector(1536),

  -- Metadata
  token_count INTEGER,
  metadata JSONB DEFAULT '{}',           -- Topic tags, entities, etc.

  created_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- TABLES EXTRACTED (Structured data)
------------------------------------------------------------
CREATE TABLE document_tables (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
  chunk_id UUID REFERENCES document_chunks(id) ON DELETE CASCADE,
  page_number INTEGER,
  table_data JSONB NOT NULL,             -- Structured table as JSON
  table_text TEXT,                       -- Flattened text for search
  embedding vector(1536),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- CONVERSATIONS
------------------------------------------------------------
CREATE TABLE conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,                            -- Auto-generated or user-set
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

  -- Citation data (for assistant messages)
  sources JSONB,                         -- Array of source citations
  confidence_score FLOAT,                -- 0-1 confidence rating
  chunks_used UUID[],                    -- Chunk IDs used

  -- Slash command tracking
  command TEXT,                          -- e.g., '/compare', '/summarize'

  created_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- FEEDBACK
------------------------------------------------------------
CREATE TABLE feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating IN (-1, 1)),  -- 👎 = -1, 👍 = 1
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

------------------------------------------------------------
-- QUERY LOGS (Analytics & Debugging)
------------------------------------------------------------
CREATE TABLE query_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,

  -- Query info
  query_text TEXT NOT NULL,
  query_embedding vector(1536),
  expanded_queries TEXT[],               -- Query expansion variants

  -- Retrieval info
  chunks_retrieved UUID[],
  similarity_scores FLOAT[],
  retrieval_method TEXT,                 -- 'hybrid', 'vector', 'keyword'

  -- Performance
  retrieval_latency_ms INTEGER,
  generation_latency_ms INTEGER,
  total_latency_ms INTEGER,

  -- Filters applied
  filters JSONB,                         -- Document IDs, date range, etc.

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
-- AUDIT LOG
------------------------------------------------------------
CREATE TABLE audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,                  -- 'upload', 'delete', 'query', etc.
  entity_type TEXT NOT NULL,             -- 'document', 'conversation', etc.
  entity_id UUID,
  details JSONB,
  ip_address INET,
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

-- HNSW vector index
CREATE INDEX idx_chunks_embedding ON document_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- GIN index for hybrid text search
CREATE INDEX idx_chunks_content_trgm ON document_chunks
  USING gin (content gin_trgm_ops);

-- Conversation indexes
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);

-- Analytics indexes
CREATE INDEX idx_query_logs_created ON query_logs(created_at DESC);
CREATE INDEX idx_feedback_message ON feedback(message_id);

------------------------------------------------------------
-- FUNCTIONS
------------------------------------------------------------

-- Enhanced similarity search with hybrid + MMR
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
    COALESCE(kr.keyword_score, 0) AS keyword_score,
    (vr.similarity * 0.7 + COALESCE(kr.keyword_score, 0) * 0.3) AS combined_score
  FROM vector_results vr
  LEFT JOIN keyword_results kr ON vr.id = kr.id
  ORDER BY combined_score DESC
  LIMIT match_count;
END;
$$;

-- Get parent chunks for context
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
    SELECT id, level, content, summary, parent_chunk_id
    FROM document_chunks
    WHERE id = chunk_id

    UNION ALL

    SELECT dc.id, dc.level, dc.content, dc.summary, dc.parent_chunk_id
    FROM document_chunks dc
    INNER JOIN chunk_tree ct ON dc.id = ct.parent_chunk_id
  )
  SELECT id, level, content, summary
  FROM chunk_tree
  ORDER BY
    CASE level
      WHEN 'document' THEN 1
      WHEN 'section' THEN 2
      WHEN 'chunk' THEN 3
    END;
$$;

------------------------------------------------------------
-- TRIGGERS
------------------------------------------------------------

-- Auto-update updated_at
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
```

---

## 4. Enhanced Chunking & Retrieval Pipeline

### 4.1 Semantic Chunking Strategy

```typescript
interface ChunkingConfig {
  // Semantic boundaries
  useSemanticChunking: true;
  semanticModel: 'gpt-4o-mini';        // For boundary detection

  // Hierarchy levels
  levels: {
    document: {
      generateSummary: true;
      maxTokens: 500;
    };
    section: {
      detectHeaders: true;
      generateSummary: true;
      maxTokens: 300;
    };
    chunk: {
      targetSize: 1000;                // Target characters
      maxSize: 1500;                   // Hard limit
      overlap: 200;                    // For context continuity
      preserveHeader: true;            // Include section header
    };
  };

  // Special handling
  tableExtraction: {
    enabled: true;
    minRows: 2;
    storeAsJson: true;
    generateTextVersion: true;
  };

  // Metadata enrichment
  enrichment: {
    generateTopicTags: true;
    extractEntities: true;
    detectLanguage: true;
  };
}
```

### 4.2 Retrieval Pipeline

```typescript
interface RetrievalConfig {
  // Hybrid search
  hybridSearch: {
    enabled: true;
    vectorWeight: 0.7;
    keywordWeight: 0.3;
  };

  // Query processing
  queryExpansion: {
    enabled: true;
    variants: 3;                       // Generate 3 query variants
    model: 'gpt-4o-mini';
  };

  // Initial retrieval
  initialRetrieval: {
    count: 20;                         // Retrieve top 20
    similarityThreshold: 0.5;          // Minimum similarity
  };

  // Re-ranking
  reranking: {
    enabled: true;
    model: 'cross-encoder';            // Or use LLM-based
    topK: 5;                           // Final count after rerank
  };

  // MMR for diversity
  mmr: {
    enabled: true;
    diversityFactor: 0.3;              // 0 = pure relevance, 1 = max diversity
  };

  // Parent-child retrieval
  parentRetrieval: {
    enabled: true;
    includeParentSummary: true;
    includeSiblingChunks: false;       // Optional: adjacent chunks
  };

  // Confidence calculation
  confidence: {
    factors: ['similarity', 'sourceCount', 'recency', 'consistency'];
    weights: [0.4, 0.2, 0.2, 0.2];
  };
}
```

### 4.3 Retrieval Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     RETRIEVAL PIPELINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. QUERY PROCESSING                                            │
│     ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│     │ User Query  │ -> │ Query       │ -> │ Generate    │      │
│     │             │    │ Expansion   │    │ Embeddings  │      │
│     └─────────────┘    └─────────────┘    └─────────────┘      │
│                              │                                  │
│                              ▼                                  │
│                    ┌─────────────────────┐                      │
│                    │ 3 Query Variants    │                      │
│                    │ + Original Query    │                      │
│                    └─────────────────────┘                      │
│                                                                 │
│  2. HYBRID RETRIEVAL                                            │
│     ┌─────────────┐    ┌─────────────┐                         │
│     │ Vector      │    │ Keyword     │                         │
│     │ Search      │    │ Search      │                         │
│     │ (pgvector)  │    │ (pg_trgm)   │                         │
│     └──────┬──────┘    └──────┬──────┘                         │
│            │                  │                                 │
│            └────────┬─────────┘                                 │
│                     ▼                                           │
│            ┌─────────────────┐                                  │
│            │ Combine Scores  │                                  │
│            │ (70/30 weight)  │                                  │
│            └────────┬────────┘                                  │
│                     ▼                                           │
│            ┌─────────────────┐                                  │
│            │ Top 20 Chunks   │                                  │
│            └────────┬────────┘                                  │
│                                                                 │
│  3. POST-PROCESSING                                             │
│     ┌─────────────┐    ┌─────────────┐    ┌─────────────┐      │
│     │ Re-ranking  │ -> │ MMR         │ -> │ Parent      │      │
│     │ (cross-enc) │    │ Diversity   │    │ Retrieval   │      │
│     └─────────────┘    └─────────────┘    └─────────────┘      │
│                                                                 │
│  4. OUTPUT                                                      │
│     ┌─────────────────────────────────────────────────────┐    │
│     │ Top 5 Diverse, Re-ranked Chunks + Parent Context    │    │
│     └─────────────────────────────────────────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Error Handling Specifications

### 5.1 Error Codes

```typescript
enum ErrorCode {
  // Ingestion errors (1xx)
  FILE_TOO_LARGE = 'E101',
  FILE_CORRUPT = 'E102',
  FILE_EMPTY = 'E103',
  FILE_TYPE_UNSUPPORTED = 'E104',
  FILE_ENCODING_ERROR = 'E105',
  FILE_DUPLICATE = 'E106',
  FILE_PASSWORD_PROTECTED = 'E107',

  // Processing errors (2xx)
  PARSING_FAILED = 'E201',
  CHUNKING_FAILED = 'E202',
  EMBEDDING_FAILED = 'E203',
  EMBEDDING_TIMEOUT = 'E204',
  EMBEDDING_RATE_LIMITED = 'E205',
  STORAGE_FAILED = 'E206',
  PARTIAL_PROCESSING = 'E207',

  // Retrieval errors (3xx)
  NO_RELEVANT_CHUNKS = 'E301',
  LOW_CONFIDENCE = 'E302',
  CONTEXT_OVERFLOW = 'E303',
  QUERY_TIMEOUT = 'E304',

  // External service errors (4xx)
  OPENAI_UNAVAILABLE = 'E401',
  OPENAI_RATE_LIMITED = 'E402',
  SUPABASE_UNAVAILABLE = 'E403',
  STORAGE_QUOTA_EXCEEDED = 'E404',

  // System errors (5xx)
  INTERNAL_ERROR = 'E501',
  DATABASE_ERROR = 'E502',
  QUEUE_ERROR = 'E503',
}

interface ErrorResponse {
  success: false;
  error: {
    code: ErrorCode;
    message: string;                   // User-friendly message
    details?: string;                  // Technical details
    retryable: boolean;
    retryAfterMs?: number;
  };
}
```

### 5.2 Ingestion Resilience

```typescript
interface IngestionConfig {
  // File validation
  validation: {
    maxFileSizeMB: 50;
    allowedTypes: ['pdf', 'txt', 'md', 'docx'];
    checkEncoding: true;
    computeHash: true;                 // SHA-256 for deduplication
  };

  // Async processing
  queue: {
    enabled: true;
    maxConcurrent: 3;
    priorityLevels: ['high', 'normal', 'low'];
  };

  // Retry logic
  retry: {
    maxAttempts: 3;
    backoffMs: [1000, 5000, 15000];    // Exponential backoff
    retryableErrors: ['E203', 'E204', 'E205', 'E401', 'E402'];
  };

  // Partial success
  partialSuccess: {
    enabled: true;
    minSuccessRate: 0.8;               // 80% chunks must succeed
    savePartial: true;                 // Save successful chunks
    markForRetry: true;                // Queue failed chunks
  };

  // Timeouts
  timeouts: {
    fileUploadMs: 60000;               // 1 minute
    processingMs: 300000;              // 5 minutes total
    embeddingBatchMs: 30000;           // 30 seconds per batch
  };
}
```

### 5.3 Retrieval Resilience

```typescript
interface RetrievalResilienceConfig {
  // Confidence thresholds
  confidence: {
    highThreshold: 0.8;
    mediumThreshold: 0.6;
    lowThreshold: 0.4;
    rejectBelow: 0.3;
  };

  // Fallback responses
  fallbacks: {
    lowConfidence: "I found some information but I'm not fully confident. Here's what I found: {answer}. You may want to verify this in the source documents.";
    noRelevantChunks: "I don't have information about this topic in the current knowledge base. Try rephrasing your question or check if relevant documents have been uploaded.";
    systemError: "I'm having trouble accessing the knowledge base right now. Please try again in a moment.";
  };

  // Context management
  context: {
    maxTokens: 12000;                  // Leave room for response
    truncationStrategy: 'relevance';    // Keep highest relevance
    overflowWarning: true;
  };

  // Timeouts
  timeouts: {
    retrievalMs: 10000;
    generationMs: 30000;
    totalMs: 45000;
  };
}
```

### 5.4 User-Facing Error States

```typescript
interface UserErrorState {
  // Upload errors
  upload: {
    fileTooLarge: {
      title: "File too large";
      message: "Maximum file size is 50MB. Please compress or split your document.";
      action: "Choose a smaller file";
    };
    fileCorrupt: {
      title: "Unable to read file";
      message: "This file appears to be corrupted or password-protected.";
      action: "Try a different file";
    };
    duplicate: {
      title: "Document already exists";
      message: "A document with this content has already been uploaded.";
      action: "View existing document";
      showExisting: true;
    };
    processing: {
      title: "Processing failed";
      message: "We couldn't process this document. Our team has been notified.";
      action: "Try again";
      showRetry: true;
    };
  };

  // Chat errors
  chat: {
    noResults: {
      title: "No relevant information found";
      message: "Try rephrasing your question or check uploaded documents.";
      suggestions: true;               // Show suggested questions
    };
    lowConfidence: {
      title: "Limited information available";
      showConfidenceWarning: true;
      showSources: true;
    };
    timeout: {
      title: "Request timed out";
      message: "This is taking longer than expected. Please try again.";
      action: "Retry";
    };
  };
}
```

---

## 6. Observability Specifications

### 6.1 Structured Logging

```typescript
interface LogEntry {
  timestamp: string;                   // ISO 8601
  level: 'debug' | 'info' | 'warn' | 'error';
  service: 'ingest' | 'retrieval' | 'chat' | 'api';

  // Context
  requestId: string;
  documentId?: string;
  conversationId?: string;
  chunkId?: string;

  // Event
  event: string;
  message: string;

  // Performance
  durationMs?: number;

  // Error details
  errorCode?: ErrorCode;
  errorStack?: string;

  // Metadata
  metadata?: Record<string, any>;
}
```

### 6.2 Health Check Endpoint

```typescript
// GET /api/health
interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;

  checks: {
    database: {
      status: 'up' | 'down';
      latencyMs: number;
    };
    openai: {
      status: 'up' | 'down' | 'rate_limited';
      latencyMs: number;
    };
    storage: {
      status: 'up' | 'down';
      usagePercent: number;
    };
    queue: {
      status: 'up' | 'down';
      pendingJobs: number;
    };
  };
}
```

### 6.3 Processing Status (Real-time)

```typescript
// WebSocket or SSE: /api/ingest/status/[documentId]
interface ProcessingStatus {
  documentId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'partial';

  progress: {
    stage: 'uploading' | 'parsing' | 'chunking' | 'embedding' | 'storing';
    percent: number;
    currentChunk?: number;
    totalChunks?: number;
  };

  timing: {
    startedAt: string;
    estimatedCompletionAt?: string;
    completedAt?: string;
  };

  error?: {
    code: ErrorCode;
    message: string;
    retryable: boolean;
  };
}
```

---

## 7. API Specifications

### 7.1 Endpoints Overview

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/ingest` | Upload and process document |
| GET | `/api/ingest/status/[id]` | Get processing status (SSE) |
| POST | `/api/chat` | RAG query with streaming |
| POST | `/api/search` | Pure search without LLM |
| GET | `/api/documents` | List all documents |
| GET | `/api/documents/[id]` | Get document details |
| DELETE | `/api/documents/[id]` | Delete document |
| PATCH | `/api/documents/[id]` | Reprocess document |
| GET | `/api/conversations` | List conversations |
| POST | `/api/conversations` | Create conversation |
| GET | `/api/conversations/[id]` | Get conversation with messages |
| DELETE | `/api/conversations/[id]` | Delete conversation |
| POST | `/api/feedback` | Submit answer feedback |
| GET | `/api/glossary` | Get domain glossary |
| GET | `/api/analytics` | KB health dashboard data |
| GET | `/api/health` | System health check |

### 7.2 POST /api/ingest

**Purpose:** Upload and process documents

**Request (multipart/form-data):**
```typescript
{
  file?: File,           // PDF, DOCX, TXT, MD
  url?: string,          // Web URL to scrape
  title?: string,        // Optional custom title
  priority?: 'high' | 'normal' | 'low',
}
```

**Response:**
```typescript
{
  success: boolean,
  document: {
    id: string,
    title: string,
    source_type: 'pdf' | 'url' | 'text' | 'docx',
    status: 'processing',
    created_at: string
  }
}
```

**Processing Pipeline:**
1. Receive file/URL
2. Validate file (size, type, encoding, hash)
3. Check for duplicates
4. Create document record (status: 'pending')
5. Queue for background processing
6. Parse document content
7. Extract tables (if present)
8. Split into semantic chunks with hierarchy
9. Generate summaries for document/section levels
10. Enrich chunks with metadata
11. Generate embeddings (batched)
12. Store chunks + vectors in Supabase
13. Extract glossary terms
14. Update document (status: 'completed', chunk_count)

### 7.3 POST /api/chat

**Purpose:** RAG query with streaming and citations

**Request:**
```typescript
{
  conversationId?: string,             // Existing or new
  message: string,

  // Filters
  filters?: {
    documentIds?: string[],
    dateRange?: { from: string, to: string },
  },

  // Slash commands parsed from message
  command?: {
    type: 'compare' | 'summarize' | 'sources' | 'export',
    args?: string[],
  },
}
```

**Streaming Response:**
```typescript
interface ChatStreamChunk {
  type: 'text' | 'sources' | 'confidence' | 'suggestions' | 'done';

  // For type: 'text'
  text?: string;

  // For type: 'sources'
  sources?: Array<{
    documentId: string;
    documentTitle: string;
    chunkId: string;
    content: string;
    pageNumber?: number;
    sectionHeader?: string;
    similarity: number;
    isPrimary: boolean;                // Highest relevance source
  }>;

  // For type: 'confidence'
  confidence?: {
    score: number;                     // 0-1
    level: 'high' | 'medium' | 'low';
    factors: {
      sourceQuality: number;
      recency: number;
      consistency: number;
    };
  };

  // For type: 'suggestions'
  suggestions?: string[];              // Follow-up questions

  // For type: 'done'
  messageId?: string;
  conversationId?: string;
}
```

**RAG Pipeline:**
1. Get user query
2. Check for slash commands
3. Expand query (3 variants)
4. Embed all query variants
5. Hybrid search (vector + keyword)
6. Re-rank results
7. Apply MMR for diversity
8. Retrieve parent context
9. Calculate confidence score
10. Build prompt with context + sources
11. Stream LLM response with inline citations
12. Return sources metadata + confidence
13. Generate follow-up suggestions
14. Log query for analytics

### 7.4 GET /api/analytics

**Purpose:** KB health dashboard data

**Response:**
```typescript
interface AnalyticsResponse {
  overview: {
    totalDocuments: number;
    totalChunks: number;
    pendingDocuments: number;
    failedDocuments: number;
    staleDocuments: number;            // Not updated in 90+ days
  };

  usage: {
    queriesLast24h: number;
    queriesLast7d: number;
    avgResponseTimeMs: number;
    avgConfidenceScore: number;
  };

  topTopics: Array<{
    topic: string;
    queryCount: number;
  }>;

  gaps: Array<{                        // Unanswered/low-confidence queries
    query: string;
    count: number;
    avgConfidence: number;
  }>;

  feedback: {
    positive: number;
    negative: number;
    ratio: number;
  };
}
```

---

## 8. UI Component Architecture (shadcn/ui)

### 8.1 Component Mapping

| Feature | shadcn Components | Custom Components |
|---------|-------------------|-------------------|
| **File Upload** | `Card`, `Button`, `Progress`, `Input` | `FileDropzone` |
| **Document List** | `Table`, `DropdownMenu`, `AlertDialog`, `Badge` | `DocumentStatusBadge` |
| **Chat Interface** | `ScrollArea`, `Card`, `Skeleton`, `Button` | `ChatMessage`, `ChatInput` |
| **Citations** | `HoverCard`, `Collapsible`, `Badge`, `Popover` | `CitationCard`, `InlineHighlight` |
| **Confidence** | `Badge`, `Progress` | `ConfidenceIndicator` |
| **Filters** | `Select`, `Popover`, `Calendar`, `Checkbox` | `FilterPanel` |
| **Feedback** | `Button`, `Dialog`, `Textarea` | `FeedbackButtons` |
| **Slash Commands** | `Command`, `Popover` | `CommandPalette` |
| **Glossary** | `HoverCard`, `Popover` | `GlossaryTerm` |
| **Dashboard** | `Card`, `Tabs` | `MetricCard`, `GapsList` |
| **Toasts** | `Toast` | - |
| **Dialogs** | `Dialog`, `AlertDialog` | - |

### 8.2 Custom Components Required

```typescript
// Components to build from shadcn primitives

interface CustomComponents {
  // Chat
  ChatMessage: {
    role: 'user' | 'assistant';
    content: string;
    sources?: Source[];
    confidence?: ConfidenceLevel;
    isStreaming?: boolean;
  };

  ChatInput: {
    onSubmit: (message: string) => void;
    placeholder: string;
    disabled: boolean;
    slashCommands: boolean;            // Enable command suggestions
  };

  // Citations
  CitationCard: {
    source: Source;
    isPrimary: boolean;
    onViewInDocument: () => void;
  };

  InlineHighlight: {
    text: string;
    citationIndex: number;
    onHover: () => void;
  };

  // Confidence
  ConfidenceIndicator: {
    score: number;
    level: 'high' | 'medium' | 'low';
    showBreakdown: boolean;
  };

  // Glossary
  GlossaryTerm: {
    term: string;
    definition: string;
  };

  // PDF Viewer (external library integration)
  PDFViewer: {
    fileUrl: string;
    highlightPage?: number;
    highlightText?: string;
  };
}
```

### 8.3 Vercel AI SDK Integration

```typescript
// Chat page using Vercel AI SDK + shadcn

import { useChat } from 'ai/react';

export function ChatInterface() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    data                               // Sources, confidence from stream
  } = useChat({
    api: '/api/chat',
    onFinish: (message) => {
      // Handle completion, save to conversation
    },
  });

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1">
        {messages.map((m) => (
          <ChatMessage
            key={m.id}
            role={m.role}
            content={m.content}
            sources={data?.sources}
            confidence={data?.confidence}
          />
        ))}
      </ScrollArea>

      <ChatInput
        value={input}
        onChange={handleInputChange}
        onSubmit={handleSubmit}
        disabled={isLoading}
      />
    </div>
  );
}
```

### 8.4 Citation UX Components

```typescript
// Collapsible source panel
interface CitationPanel {
  sources: Source[];
  isExpanded: boolean;
  onToggle: () => void;
  primarySourceIndex: number;
}

// Inline citation highlight
interface InlineCitation {
  text: string;                        // The cited text
  sourceIndex: number;                 // [1], [2], etc.
  onHover: () => void;                 // Show preview
  onClick: () => void;                 // Scroll to source
}

// Citation preview on hover
interface CitationPreview {
  source: Source;
  position: { x: number; y: number };
  onViewInDocument: () => void;
}

// View in document modal
interface DocumentViewer {
  documentId: string;
  pageNumber?: number;
  highlightText?: string;
  onClose: () => void;
}
```

---

## 9. Configuration & Limits

```yaml
# config.yaml

app:
  name: "RAG Knowledge Base"
  version: "1.0.0"

limits:
  files:
    maxSizeMB: 50
    maxChunksPerDocument: 500
    allowedTypes: ['pdf', 'txt', 'md', 'docx']

  processing:
    maxConcurrentUploads: 3
    embeddingBatchSize: 100
    processingTimeoutMs: 300000

  conversations:
    maxMessagesPerConversation: 100
    maxConversationsTotal: 1000

  queries:
    timeoutMs: 30000
    maxResultsPerQuery: 20
    rateLimitPerMinute: 60

retrieval:
  defaultTopK: 5
  similarityThreshold: 0.5
  confidenceThresholds:
    high: 0.8
    medium: 0.6
    low: 0.4

models:
  embedding: "text-embedding-3-small"
  chat: "gpt-4o-mini"
  summarization: "gpt-4o-mini"

features:
  slashCommands:
    enabled: true
    commands: ['compare', 'summarize', 'sources', 'export', 'recent']

  glossary:
    enabled: true
    autoExtract: true

  dashboard:
    enabled: true
    staleDocumentDays: 90
```

---

## 10. File Structure

```
/app
  /page.tsx                        # Landing with upload
  /chat/page.tsx                   # New chat
  /chat/[id]/page.tsx              # Existing conversation
  /documents/page.tsx              # Document management
  /dashboard/page.tsx              # KB health dashboard

  /api
    /ingest/route.ts               # Document upload
    /ingest/status/[id]/route.ts   # Processing status (SSE)
    /chat/route.ts                 # RAG chat (streaming)
    /search/route.ts               # Pure search
    /documents/route.ts            # List documents
    /documents/[id]/route.ts       # Document CRUD
    /conversations/route.ts        # List conversations
    /conversations/[id]/route.ts   # Conversation CRUD
    /feedback/route.ts             # Submit feedback
    /glossary/route.ts             # Get glossary
    /analytics/route.ts            # Dashboard data
    /health/route.ts               # Health check

/lib
  /supabase.ts                     # Supabase client
  /openai.ts                       # OpenAI client
  /chunking/
    /semantic.ts                   # Semantic chunking
    /hierarchy.ts                  # Hierarchical processing
    /tables.ts                     # Table extraction
  /retrieval/
    /hybrid.ts                     # Hybrid search
    /reranker.ts                   # Re-ranking
    /mmr.ts                        # MMR diversity
    /query-expansion.ts            # Query expansion
  /rag.ts                          # RAG chain with citations
  /confidence.ts                   # Confidence calculation
  /glossary.ts                     # Glossary extraction
  /errors.ts                       # Error codes and handling
  /queue.ts                        # Background job queue

/components
  /ui/                             # shadcn components (auto-generated)
  /chat/
    /ChatInterface.tsx
    /ChatMessage.tsx
    /ChatInput.tsx
    /CommandPalette.tsx
  /citations/
    /CitationPanel.tsx
    /CitationCard.tsx
    /InlineHighlight.tsx
    /ConfidenceIndicator.tsx
  /documents/
    /FileUploader.tsx
    /DocumentList.tsx
    /DocumentStatusBadge.tsx
    /PDFViewer.tsx
  /dashboard/
    /MetricCard.tsx
    /TopicsChart.tsx
    /GapsList.tsx
    /FeedbackStats.tsx
  /common/
    /GlossaryTerm.tsx
    /FilterPanel.tsx
    /FeedbackButtons.tsx

/types
  /index.ts                        # All TypeScript interfaces
  /errors.ts                       # Error types
  /api.ts                          # API request/response types

/hooks
  /useConversation.ts
  /useDocuments.ts
  /useGlossary.ts
```

---

## 11. Slash Commands Specification

```typescript
interface SlashCommand {
  command: string;
  description: string;
  usage: string;
  handler: (args: string[], context: ChatContext) => Promise<CommandResult>;
}

const commands: SlashCommand[] = [
  {
    command: '/compare',
    description: 'Compare information across documents',
    usage: '/compare [doc1] [doc2] [topic]',
    // Retrieves from both docs, generates comparison
  },
  {
    command: '/summarize',
    description: 'Get a summary of a document',
    usage: '/summarize [doc-name]',
    // Returns hierarchical summary from document-level chunks
  },
  {
    command: '/sources',
    description: 'List all available documents',
    usage: '/sources',
    // Returns document list with stats
  },
  {
    command: '/export',
    description: 'Export conversation as markdown',
    usage: '/export',
    // Generates downloadable markdown with citations
  },
  {
    command: '/recent',
    description: 'Show recently added documents',
    usage: '/recent [days?]',
    // Lists documents added in last N days
  },
];
```

### Command Palette UI

```typescript
// Triggered when user types '/'
interface CommandPalette {
  isOpen: boolean;
  filter: string;                      // User's typed filter
  commands: SlashCommand[];
  selectedIndex: number;
  onSelect: (command: SlashCommand) => void;
  onClose: () => void;
}

// Display in chat input
// When user types '/', show dropdown above input
// Filter commands as user types
// Enter to select, Escape to close
```

---

## 12. Confidence Breakdown Specification

```typescript
interface ConfidenceBreakdown {
  overall: {
    score: number;                     // 0-1
    level: 'high' | 'medium' | 'low';
    display: string;                   // "87% High Confidence"
  };

  factors: {
    sourceQuality: {
      score: number;
      description: string;             // "4 official documents"
      icon: 'star';
    };
    recency: {
      score: number;
      description: string;             // "Sources updated within 30 days"
      warning?: string;                // "Oldest source is 2 years old"
      icon: 'clock';
    };
    consistency: {
      score: number;
      description: string;             // "All sources agree"
      warning?: string;                // "Sources have conflicting info"
      icon: 'check-circle';
    };
    coverage: {
      score: number;
      description: string;             // "3 of 5 chunks highly relevant"
      icon: 'layers';
    };
  };

  weights: {
    sourceQuality: 0.3;
    recency: 0.2;
    consistency: 0.3;
    coverage: 0.2;
  };
}
```

### Confidence UI Display

```
┌─────────────────────────────────────────┐
│ 🎯 87% High Confidence                  │
├─────────────────────────────────────────┤
│ ⭐ Source Quality    ████████░░  4/5    │
│    4 official documents                 │
│                                         │
│ 🕐 Recency           ██████░░░░  3/5    │
│    ⚠️ Oldest source is 2 years old      │
│                                         │
│ ✅ Consistency       ██████████  5/5    │
│    All sources agree                    │
│                                         │
│ 📚 Coverage          ██████░░░░  3/5    │
│    3 of 5 chunks highly relevant        │
└─────────────────────────────────────────┘
```

---

## 13. NPM Dependencies

```json
{
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",

    "langchain": "^0.3.0",
    "@langchain/openai": "^0.3.0",
    "@langchain/community": "^0.3.0",

    "ai": "^3.4.0",
    "@ai-sdk/openai": "^0.0.70",

    "@supabase/supabase-js": "^2.45.0",

    "pdf-parse": "^1.1.1",
    "cheerio": "^1.0.0",
    "mammoth": "^1.8.0",

    "react-dropzone": "^14.2.3",
    "zod": "^3.23.0",

    "tailwindcss": "^3.4.0",
    "lucide-react": "^0.400.0",

    "@radix-ui/react-alert-dialog": "^1.0.0",
    "@radix-ui/react-collapsible": "^1.0.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "@radix-ui/react-dropdown-menu": "^2.0.0",
    "@radix-ui/react-hover-card": "^1.0.0",
    "@radix-ui/react-popover": "^1.0.0",
    "@radix-ui/react-scroll-area": "^1.0.0",
    "@radix-ui/react-select": "^2.0.0",
    "@radix-ui/react-tabs": "^1.0.0",
    "@radix-ui/react-toast": "^1.0.0",

    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",

    "react-pdf": "^7.7.0",
    "date-fns": "^3.3.0",
    "react-day-picker": "^8.10.0"
  },
  "devDependencies": {
    "typescript": "^5.5.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0"
  }
}
```

---

## 14. Environment Variables

```bash
# .env.local

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# OpenAI
OPENAI_API_KEY=sk-...

# App Config
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
EMBEDDING_MODEL=text-embedding-3-small
CHAT_MODEL=gpt-4o-mini
MAX_RETRIEVAL_RESULTS=5

# Feature Flags
ENABLE_SLASH_COMMANDS=true
ENABLE_GLOSSARY=true
ENABLE_DASHBOARD=true

# Limits
MAX_FILE_SIZE_MB=50
MAX_CONCURRENT_UPLOADS=3
QUERY_TIMEOUT_MS=30000
RATE_LIMIT_PER_MINUTE=60
```

---

## Appendix A: LLM Prompts

### System Prompt for RAG Chat

```typescript
const SYSTEM_PROMPT = `You are a helpful assistant for a knowledge base system.

Answer questions based ONLY on the provided context. If the context doesn't contain enough information, say so clearly.

IMPORTANT RULES:
1. Always cite your sources using [1], [2], etc. matching the source numbers provided.
2. If sources conflict, acknowledge the discrepancy.
3. If confidence is low, warn the user.
4. Never make up information not in the sources.
5. Be concise but thorough.

Context:
{context}

Sources are numbered [1], [2], etc. Reference which source(s) support each claim.`;
```

### Query Expansion Prompt

```typescript
const QUERY_EXPANSION_PROMPT = `Given this search query, generate 3 alternative phrasings that might help find relevant information. Focus on:
1. Synonyms and related terms
2. More specific versions
3. More general versions

Query: {query}

Return as JSON array of strings.`;
```

### Summary Generation Prompt

```typescript
const SUMMARY_PROMPT = `Summarize the following document section concisely. Focus on:
1. Key topics covered
2. Main conclusions or findings
3. Important terms or concepts

Keep the summary under {maxTokens} tokens.

Content:
{content}`;
```

---

## Appendix B: Database Migrations

### Migration 001: Initial Schema

```sql
-- 001_initial_schema.sql
-- Run this first to set up base tables
```

### Migration 002: Add Hierarchy

```sql
-- 002_add_hierarchy.sql
ALTER TABLE document_chunks ADD COLUMN level TEXT;
ALTER TABLE document_chunks ADD COLUMN parent_chunk_id UUID;
ALTER TABLE document_chunks ADD COLUMN summary TEXT;
-- etc.
```

---

## Appendix C: Testing Checklist

### Ingestion Tests
- [ ] Upload PDF < 50MB
- [ ] Upload PDF > 50MB (should fail gracefully)
- [ ] Upload corrupt PDF
- [ ] Upload password-protected PDF
- [ ] Upload duplicate file
- [ ] Upload DOCX, TXT, MD files
- [ ] URL scraping
- [ ] Concurrent uploads (3 max)
- [ ] Partial failure recovery

### Retrieval Tests
- [ ] Basic query returns relevant chunks
- [ ] Hybrid search beats pure vector
- [ ] Re-ranking improves results
- [ ] MMR provides diverse results
- [ ] Parent context included
- [ ] Filters work (doc ID, date)
- [ ] Low confidence warning shown
- [ ] No results handled gracefully

### Chat Tests
- [ ] Streaming works
- [ ] Citations correct
- [ ] Conversation memory works
- [ ] Slash commands work
- [ ] Export works
- [ ] Feedback submission works

### UI Tests
- [ ] File upload drag & drop
- [ ] Progress indicators
- [ ] Error states display correctly
- [ ] Citation hover/click
- [ ] Confidence breakdown
- [ ] Mobile responsive

---

*End of Enriched Specifications*
