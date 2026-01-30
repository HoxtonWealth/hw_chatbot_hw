// Global test setup for Vitest
// Runs before all test files

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.SITE_PASSWORD = 'test-password-123'
process.env.CHAT_MODEL = 'gpt-4o-mini'
