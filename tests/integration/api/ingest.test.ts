import { describe, it, expect, vi, beforeEach } from 'vitest'

// Story 2-1: File Upload acceptance criteria

// These tests verify the ingest route's validation logic
// without hitting the actual Supabase/storage

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'doc-123', title: 'Test', status: 'pending' },
            error: null,
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        remove: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  },
}))

// Mock fetch for triggerProcessing
global.fetch = vi.fn().mockResolvedValue(new Response())

import { POST } from '@/app/api/ingest/route'
import { NextRequest } from 'next/server'

function createFileRequest(
  fileName: string,
  content: string,
  mimeType: string,
  replace = false
): NextRequest {
  const blob = new Blob([content], { type: mimeType })
  const file = new File([blob], fileName, { type: mimeType })
  const formData = new FormData()
  formData.append('file', file)
  if (replace) formData.append('replace', 'true')

  return new NextRequest('http://localhost:3000/api/ingest', {
    method: 'POST',
    body: formData,
  })
}

describe('Story 2-1: File Upload - POST /api/ingest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // AC: File type validation (PDF, TXT, DOCX, MD only)
  it('accepts PDF files', async () => {
    const request = createFileRequest('test.pdf', 'pdf content', 'application/pdf')
    const response = await POST(request)
    const body = await response.json()
    expect(body.success).toBe(true)
  })

  it('accepts TXT files', async () => {
    const request = createFileRequest('test.txt', 'text content', 'text/plain')
    const response = await POST(request)
    const body = await response.json()
    expect(body.success).toBe(true)
  })

  it('accepts DOCX files', async () => {
    const request = createFileRequest(
      'test.docx', 'docx content',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )
    const response = await POST(request)
    const body = await response.json()
    expect(body.success).toBe(true)
  })

  it('accepts MD files', async () => {
    const request = createFileRequest('test.md', '# Markdown', 'text/markdown')
    const response = await POST(request)
    const body = await response.json()
    expect(body.success).toBe(true)
  })

  it('rejects unsupported file types with E103', async () => {
    const request = createFileRequest('test.exe', 'binary', 'application/octet-stream')
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.success).toBe(false)
    expect(body.error.code).toBe('E103')
  })

  // AC: No file provided
  it('returns E101 when no file is provided', async () => {
    const formData = new FormData()
    const request = new NextRequest('http://localhost:3000/api/ingest', {
      method: 'POST',
      body: formData,
    })
    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error.code).toBe('E101')
  })

  // AC: Successful upload returns document info
  it('returns document id and status on success', async () => {
    const request = createFileRequest('test.txt', 'content', 'text/plain')
    const response = await POST(request)
    const body = await response.json()

    expect(body.success).toBe(true)
    expect(body.document).toHaveProperty('id')
    expect(body.document).toHaveProperty('title')
    expect(body.document).toHaveProperty('status')
  })
})
