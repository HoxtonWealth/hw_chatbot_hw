import { describe, it, expect, vi, beforeEach } from 'vitest'

// Story 2-4: Document Management acceptance criteria

const { mockDocuments } = vi.hoisted(() => ({
  mockDocuments: [
    {
      id: 'doc-1',
      title: 'GTM Strategy',
      source_type: 'pdf',
      status: 'ready',
      created_at: '2026-01-15T00:00:00Z',
      chunk_count: 5,
      file_name: 'gtm-strategy.pdf',
    },
    {
      id: 'doc-2',
      title: 'Sales Playbook',
      source_type: 'docx',
      status: 'processing',
      created_at: '2026-01-14T00:00:00Z',
      chunk_count: 0,
      file_name: 'sales-playbook.docx',
    },
  ],
}))

vi.mock('@/lib/supabase', () => ({
  supabaseAdmin: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({ data: mockDocuments, error: null }),
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { ...mockDocuments[0], file_path: 'documents/test-path.pdf' },
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
        remove: vi.fn().mockResolvedValue({ error: null }),
      }),
    },
  },
}))

import { GET } from '@/app/api/documents/route'

describe('Story 2-4: GET /api/documents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // AC: Document list page with table view
  it('returns list of documents', async () => {
    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.documents).toBeInstanceOf(Array)
    expect(body.documents.length).toBe(2)
  })

  // AC: Columns - name, type, status, upload date, chunk count
  it('returns documents with required fields', async () => {
    const response = await GET()
    const body = await response.json()

    const doc = body.documents[0]
    expect(doc).toHaveProperty('id')
    expect(doc).toHaveProperty('title')
    expect(doc).toHaveProperty('source_type')
    expect(doc).toHaveProperty('status')
    expect(doc).toHaveProperty('created_at')
    expect(doc).toHaveProperty('chunk_count')
    expect(doc).toHaveProperty('file_name')
  })

  // AC: Status badges (queued, processing, ready, failed)
  it('includes status field for each document', async () => {
    const response = await GET()
    const body = await response.json()

    const statuses = body.documents.map((d: { status: string }) => d.status)
    expect(statuses).toContain('ready')
    expect(statuses).toContain('processing')
  })
})
