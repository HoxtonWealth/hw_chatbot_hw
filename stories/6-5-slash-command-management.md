# Story 6.5: Slash Command Management

Status: review

## Story

As an **admin user**,
I want **to configure, add, edit, and delete slash commands from the UI**,
so that **I can customize the command palette with domain-specific actions without code changes**.

## Acceptance Criteria

1. A "Commands" page accessible from the main navigation lists all commands (built-in and custom)
2. Built-in commands (compare, summarize, sources, export) are visible but cannot be deleted; only their description can be edited
3. Users can create a new custom command with: name, description, usage hint, and a system prompt template
4. Users can edit an existing custom command's name, description, usage hint, and prompt template
5. Users can delete custom commands with a confirmation dialog
6. Custom commands appear in the chat CommandPalette alongside built-in commands
7. Executing a custom command retrieves relevant document chunks and passes them to the LLM with the custom prompt template
8. Command names are unique, lowercase, alphanumeric + hyphens only, max 20 chars

## Tasks / Subtasks

- [x] Task 1: Create `custom_commands` Supabase table (AC: 1, 3, 8)
  - [x] Create migration `002_custom_commands.sql` with table: id (UUID PK), name (TEXT UNIQUE), description (TEXT), usage_hint (TEXT), prompt_template (TEXT), is_builtin (BOOLEAN DEFAULT false), created_at, updated_at
  - [x] Add CHECK constraint on name: lowercase alphanumeric + hyphens, max 20 chars
  - [x] Add index on name column
  - [x] Seed built-in commands (compare, summarize, sources, export) with is_builtin = true
  - [x] Run migration against Supabase

- [x] Task 2: Create CRUD API routes for commands (AC: 1-5, 8)
  - [x] Create `src/app/api/commands/route.ts` with GET (list all) and POST (create)
  - [x] Create `src/app/api/commands/[id]/route.ts` with PUT (update) and DELETE
  - [x] GET returns all commands ordered by is_builtin DESC, name ASC
  - [x] POST validates: name uniqueness, format (lowercase alphanumeric + hyphens, max 20), required fields (name, description, prompt_template)
  - [x] PUT allows editing description on built-in commands; all fields on custom commands
  - [x] DELETE rejects deletion of built-in commands (is_builtin = true)
  - [x] All endpoints return consistent `{ success, data?, error? }` shape

- [x] Task 3: Create Commands management page UI (AC: 1-5)
  - [x] Create `src/app/commands/page.tsx` with AppHeader and command list table
  - [x] Display columns: Name (with `/` prefix), Description, Type (Built-in / Custom), Actions (Edit, Delete)
  - [x] Built-in commands show a lock icon and no delete button
  - [x] Add "New Command" button that opens a create dialog
  - [x] Create `src/components/commands/CommandTable.tsx` for the list
  - [x] Create `src/components/commands/CommandDialog.tsx` for create/edit form
  - [x] Form fields: Name (input, disabled for built-in), Description (input), Usage Hint (input), Prompt Template (textarea with placeholder explaining `{{query}}` and `{{context}}` variables)
  - [x] Delete confirmation via AlertDialog (reuse pattern from DocumentList)

- [x] Task 4: Add "Commands" to navigation (AC: 1)
  - [x] Add `{ href: '/commands', label: 'Commands' }` to NAV_ITEMS in `src/components/layout/AppHeader.tsx`
  - [x] Add `/api/commands` to middleware public paths

- [x] Task 5: Integrate custom commands into CommandPalette (AC: 6)
  - [x] Modify `src/components/chat/CommandPalette.tsx` to accept an optional `customCommands` prop
  - [x] Merge built-in COMMANDS array with custom commands fetched from API
  - [x] Custom commands use a generic icon (`Sparkles` from lucide-react)
  - [x] Update `ChatInterface.tsx` to fetch custom commands on mount and pass to CommandPalette

- [x] Task 6: Implement custom command execution (AC: 7)
  - [x] Create `src/lib/commands/custom.ts` with server-side `executeCustomCommand` function
  - [x] Create `src/app/api/commands/execute/route.ts` API endpoint for client-side execution
  - [x] Fetch the command's prompt_template from the database
  - [x] Replace `{{query}}` with user args and `{{context}}` with retrieved document chunks
  - [x] Update `src/lib/commands/index.ts` to fall through to custom command handler via API when built-in switch doesn't match
  - [x] Update `isCommand` and `parseCommand` to dynamically accept custom command names

## Dev Notes

### Architecture Pattern

Follow existing CRUD patterns from:
- `src/app/api/documents/route.ts` + `[id]/route.ts` for API structure
- `src/components/documents/DocumentList.tsx` for table + delete dialog pattern
- `src/app/api/glossary/route.ts` for Supabase query patterns

### Database Design

```sql
CREATE TABLE custom_commands (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  usage_hint TEXT,
  prompt_template TEXT,
  is_builtin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Name validation: lowercase, alphanumeric + hyphens, max 20 chars
ALTER TABLE custom_commands ADD CONSTRAINT chk_command_name
  CHECK (name ~ '^[a-z0-9][a-z0-9-]{0,19}$');

CREATE INDEX idx_custom_commands_name ON custom_commands(name);

-- Seed built-in commands
INSERT INTO custom_commands (name, description, usage_hint, is_builtin) VALUES
  ('compare', 'Compare two documents on a topic', '/compare [doc1] vs [doc2] [topic]', true),
  ('summarize', 'Summarize a topic or document', '/summarize [topic or document name]', true),
  ('sources', 'List all documents in the knowledge base', '/sources', true),
  ('export', 'Export conversation to clipboard as Markdown', '/export', true);
```

### Custom Command Execution Flow

```
User types: /my-command some query text
  -> parseCommand() returns { command: 'my-command', args: ['some', 'query', 'text'] }
  -> executeCommand() doesn't match built-in switch
  -> falls through to executeCustomCommand('my-command', args, context)
  -> fetch prompt_template from custom_commands table
  -> retrieve relevant chunks using args as query
  -> replace {{query}} and {{context}} in prompt_template
  -> send to LLM, return result
```

### Prompt Template Variables

Custom commands support these template variables:
- `{{query}}` — The user's arguments after the command name
- `{{context}}` — Retrieved document chunks relevant to the query
- `{{sources}}` — Formatted source list from current conversation

Example prompt template:
```
You are analyzing GTM documents. Given the following context from our knowledge base:

{{context}}

Please answer the following question with a focus on actionable recommendations:
{{query}}

Cite specific sources where applicable.
```

### Key Integration Points

1. **CommandPalette.tsx** — Currently hardcodes `COMMANDS` array. Must merge with DB-fetched custom commands.
2. **commands/index.ts** — `VALID_COMMANDS` is a const array. Must become dynamic, checking DB for custom commands.
3. **ChatInterface.tsx** — Must fetch custom commands on mount (similar to glossary fetch pattern at line 41-56).
4. **AppHeader.tsx** — Add nav item. Follow existing `NAV_ITEMS` pattern.

### Testing Strategy

- Unit tests: API route validation (name format, uniqueness, built-in protection)
- Integration tests: CRUD operations against Supabase
- Component tests: CommandTable renders, CommandDialog form validation
- E2E: Create custom command -> verify it appears in CommandPalette -> execute it

### Project Structure Notes

- New page: `src/app/commands/page.tsx`
- New components: `src/components/commands/CommandTable.tsx`, `CommandDialog.tsx`
- New API routes: `src/app/api/commands/route.ts`, `src/app/api/commands/[id]/route.ts`
- New lib: `src/lib/commands/custom.ts`
- Modified: `CommandPalette.tsx`, `commands/index.ts`, `ChatInterface.tsx`, `AppHeader.tsx`
- Migration: `supabase/migrations/002_custom_commands.sql`

### References

- [Source: architecture.md#Technical-Constraints] Next.js App Router, Supabase, shadcn/ui, Tailwind
- [Source: stories/6-1-slash-commands.md] Existing command system implementation
- [Source: 001_initial_schema.sql] Database table patterns (UUID PK, timestamps, CHECK constraints)

## Dev Agent Record

### Agent Model Used
Claude Opus 4.5 (claude-opus-4-5-20251101)

### Debug Log References
- Runtime error: `supabaseAdmin` imported client-side via `custom.ts` → `index.ts` → `ChatInterface.tsx`. Fixed by routing custom command execution through `/api/commands/execute` API endpoint instead of direct server-side import.

### Completion Notes List
- All 6 tasks completed and verified end-to-end in browser
- Migration executed manually via Supabase SQL Editor (CLI not linked to project)
- TypeScript check and Next.js build pass clean
- Commands page shows built-in (lock icon, edit only) and custom (edit + delete) commands
- Custom commands appear in chat CommandPalette with Sparkles icon
- Create/Edit/Delete operations verified via UI

### File List
**New files:**
- `supabase/migrations/002_custom_commands.sql` — Migration for custom_commands table
- `src/app/api/commands/route.ts` — GET (list) + POST (create) API
- `src/app/api/commands/[id]/route.ts` — PUT (update) + DELETE API
- `src/app/api/commands/execute/route.ts` — Custom command execution API
- `src/app/commands/page.tsx` — Commands management page
- `src/components/commands/CommandTable.tsx` — Command list table component
- `src/components/commands/CommandDialog.tsx` — Create/edit dialog component
- `src/lib/commands/custom.ts` — Server-side custom command execution

**Modified files:**
- `src/lib/supabase.ts` — Added `CustomCommand` interface
- `src/lib/commands/index.ts` — Added custom command support, client-side API fallthrough
- `src/components/chat/CommandPalette.tsx` — Accepts `customCommands` prop, merges with built-in
- `src/components/chat/ChatInterface.tsx` — Fetches custom commands, passes to palette
- `src/components/layout/AppHeader.tsx` — Added "Commands" nav item
- `src/middleware.ts` — Added `/api/commands` to PUBLIC_PATHS
