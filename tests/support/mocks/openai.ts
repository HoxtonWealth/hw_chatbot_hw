import { vi } from 'vitest'

// Mock OpenAI client for unit tests
export function createMockOpenAIClient() {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [
            {
              message: {
                content: JSON.stringify({ variants: ['variant 1', 'variant 2', 'variant 3'] }),
              },
            },
          ],
        }),
      },
    },
    embeddings: {
      create: vi.fn().mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0.1) }],
      }),
    },
  }
}

export const openaiClient = createMockOpenAIClient()
