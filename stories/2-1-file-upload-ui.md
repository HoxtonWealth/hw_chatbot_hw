# Story 2.1: File Upload UI

Status: review

## Story

As a **user**,
I want **to upload documents via drag-and-drop**,
so that **I can easily add content to the knowledge base**.

## Acceptance Criteria

1. Drag-and-drop upload zone on landing page
2. File type validation (PDF, TXT, DOCX, MD only)
3. File size validation (50MB max)
4. Upload progress indicator
5. Error messages for invalid files
6. Duplicate filename detection with warning dialog

## Tasks / Subtasks

- [x] Task 1: Create FileUploader component (AC: 1)
  - [x] Create `src/components/documents/FileUploader.tsx`
  - [x] Implement react-dropzone for drag-and-drop
  - [x] Style with shadcn Card and Tailwind
  - [x] Show drop zone visual feedback on drag over

- [x] Task 2: Implement file validation (AC: 2, 3)
  - [x] Validate file type (pdf, txt, docx, md)
  - [x] Validate file size (max 50MB)
  - [x] Show inline error for invalid files
  - [x] Use shadcn Alert for error display

- [x] Task 3: Create upload API route (AC: 4)
  - [x] Create `src/app/api/ingest/route.ts`
  - [x] Accept multipart/form-data
  - [x] Save file to Supabase Storage
  - [x] Create document record in database
  - [x] Return document ID for status tracking

- [x] Task 4: Implement progress indicator (AC: 4)
  - [x] Show upload progress percentage
  - [x] Use shadcn Progress component
  - [x] Handle upload completion state

- [x] Task 5: Implement duplicate detection (AC: 6)
  - [x] Check filename against existing documents
  - [x] Show confirmation dialog if duplicate found
  - [x] Options: Replace existing or Cancel
  - [x] Use shadcn AlertDialog

- [x] Task 6: Add to landing page (AC: 1)
  - [x] Update `src/app/page.tsx`
  - [x] Add FileUploader component
  - [x] Show success toast on upload complete

## Dev Notes

### FileUploader Component Pattern

```typescript
'use client'

import { useDropzone } from 'react-dropzone'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { AlertDialog } from '@/components/ui/alert-dialog'

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
}

const MAX_SIZE = 50 * 1024 * 1024 // 50MB

export function FileUploader() {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: ACCEPTED_TYPES,
    maxSize: MAX_SIZE,
    onDrop: handleDrop,
    onDropRejected: handleRejected,
  })
  // ...
}
```

### API Route Pattern

```typescript
// src/app/api/ingest/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get('file') as File

  // Validate
  if (!file) {
    return NextResponse.json(
      { success: false, error: { code: 'E101', message: 'No file provided' } },
      { status: 400 }
    )
  }

  // Check duplicate
  const { data: existing } = await supabaseAdmin
    .from('documents')
    .select('id')
    .eq('file_name', file.name)
    .single()

  // Upload to storage
  // Create document record
  // Return success
}
```

### FRs Covered

- FR1: Upload documents via drag-and-drop (PDF, TXT, DOCX, MD), max 50MB
- FR5a: Warn user when uploading file with duplicate filename
- FR5b: Replace existing document when user confirms
- FR5c: Reject encrypted/password-protected PDFs with error

### References

- [Source: prd.md#Document-Management-MVP]
- [Source: RAG-ENRICHED-SPECS.md#UI-Component-Architecture]

## Dev Agent Record

### Agent Model Used

Claude Opus 4.5 (claude-opus-4-5-20251101)

### Completion Notes List

1. **Task 1**: Created FileUploader component with react-dropzone. Drag-and-drop with visual feedback, styled with shadcn Card.

2. **Task 2**: File validation implemented - type check (PDF, TXT, DOCX, MD) and size limit (50MB). Error display with shadcn Alert.

3. **Task 3**: Created `/api/ingest` route. Handles multipart upload, saves to Supabase Storage, creates document record with hash.

4. **Task 4**: Progress component added showing upload status. Files removed from UI after 2 second delay on success.

5. **Task 5**: Duplicate detection by filename. Returns E102 error code with existingId. AlertDialog for replace confirmation.

6. **Task 6**: Updated landing page with FileUploader. Added Toaster to layout for toast notifications.

### Additional Components Added

- Progress, Alert, AlertDialog, Sonner (toast) components for shadcn/ui

### File List

**Created:**
- src/components/documents/FileUploader.tsx
- src/app/api/ingest/route.ts
- src/components/ui/progress.tsx
- src/components/ui/alert.tsx
- src/components/ui/alert-dialog.tsx
- src/components/ui/sonner.tsx

**Modified:**
- src/app/page.tsx
- src/app/layout.tsx

## Change Log

- 2026-01-29: Story implementation completed - all ACs satisfied
