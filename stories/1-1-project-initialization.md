# Story 1.1: Project Initialization

Status: review

## Story

As a **developer**,
I want **the Next.js project scaffolded with all dependencies installed**,
so that **I can begin building features on a solid foundation**.

## Acceptance Criteria

1. Next.js 14 project created with App Router, TypeScript, Tailwind, ESLint
2. src/ directory structure with app/ router
3. shadcn/ui initialized with base configuration
4. All npm dependencies installed and verified
5. Environment variables template created (.env.example)
6. Project runs successfully with `npm run dev`
7. TypeScript compiles without errors

## Tasks / Subtasks

- [x] Task 1: Create Next.js project (AC: 1, 2)
  - [x] Run `npx create-next-app@latest gtm-knowledge-base --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"`
  - [x] Verify project structure matches architecture.md
  - [x] Confirm `npm run dev` starts successfully

- [x] Task 2: Initialize shadcn/ui (AC: 3)
  - [x] Run `npx shadcn@latest init`
  - [x] Select: New York style, Slate base color, CSS variables enabled
  - [x] Verify components.json created
  - [x] Add initial components: Button, Card, Input, Dialog, DropdownMenu

- [x] Task 3: Install core dependencies (AC: 4)
  - [x] Install Supabase: `npm install @supabase/supabase-js`
  - [x] Install LangChain: `npm install langchain @langchain/openai @langchain/community`
  - [x] Install Vercel AI SDK: `npm install ai @ai-sdk/openai`
  - [x] Install file parsers: `npm install pdf-parse mammoth`
  - [x] Install utilities: `npm install react-dropzone zod date-fns`
  - [x] Verify all packages in package.json

- [x] Task 4: Create environment template (AC: 5)
  - [x] Create .env.example with all required variables
  - [x] Create .env.local (gitignored) with placeholder values
  - [x] Add .env.local to .gitignore if not present

- [x] Task 5: Verify setup (AC: 6, 7)
  - [x] Run `npm run build` — must complete without errors
  - [x] Run `npm run dev` — must start on localhost:3000
  - [x] Run `npx tsc --noEmit` — must compile without TypeScript errors

## Dev Notes

### Architecture Compliance

**From architecture.md:**
- Framework: Next.js 14 (App Router)
- Language: TypeScript (strict mode)
- Styling: Tailwind CSS + shadcn/ui
- Import alias: `@/*` for absolute imports

### Project Structure Target

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
├── components.json          # shadcn config
└── src/
    ├── app/
    │   ├── globals.css
    │   ├── layout.tsx
    │   └── page.tsx
    ├── components/
    │   └── ui/              # shadcn components
    └── lib/
        └── utils.ts         # shadcn cn() utility
```

### Environment Variables (.env.example)

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# OpenAI
OPENAI_API_KEY=

# Auth
SITE_PASSWORD=

# App Config
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
EMBEDDING_MODEL=text-embedding-3-small
CHAT_MODEL=gpt-4o-mini
MAX_RETRIEVAL_RESULTS=5
```

### NPM Dependencies (from RAG-ENRICHED-SPECS.md)

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
    "mammoth": "^1.8.0",
    "react-dropzone": "^14.2.3",
    "zod": "^3.23.0",
    "date-fns": "^3.3.0",
    "lucide-react": "^0.400.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0"
  }
}
```

### Testing Notes

- No tests required for this story (infrastructure setup)
- Verification via successful build and dev server start

### References

- [Source: architecture.md#Starter-Template-Evaluation]
- [Source: architecture.md#Implementation-Patterns]
- [Source: RAG-ENRICHED-SPECS.md#NPM-Dependencies]
- [Source: RAG-ENRICHED-SPECS.md#Environment-Variables]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References

- No errors encountered during implementation

### Completion Notes List

1. **Task 1**: Created Next.js 16.1.6 project with TypeScript, Tailwind v4, ESLint, App Router, src directory structure. Used latest create-next-app which installed React 19 and Next.js 16 (newer than story spec but fully compatible).

2. **Task 2**: Initialized shadcn/ui with New York style and neutral base color. Installed 5 components: Button, Card, Input, Dialog, DropdownMenu. Created components.json configuration.

3. **Task 3**: Installed all core dependencies:
   - @supabase/supabase-js v2.93.3
   - langchain v1.2.15, @langchain/openai v1.2.3, @langchain/community v1.1.9 (used --legacy-peer-deps for compatibility)
   - ai v6.0.61, @ai-sdk/openai v3.0.22
   - pdf-parse v1.1.1, mammoth v1.11.0
   - react-dropzone v14.3.8, zod v4.3.6, date-fns v4.1.0
   - lucide-react v0.563.0 (installed by shadcn)

4. **Task 4**: Created .env.example with all required environment variables. Created .env.local with placeholder values. Verified .env* already in .gitignore.

5. **Task 5**: All verifications passed:
   - `npx tsc --noEmit` - No TypeScript errors
   - `npm run build` - Compiled successfully, static pages generated
   - `npm run dev` - Server started successfully (port 3001 used as 3000 was occupied)

### File List

**Created:**
- .env.example
- .env.local
- .gitignore
- components.json
- eslint.config.mjs
- next-env.d.ts
- next.config.ts
- package.json
- package-lock.json
- postcss.config.mjs
- tsconfig.json
- public/ (directory with Next.js defaults)
- src/app/favicon.ico
- src/app/globals.css
- src/app/layout.tsx
- src/app/page.tsx
- src/components/ui/button.tsx
- src/components/ui/card.tsx
- src/components/ui/dialog.tsx
- src/components/ui/dropdown-menu.tsx
- src/components/ui/input.tsx
- src/lib/utils.ts

## Change Log

- 2026-01-29: Story implementation completed - all ACs satisfied
