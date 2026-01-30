# GTM Knowledge Base - Epics & Stories

**Project:** GTM Knowledge Base
**Generated:** 2026-01-29
**Source:** PRD (37 FRs)

---

## Epic 1: Foundation & Setup

**Goal:** Project initialization, database schema, and authentication system.

### Story 1.1: Project Initialization

**As a** developer
**I want** the Next.js project scaffolded with all dependencies
**So that** I can begin building features on a solid foundation

**Acceptance Criteria:**
- [ ] Next.js 14 project created with App Router, TypeScript, Tailwind
- [ ] shadcn/ui initialized with base components
- [ ] All npm dependencies installed (Supabase, LangChain, Vercel AI SDK, etc.)
- [ ] ESLint and TypeScript configured
- [ ] Environment variables template created (.env.example)

**FRs Covered:** None (infrastructure)

---

### Story 1.2: Supabase Database Schema

**As a** developer
**I want** the complete database schema deployed to Supabase
**So that** all data storage is ready for the application

**Acceptance Criteria:**
- [ ] Supabase project created and configured
- [ ] All 8 tables created (documents, document_chunks, document_tables, conversations, messages, feedback, query_logs, glossary)
- [ ] pgvector extension enabled
- [ ] pg_trgm extension enabled for hybrid search
- [ ] All indexes created (HNSW for vectors, GIN for text)
- [ ] Database functions created (match_chunks_hybrid, get_chunk_with_parents)
- [ ] Triggers created (updated_at auto-update)

**FRs Covered:** None (infrastructure)

---

### Story 1.3: Authentication Middleware

**As a** user
**I want** to enter a shared password to access the system
**So that** only authorized team members can use the knowledge base

**Acceptance Criteria:**
- [ ] SITE_PASSWORD environment variable configured
- [ ] Login page with password input field
- [ ] HTTP-only cookie set on successful auth (2-min expiry)
- [ ] Next.js middleware blocks unauthenticated requests
- [ ] Session auto-expires after 2 minutes of inactivity
- [ ] Redirect to login page when session expires

**FRs Covered:** FR-A1, FR-A2, FR-A3

---

## Epic 2: Document Ingestion

**Goal:** File upload, processing pipeline, and document management.

### Story 2.1: File Upload UI

**As a** user
**I want** to upload documents via drag-and-drop
**So that** I can easily add content to the knowledge base

**Acceptance Criteria:**
- [ ] Drag-and-drop upload zone on landing page
- [ ] File type validation (PDF, TXT, DOCX, MD only)
- [ ] File size validation (50MB max)
- [ ] Upload progress indicator
- [ ] Error messages for invalid files
- [ ] Duplicate filename detection with warning dialog

**FRs Covered:** FR1, FR5a, FR5b, FR5c

---

### Story 2.2: Document Processing Pipeline

**As a** system
**I want** to process uploaded documents into searchable chunks
**So that** content can be retrieved by the RAG system

**Acceptance Criteria:**
- [ ] Supabase Edge Function created for document processing
- [ ] PDF text extraction working
- [ ] DOCX text extraction working (mammoth)
- [ ] TXT/MD text extraction working
- [ ] OCR processing for scanned PDFs
- [ ] Encrypted PDF detection with error response
- [ ] Semantic chunking with hierarchical structure (document/section/chunk)
- [ ] Chunk metadata includes page numbers and section headers

**FRs Covered:** FR5c, FR5d, FR6, FR7

---

### Story 2.3: Embedding Generation & Storage

**As a** system
**I want** to generate embeddings for all document chunks
**So that** semantic search can find relevant content

**Acceptance Criteria:**
- [ ] OpenAI text-embedding-3-small integration
- [ ] Batch embedding generation (100 chunks per batch)
- [ ] Embeddings stored in document_chunks table
- [ ] Multi-language content supported
- [ ] Token count tracked per chunk
- [ ] Error handling with retry logic for API failures

**FRs Covered:** FR8, FR9, FR10

---

### Story 2.4: Document Management UI

**As a** user
**I want** to view and manage uploaded documents
**So that** I can track what's in the knowledge base

**Acceptance Criteria:**
- [ ] Document list page with table view
- [ ] Columns: name, type, status, upload date, chunk count
- [ ] Status badges (queued, processing, ready, failed)
- [ ] Delete button with confirmation dialog
- [ ] Cascade delete removes all chunks and embeddings
- [ ] Empty state with upload CTA when no documents exist
- [ ] Real-time status updates via SSE

**FRs Covered:** FR2, FR3, FR4, FR5e

---

## Epic 3: RAG Query Pipeline

**Goal:** Search, retrieval, and response generation.

### Story 3.1: Hybrid Search Implementation

**As a** system
**I want** to search documents using both vector and keyword matching
**So that** retrieval accuracy is maximized

**Acceptance Criteria:**
- [ ] Vector search using pgvector cosine similarity
- [ ] Keyword search using pg_trgm
- [ ] Combined scoring (70% vector, 30% keyword)
- [ ] Similarity threshold filtering (>0.5)
- [ ] Top 20 initial retrieval
- [ ] Query embedding generation

**FRs Covered:** FR13

---

### Story 3.2: Query Expansion & Re-ranking

**As a** system
**I want** to expand queries and re-rank results
**So that** the most relevant chunks are selected

**Acceptance Criteria:**
- [ ] Query expansion generates 3 query variants via LLM
- [ ] All variants searched and results merged
- [ ] Re-ranking applied to combined results
- [ ] MMR (Maximal Marginal Relevance) for diversity
- [ ] Final top 5 chunks selected
- [ ] Parent chunk context retrieved

**FRs Covered:** FR14

---

### Story 3.3: Streaming Response Generation

**As a** user
**I want** to see answers stream in real-time
**So that** I get fast feedback during queries

**Acceptance Criteria:**
- [ ] POST /api/chat endpoint with streaming
- [ ] Vercel AI SDK streaming integration
- [ ] LLM prompt with retrieved context and citations
- [ ] Inline citation markers [1], [2], etc.
- [ ] Query-to-first-token under 2 seconds
- [ ] Query-to-complete under 5 seconds (p95)
- [ ] Partial answer handling on LLM timeout

**FRs Covered:** FR11, FR16, FR17, FR18

---

### Story 3.4: Empty & Error States

**As a** user
**I want** clear feedback when queries fail or return no results
**So that** I understand what happened and can take action

**Acceptance Criteria:**
- [ ] Empty query rejected with message: "Blank input — nothing to retrieve"
- [ ] No results message: "Nothing relevant found"
- [ ] Low confidence warning displayed when score <0.6
- [ ] Answer NOT shown when confidence <0.6
- [ ] Timeout error with explanation
- [ ] Retry button for failed queries

**FRs Covered:** FR12, FR15, FR23

---

## Epic 4: Citations & Trust

**Goal:** Source display and confidence scoring.

### Story 4.1: Citation Panel UI

**As a** user
**I want** to see the sources used for each answer
**So that** I can verify the information

**Acceptance Criteria:**
- [ ] Collapsible citation panel below each answer
- [ ] Citation cards show: document name, page number, relevance score
- [ ] Source preview text (first 200 chars)
- [ ] Primary source highlighted
- [ ] Click to expand full source context
- [ ] Source count badge on panel header

**FRs Covered:** FR19, FR20

---

### Story 4.2: Confidence Indicator

**As a** user
**I want** to see how confident the system is in its answer
**So that** I know when to verify information

**Acceptance Criteria:**
- [ ] Confidence score calculated (0-1)
- [ ] Visual indicator: High (green), Medium (yellow), Low (red)
- [ ] Score percentage displayed
- [ ] Warning banner when confidence <0.6
- [ ] Confidence factors: source quality, recency, consistency, coverage

**FRs Covered:** FR21, FR22, FR23

---

## Epic 5: Chat Interface

**Goal:** Conversation UI and session management.

### Story 5.1: Chat Interface

**As a** user
**I want** a chat interface to query the knowledge base
**So that** I can ask questions naturally

**Acceptance Criteria:**
- [ ] Chat page with message list
- [ ] User messages right-aligned, assistant left-aligned
- [ ] Message input with send button
- [ ] Streaming response display with typing indicator
- [ ] Auto-scroll to latest message
- [ ] New chat button to clear conversation

**FRs Covered:** FR27

---

### Story 5.2: Conversation Memory

**As a** user
**I want** the system to remember context within my session
**So that** I can ask follow-up questions

**Acceptance Criteria:**
- [ ] Conversation context maintained in session
- [ ] Follow-up questions reference prior answers
- [ ] Unlimited message history within session
- [ ] Context cleared after session timeout (2 min)
- [ ] No persistence after session ends

**FRs Covered:** FR24, FR25, FR26

---

## Epic 6: Phase 2 Features

**Goal:** Advanced features for power users.

### Story 6.1: Slash Commands

**As a** user
**I want** to use slash commands for special actions
**So that** I can quickly compare, summarize, or export

**Acceptance Criteria:**
- [ ] Command palette triggered by typing /
- [ ] /compare [A] vs [B] generates comparison table
- [ ] /summarize [topic] generates condensed overview
- [ ] /sources [query] lists matching documents without answer
- [ ] /export copies answer as markdown with citations

**FRs Covered:** FR28, FR29, FR30, FR31

---

### Story 6.2: Analytics Dashboard

**As a** admin
**I want** to see KB health metrics
**So that** I can identify content gaps and usage patterns

**Acceptance Criteria:**
- [ ] Dashboard page with metrics cards
- [ ] Total documents, chunks, pending, failed counts
- [ ] Query volume (24h, 7d)
- [ ] Average response time and confidence
- [ ] Top query topics
- [ ] Content gaps (low-confidence queries)
- [ ] Feedback ratio (thumbs up/down)

**FRs Covered:** FR32, FR33, FR34, FR35

---

### Story 6.3: Knowledge Glossary

**As a** user
**I want** domain terms auto-extracted and defined
**So that** I can understand jargon in answers

**Acceptance Criteria:**
- [ ] Term extraction during document processing
- [ ] Glossary table with terms and definitions
- [ ] Hover definitions for recognized terms in answers
- [ ] Glossary API endpoint

**FRs Covered:** FR36, FR37

---

### Story 6.4: Feedback System

**As a** user
**I want** to rate answers with thumbs up/down
**So that** the system can track answer quality

**Acceptance Criteria:**
- [ ] Thumbs up/down buttons on each answer
- [ ] Feedback stored in database
- [ ] Optional comment field
- [ ] Feedback reflected in analytics

**FRs Covered:** FR33

---

*End of Epics*
