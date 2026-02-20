# CLAUDE.md

## Project Overview

**Hoxton Wealth Chatbot** — a production-grade RAG (Retrieval-Augmented Generation) chatbot that lets users upload documents, build a knowledge base, and chat with it. The AI is tuned as a sales agent that progressively steers conversations toward booking a Calendly call.

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 (configured via CSS `@theme` in `globals.css`, no `tailwind.config.ts`) + shadcn/ui
- **Auth:** Clerk (`@clerk/nextjs`) — replaced old password-based auth
- **AI/LLM:** OpenRouter (OpenAI-compatible API) via `openai` SDK — NOT direct OpenAI
- **Embeddings:** `text-embedding-3-small` (1536 dims) via OpenRouter
- **RAG Framework:** LangChain.js + Vercel AI SDK (`ai` package)
- **Database:** Supabase (Postgres + pgvector + pg_trgm)
- **Storage:** Supabase Storage (uploaded files)
- **Hosting:** Vercel (project ID: `prj_E3uJQRxup8lHWIfPhzkn6kJDn3kf`, team: `team_7HsLVmw6i3cIyCj8HT0KiLPy`)

## Commands

```bash
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest unit + integration tests
npm run test:watch   # Vitest in watch mode
npm run test:e2e     # Playwright end-to-end tests
```

## Project Structure

```
src/
  app/                      # Next.js App Router
    page.tsx                # Landing page with document upload
    chat/page.tsx           # Authenticated chat interface
    commands/page.tsx       # Command management
    dashboard/page.tsx      # Analytics/feedback dashboard
    documents/page.tsx      # Document list with status
    glossary/page.tsx       # Glossary browser
    embed/chat/page.tsx     # Embeddable chat widget (no auth)
    embed/demo/page.tsx     # Embed demo page
    sign-in/                # Clerk sign-in
    sign-up/                # Clerk sign-up
    api/
      chat/route.ts         # Authenticated streaming chat (SSE)
      chat/public/route.ts  # Public chat (CORS, IP rate-limited: 20/min)
      ingest/route.ts       # Document upload + processing
      ingest/text/route.ts  # Text-based ingestion
      ingest/status/[id]/   # Processing status (SSE)
      documents/            # Document CRUD
      commands/             # Custom command CRUD + execution
      search/route.ts       # Pure vector search
      analytics/route.ts    # Dashboard data
      feedback/route.ts     # Thumbs up/down
      glossary/route.ts     # Glossary terms
      process/              # Background embedding generation
  components/
    chat/                   # ChatInterface, ChatMessage, CitationPanel, CommandPalette, etc.
    commands/               # CommandDialog, CommandTable
    dashboard/              # MetricCard, FeedbackStats, GapsList, TopicsChart
    documents/              # FileUploader, DocumentList, DocumentStatusBadge, UploadTabs
    embed/                  # EmbedChat, EmbedMessage (standalone widget)
    layout/                 # AppHeader (nav + Clerk UserButton)
    ui/                     # shadcn/ui primitives
  hooks/
    useFeedback.ts          # Thumbs up/down feedback state + submission
    useProcessingStatus.ts  # SSE listener for document processing status
  lib/
    supabase.ts             # Supabase clients (anon + admin, lazy-init) + all DB type interfaces
    openai.ts               # OpenAI client via OpenRouter base URL; embedding helpers
    rag.ts                  # Sales-agent RAG prompt builder (3 conversation stages)
    embeddings.ts           # Batch embedding generation with retry/backoff
    glossary.ts             # LLM-based glossary extraction
    glossary-highlighter.ts # React text scanner for glossary term highlighting
    utils.ts                # cn() helper (clsx + tailwind-merge)
    retrieval/
      config.ts             # Retrieval constants (thresholds, weights, top-k)
      hybrid.ts             # Hybrid search (pgvector + keyword via Supabase RPC)
      query-expansion.ts    # LLM query expansion (3 variants)
      reranker.ts           # LLM cross-encoder reranking
      pipeline.ts           # Full retrieval orchestrator
    chunking/
      semantic.ts           # Text chunking (1000 char target, 1500 max, 200 overlap)
      hierarchy.ts          # Document > section > chunk tree builder
    extraction/
      pdf.ts                # PDF extraction (pdf-parse)
      docx.ts               # DOCX extraction (mammoth)
      xlsx.ts               # Spreadsheet extraction (SheetJS)
      text.ts               # Plain text / Markdown extraction
    commands/
      index.ts              # Command dispatcher (isCommand, parseCommand, executeCommand)
      compare.ts            # /compare command
      summarize.ts          # /summarize command
      sources.ts            # /sources command
      export.ts             # /export command (conversation to Markdown)
      custom.ts             # Custom command CRUD + template execution
  proxy.ts                  # Clerk middleware (protects all routes except public ones)
```

## Architecture Notes

### Authentication
- Clerk middleware at `src/proxy.ts` (not `middleware.ts` — was renamed)
- Public routes (no auth): `/sign-in`, `/sign-up`, `/api/chat/public`, `/embed/*`, `/api/feedback`, `/api/glossary`
- All other routes require Clerk auth
- Old password-based auth (`src/lib/auth.ts`, `src/middleware.ts`, `src/app/login/`) has been deleted

### RAG Pipeline
1. **Query expansion** — LLM generates 3 query variants
2. **Hybrid search** — pgvector cosine similarity (70%) + pg_trgm keyword (30%) via `match_chunks_hybrid` RPC
3. **Reranking** — LLM-based cross-encoder scoring
4. **MMR diversity** — removes redundant chunks
5. **Parent context** — fetches parent chunks via `get_chunk_with_parents` RPC
6. **Prompt building** — sales-agent system prompt with 3 stages (early/mid/late → Calendly CTA)

### Ingestion Pipeline
1. File upload → validate → extract text (PDF/DOCX/XLSX/TXT)
2. Semantic chunking with section awareness
3. Build hierarchy (document → section → chunk)
4. Generate embeddings in batches with retry
5. Store chunks + vectors in Supabase
6. Extract glossary terms

### Supabase RPC Functions
- `match_chunks_hybrid(query_embedding, query_text, ...)` — hybrid vector + keyword search
- `get_chunk_with_parents(chunk_id)` — recursive parent context retrieval

### Key Database Tables
`documents`, `document_chunks` (with `vector(1536)`), `document_tables`, `conversations`, `messages`, `feedback`, `query_logs`, `glossary`, `audit_logs`

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=         # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase anonymous key
SUPABASE_SERVICE_ROLE_KEY=        # Supabase service role key (server-only)

# AI
OPENROUTER_API_KEY=               # OpenRouter API key (NOT OpenAI directly)
CHAT_MODEL=openai/gpt-4o-mini    # Chat model (OpenRouter format)
EMBEDDING_MODEL=text-embedding-3-small

# Features
CALENDLY_URL=                     # Booking link injected into RAG prompts

# Clerk Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

## Testing

- **Unit + Integration:** Vitest — `tests/unit/` and `tests/integration/`
- **E2E:** Playwright — `tests/e2e/` (Chromium only, 60s timeout, 2 retries on CI)
- **Mocking:** MSW v2 for HTTP mocking; custom mocks in `tests/support/mocks/`
- **Fixtures:** `tests/support/fixtures/test-documents.ts`
- **Coverage:** v8 provider, targets `src/lib/**` and `src/app/api/**`, thresholds: 60% statements/functions/lines, 50% branches
- **Setup:** `tests/support/vitest-setup.ts` sets test env vars
- **Note:** E2E smoke tests reference old `/login` route — stale, needs updating to `/sign-in`

## Path Alias

`@/*` maps to `./src/*` (configured in `tsconfig.json`)

## Types

No dedicated `src/types/` directory. All types are co-located with their modules:
- DB types → `src/lib/supabase.ts`
- RAG types → `src/lib/rag.ts`
- Retrieval types → `src/lib/retrieval/*.ts`
- Chunking types → `src/lib/chunking/*.ts`
- Extraction types → `src/lib/extraction/*.ts`
- Command types → `src/lib/commands/index.ts`

## Conventions

- shadcn/ui components live in `src/components/ui/` — do not modify directly
- Use `cn()` from `@/lib/utils` for conditional class merging
- Supabase clients are lazy-initialized (import-time safe for Vercel builds)
- OpenAI client uses OpenRouter base URL — all model IDs use `provider/model` format (e.g., `openai/gpt-4o-mini`)
- Streaming responses use Vercel AI SDK's `streamText` + SSE
- The embed widget (`/embed/*`) runs without auth and has its own minimal layout
