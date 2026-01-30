---
stepsCompleted: ['step-01-init', 'step-02-context', 'step-03-starter', 'step-04-decisions', 'step-05-patterns', 'step-06-structure', 'step-07-validation', 'step-08-complete']
status: 'complete'
completedAt: '2026-01-29'
inputDocuments: ['prd.md', 'RAG-ENRICHED-SPECS.md']
workflowType: 'architecture'
project_name: 'GTM Knowledge Base'
date: '2026-01-29'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements (37 total):**
- **Authentication:** 3 FRs — Simple shared password via Vercel env var, 2-min session timeout
- **Document Management:** 9 FRs — Upload (50MB max), OCR for scanned PDFs, duplicate detection by filename, cascade delete
- **Content Processing:** 5 FRs — Semantic chunking, hierarchical structure, multi-language embeddings
- **Query & Retrieval:** 8 FRs — Hybrid search, re-ranking, MMR, <5s latency, no answer when confidence <0.6
- **Citations & Trust:** 5 FRs — Page numbers in citations, confidence breakdown, collapsible panel
- **Conversation:** 4 FRs — Unlimited history in session, discarded after session ends
- **Phase 2:** 10 FRs — Slash commands, analytics dashboard, glossary extraction

**Non-Functional Requirements (14 total):**
- Performance: <2s first token, <5s complete answer, 20 concurrent users
- Reliability: 99% uptime, graceful degradation on LLM timeout
- Security: HTTPS, env var secrets, no PII in logs

### Scale & Complexity

| Dimension | Assessment |
|-----------|------------|
| Complexity | Medium — RAG pipeline with advanced retrieval, single-tenant |
| Primary Domain | Full-stack web (Next.js + Supabase) |
| Data Volume | Low-medium — internal team, ~1000 docs max |
| Real-time | Streaming responses only |
| Integrations | MVP: None |

### Technical Constraints (Pre-decided)

- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL + pgvector)
- **LLM/Embeddings:** OpenAI (GPT-4o-mini, text-embedding-3-small)
- **RAG Framework:** LangChain.js + Vercel AI SDK
- **UI:** shadcn/ui + Tailwind
- **Hosting:** Vercel

### Cross-Cutting Concerns

1. **Error Handling** — Structured error codes, retry logic, graceful fallbacks
2. **Observability** — Query logging, health checks, processing status
3. **Session Management** — 2-min timeout, no persistence after session
4. **Confidence Scoring** — Multi-factor calculation, hard cutoff at 0.6

## Starter Template Evaluation

### Technical Preferences (Pre-decided)

| Category | Choice |
|----------|--------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS + shadcn/ui |
| Database | Supabase (PostgreSQL + pgvector) |
| AI/RAG | LangChain.js + Vercel AI SDK + OpenAI |
| Hosting | Vercel |

### Initialization Commands

```bash
# 1. Create Next.js project
npx create-next-app@latest gtm-knowledge-base --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# 2. Add shadcn/ui
npx shadcn@latest init

# 3. Add core dependencies
npm install @supabase/supabase-js langchain @langchain/openai ai @ai-sdk/openai
npm install pdf-parse mammoth react-dropzone zod
```

### Architectural Decisions Provided by Starter

- **Language:** TypeScript with strict mode
- **Styling:** Tailwind CSS with shadcn/ui components
- **Routing:** Next.js App Router (file-based)
- **Build:** Next.js built-in (Turbopack dev, webpack prod)
- **Linting:** ESLint with Next.js config
- **Structure:** src/ directory with app/ router

## Core Architectural Decisions

### Pre-decided (From Enriched Specs)

| Category | Decision |
|----------|----------|
| Database | Supabase PostgreSQL + pgvector |
| Auth | Shared password via `SITE_PASSWORD` env var |
| LLM | OpenAI GPT-4o-mini |
| Embeddings | text-embedding-3-small (1536 dims) |
| API Style | REST with streaming (12 endpoints) |
| State Management | Vercel AI SDK `useChat` hook |
| Validation | Zod schemas |
| Error Handling | Structured codes (E1xx-E5xx) |

### Additional Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Background Jobs | Supabase Edge Functions | No timeout limits, keeps infra simple |
| File Storage | Supabase Storage | Already in stack, one service |
| Session Storage | HTTP-only cookie | Simple, secure, 2-min expiry |

### Decision Impact

**Implementation Sequence:**
1. Supabase setup (database + storage + edge functions)
2. Next.js project with auth middleware
3. Ingestion pipeline (edge functions)
4. RAG query pipeline (API routes)
5. UI components (shadcn)

**Cross-Component Dependencies:**
- Edge Functions depend on Supabase client config
- Auth cookie checked by Next.js middleware
- All API routes validate session before processing

## Implementation Patterns & Consistency Rules

### Naming Patterns

| Category | Convention | Example |
|----------|------------|---------|
| Database tables | snake_case, plural | `documents`, `document_chunks` |
| Database columns | snake_case | `created_at`, `file_hash` |
| API endpoints | kebab-case, plural | `/api/documents`, `/api/query-logs` |
| Route params | `[id]` format | `/api/documents/[id]` |
| Components | PascalCase | `ChatMessage.tsx`, `CitationPanel.tsx` |
| Files | PascalCase for components, camelCase for utils | `useChat.ts`, `confidence.ts` |
| Variables | camelCase | `documentId`, `chunkCount` |
| Types/Interfaces | PascalCase | `Document`, `ChunkWithEmbedding` |
| Zod schemas | camelCase + Schema suffix | `documentSchema`, `querySchema` |

### API Response Format

```typescript
// Success
{ success: true, data: T }

// Error
{ success: false, error: { code: "E101", message: "...", retryable: boolean } }

// Streaming: Vercel AI SDK format (text/sources/confidence/done chunks)
```

### File Organization

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   └── (routes)/          # Page routes
├── components/
│   ├── ui/                # shadcn components
│   ├── chat/              # Feature: chat
│   ├── documents/         # Feature: documents
│   └── common/            # Shared components
├── lib/                   # Core logic
│   ├── supabase.ts        # DB client
│   ├── openai.ts          # OpenAI client
│   ├── chunking/          # Chunking logic
│   ├── retrieval/         # RAG retrieval
│   └── errors.ts          # Error codes
├── types/                 # TypeScript types
└── hooks/                 # React hooks
```

### Key Patterns

| Pattern | Rule |
|---------|------|
| Imports | Absolute imports via `@/` alias |
| Error handling | Always use ErrorCode enum, never raw strings |
| Dates | ISO 8601 strings in API, `Date` objects in code |
| Null checks | Optional chaining (`?.`) and nullish coalescing (`??`) |
| Async | async/await, no raw promises |
| State | Vercel AI SDK for chat, React state for local UI |

## Project Structure & Boundaries

### Complete Project Directory Structure

```
gtm-knowledge-base/
├── .env.example
├── .env.local
├── .eslintrc.json
├── .gitignore
├── next.config.js
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── components.json                 # shadcn config
│
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx                # Landing + upload
│   │   ├── chat/
│   │   │   ├── page.tsx            # New chat
│   │   │   └── [id]/page.tsx       # Conversation
│   │   ├── documents/page.tsx      # Doc management
│   │   ├── dashboard/page.tsx      # KB health (Phase 2)
│   │   └── api/
│   │       ├── auth/route.ts       # Password auth
│   │       ├── chat/route.ts       # RAG streaming
│   │       ├── documents/
│   │       │   ├── route.ts        # List docs
│   │       │   └── [id]/route.ts   # CRUD single doc
│   │       ├── ingest/
│   │       │   ├── route.ts        # Upload
│   │       │   └── status/[id]/route.ts  # SSE status
│   │       ├── search/route.ts     # Pure search
│   │       ├── feedback/route.ts
│   │       ├── glossary/route.ts   # Phase 2
│   │       ├── analytics/route.ts  # Phase 2
│   │       └── health/route.ts
│   │
│   ├── components/
│   │   ├── ui/                     # shadcn (auto-generated)
│   │   ├── chat/
│   │   │   ├── ChatInterface.tsx
│   │   │   ├── ChatMessage.tsx
│   │   │   ├── ChatInput.tsx
│   │   │   └── CommandPalette.tsx  # Phase 2
│   │   ├── citations/
│   │   │   ├── CitationPanel.tsx
│   │   │   ├── CitationCard.tsx
│   │   │   ├── InlineHighlight.tsx
│   │   │   └── ConfidenceIndicator.tsx
│   │   ├── documents/
│   │   │   ├── FileUploader.tsx
│   │   │   ├── DocumentList.tsx
│   │   │   └── DocumentStatusBadge.tsx
│   │   └── common/
│   │       ├── AuthGuard.tsx
│   │       ├── FilterPanel.tsx
│   │       └── FeedbackButtons.tsx
│   │
│   ├── lib/
│   │   ├── supabase.ts             # Supabase client
│   │   ├── openai.ts               # OpenAI client
│   │   ├── auth.ts                 # Password validation
│   │   ├── errors.ts               # ErrorCode enum
│   │   ├── confidence.ts           # Score calculation
│   │   ├── chunking/
│   │   │   ├── semantic.ts
│   │   │   ├── hierarchy.ts
│   │   │   └── tables.ts
│   │   └── retrieval/
│   │       ├── hybrid.ts
│   │       ├── reranker.ts
│   │       ├── mmr.ts
│   │       └── query-expansion.ts
│   │
│   ├── types/
│   │   ├── index.ts                # All interfaces
│   │   ├── api.ts                  # Request/response types
│   │   └── errors.ts               # Error types
│   │
│   ├── hooks/
│   │   ├── useDocuments.ts
│   │   └── useProcessingStatus.ts
│   │
│   └── middleware.ts               # Auth check
│
├── supabase/
│   ├── migrations/
│   │   └── 001_initial_schema.sql
│   └── functions/
│       └── process-document/       # Edge Function for ingestion
│           └── index.ts
│
└── public/
    └── (static assets)
```

### Architectural Boundaries

| Boundary | Location | Responsibility |
|----------|----------|----------------|
| Auth | `middleware.ts` | Block unauthenticated requests |
| API | `src/app/api/` | All external communication |
| RAG Pipeline | `src/lib/retrieval/` | Search, rank, expand |
| Ingestion | `supabase/functions/` | Heavy processing (no timeout) |
| UI State | `useChat` hook | Chat messages, streaming |

### FR → Structure Mapping

| FR Category | Primary Location |
|-------------|------------------|
| Authentication (FR-A1-A3) | `middleware.ts`, `lib/auth.ts` |
| Document Mgmt (FR1-FR5e) | `app/api/documents/`, `components/documents/` |
| Content Processing (FR6-FR10) | `supabase/functions/`, `lib/chunking/` |
| Query & Retrieval (FR11-FR18) | `app/api/chat/`, `lib/retrieval/` |
| Citations (FR19-FR23) | `components/citations/` |
| Conversation (FR24-FR27) | `app/chat/`, `components/chat/` |

## Architecture Validation Results

### Coherence Validation ✅

| Check | Status |
|-------|--------|
| Decision Compatibility | ✅ Next.js + Supabase + OpenAI compatible |
| Pattern Consistency | ✅ Naming conventions align with stack |
| Structure Alignment | ✅ App Router supports all patterns |

### Requirements Coverage ✅

All 37 FRs and 14 NFRs have architectural support:
- Authentication: `middleware.ts`, `lib/auth.ts`
- Document Management: `app/api/documents/`, Supabase Edge Functions
- Content Processing: `supabase/functions/`, `lib/chunking/`
- Query & Retrieval: `app/api/chat/`, `lib/retrieval/`
- Citations & Trust: `components/citations/`
- Conversation: Vercel AI SDK `useChat`

### Implementation Readiness ✅

**Confidence Level:** HIGH

**Architecture Completeness Checklist:**
- [x] Project context analyzed
- [x] Technology stack specified with versions
- [x] Implementation patterns defined
- [x] Project structure complete
- [x] All FRs mapped to locations
- [x] NFRs addressed architecturally

### Implementation Sequence

1. Run `create-next-app` + shadcn init
2. Set up Supabase project + run migrations
3. Deploy Edge Function for document processing
4. Build API routes (auth → ingest → chat)
5. Build UI components (upload → chat → citations)
