# Story 2.4: Document Management UI

Status: review

## Story

As a **user**,
I want **to view and manage uploaded documents**,
so that **I can track what's in the knowledge base**.

## Acceptance Criteria

1. Document list page with table view
2. Columns: name, type, status, upload date, chunk count
3. Status badges (queued, processing, ready, failed)
4. Delete button with confirmation dialog
5. Cascade delete removes all chunks and embeddings
6. Empty state with upload CTA when no documents exist
7. Real-time status updates via SSE

## Tasks / Subtasks

- [x] Task 1: Create documents page (AC: 1)
  - [x] Create `src/app/documents/page.tsx`
  - [x] Fetch documents from API
  - [x] Layout with shadcn Card container

- [x] Task 2: Create DocumentList component (AC: 1, 2)
  - [x] Create `src/components/documents/DocumentList.tsx`
  - [x] Use shadcn Table component
  - [x] Columns: name, type, status, date, chunks

- [x] Task 3: Create status badges (AC: 3)
  - [x] Create `src/components/documents/DocumentStatusBadge.tsx`
  - [x] Queued: secondary badge
  - [x] Processing: warning badge with spinner
  - [x] Ready: success badge
  - [x] Failed: destructive badge

- [x] Task 4: Implement delete functionality (AC: 4, 5)
  - [x] Add delete button to each row
  - [x] Use shadcn AlertDialog for confirmation
  - [x] Call DELETE /api/documents/[id]
  - [x] Cascade delete handled by database FK

- [x] Task 5: Create empty state (AC: 6)
  - [x] Show when no documents exist
  - [x] Include upload CTA button
  - [x] Link to upload page

- [x] Task 6: Implement real-time updates (AC: 7)
  - [x] Create `src/app/api/ingest/status/[id]/route.ts`
  - [x] Implement Server-Sent Events (SSE)
  - [x] Create `src/hooks/useProcessingStatus.ts`
  - [x] SSE polls every second until complete/failed

- [x] Task 7: Create documents API (AC: 1-5)
  - [x] Create `src/app/api/documents/route.ts` (GET list)
  - [x] Create `src/app/api/documents/[id]/route.ts` (GET, DELETE)

## Dev Notes

### DocumentList Component

```typescript
'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { DocumentStatusBadge } from './DocumentStatusBadge'
import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

interface Document {
  id: string
  title: string
  source_type: string
  status: string
  created_at: string
  chunk_count: number
}

export function DocumentList({ documents }: { documents: Document[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Name</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Uploaded</TableHead>
          <TableHead>Chunks</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {documents.map((doc) => (
          <TableRow key={doc.id}>
            <TableCell>{doc.title}</TableCell>
            <TableCell>{doc.source_type}</TableCell>
            <TableCell><DocumentStatusBadge status={doc.status} /></TableCell>
            <TableCell>{formatDate(doc.created_at)}</TableCell>
            <TableCell>{doc.chunk_count}</TableCell>
            <TableCell>
              <DeleteButton documentId={doc.id} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
```

### SSE Status Endpoint

```typescript
// src/app/api/ingest/status/[id]/route.ts
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const sendStatus = async () => {
        const { data: doc } = await supabase
          .from('documents')
          .select('status, chunk_count, error_message')
          .eq('id', params.id)
          .single()

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(doc)}\n\n`))

        if (doc.status === 'completed' || doc.status === 'failed') {
          controller.close()
          return
        }

        setTimeout(sendStatus, 1000)
      }

      await sendStatus()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

### FRs Covered

- FR2: Display document list with name, type, status, date
- FR3: Delete documents with confirmation; cascade delete
- FR4: Show real-time processing status
- FR5e: Display empty state with upload CTA

### References

- [Source: prd.md#Document-Management-MVP]
- [Source: RAG-ENRICHED-SPECS.md#UI-Component-Architecture]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

1. **Task 1**: Created documents page with server-side data fetching, Card layout.

2. **Task 2**: Created DocumentList with Table component, delete button, date formatting.

3. **Task 3**: Created DocumentStatusBadge with variant badges and processing spinner.

4. **Task 4**: Delete with AlertDialog confirmation, calls DELETE API, refreshes page.

5. **Task 5**: EmptyState component with icon, message, and upload CTA.

6. **Task 6**: SSE endpoint for real-time status updates, useProcessingStatus hook.

7. **Task 7**: Documents API with GET list and GET/DELETE by ID.

### Additional Components Added

- Table, Badge components for shadcn/ui

### File List

**Created:**
- src/app/documents/page.tsx
- src/app/api/documents/route.ts
- src/app/api/documents/[id]/route.ts
- src/app/api/ingest/status/[id]/route.ts
- src/components/documents/DocumentList.tsx
- src/components/documents/DocumentStatusBadge.tsx
- src/components/documents/EmptyState.tsx
- src/components/ui/table.tsx
- src/components/ui/badge.tsx
- src/hooks/useProcessingStatus.ts

**Modified:**
- src/app/page.tsx (added navigation)

## Change Log

- 2026-01-29: Story implementation completed - all ACs satisfied
