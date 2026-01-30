import OpenAI from 'openai'

export const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
})

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || 'text-embedding-3-small'

export async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
  })
  return response.data[0].embedding
}

export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return []

  const response = await openai.embeddings.create({
    model: EMBEDDING_MODEL,
    input: texts,
  })
  return response.data.map((d: { embedding: number[] }) => d.embedding)
}

// Estimate token count (rough approximation)
export function estimateTokenCount(text: string): number {
  // OpenAI uses ~4 characters per token on average
  return Math.ceil(text.length / 4)
}
