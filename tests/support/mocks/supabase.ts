import { vi } from 'vitest'

// Mock Supabase client for unit tests
export function createMockSupabaseClient() {
  const mockFrom = vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    order: vi.fn().mockReturnThis(),
  })

  const mockRpc = vi.fn().mockResolvedValue({ data: [], error: null })

  const mockStorage = {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
      download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }

  return {
    from: mockFrom,
    rpc: mockRpc,
    storage: mockStorage,
  }
}

// Default mock for @/lib/supabase
export const supabaseAdmin = createMockSupabaseClient()
