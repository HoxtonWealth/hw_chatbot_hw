export interface ChunkConfig {
  targetSize: number
  maxSize: number
  overlap: number
}

export interface TextChunk {
  content: string
  chunkIndex: number
  sectionHeader?: string
  pageNumber?: number
  tokenCount: number
}

const DEFAULT_CONFIG: ChunkConfig = {
  targetSize: 1000, // chars
  maxSize: 1500,
  overlap: 200,
}

// Rough token estimation (4 chars per token average)
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

// Split text at semantic boundaries (paragraphs, sentences)
function splitAtBoundaries(text: string): string[] {
  // First try paragraph boundaries
  const paragraphs = text.split(/\n\s*\n/)
  if (paragraphs.length > 1) {
    return paragraphs.filter(p => p.trim())
  }

  // Fall back to sentence boundaries
  const sentences = text.split(/(?<=[.!?])\s+/)
  return sentences.filter(s => s.trim())
}

export function chunkText(
  text: string,
  sectionHeader?: string,
  pageNumber?: number,
  config: ChunkConfig = DEFAULT_CONFIG
): TextChunk[] {
  const chunks: TextChunk[] = []
  const boundaries = splitAtBoundaries(text)

  let currentChunk = ''
  let chunkIndex = 0

  for (const segment of boundaries) {
    const potentialChunk = currentChunk
      ? currentChunk + '\n\n' + segment
      : segment

    if (potentialChunk.length > config.maxSize && currentChunk) {
      // Current chunk is full, save it
      chunks.push({
        content: currentChunk.trim(),
        chunkIndex: chunkIndex++,
        sectionHeader,
        pageNumber,
        tokenCount: estimateTokens(currentChunk),
      })

      // Start new chunk with overlap
      const overlapStart = Math.max(0, currentChunk.length - config.overlap)
      const overlapText = currentChunk.slice(overlapStart)
      currentChunk = overlapText + '\n\n' + segment
    } else if (potentialChunk.length >= config.targetSize) {
      // Reached target size, save and continue
      chunks.push({
        content: potentialChunk.trim(),
        chunkIndex: chunkIndex++,
        sectionHeader,
        pageNumber,
        tokenCount: estimateTokens(potentialChunk),
      })

      // Start new chunk with overlap
      const overlapStart = Math.max(0, potentialChunk.length - config.overlap)
      currentChunk = potentialChunk.slice(overlapStart)
    } else {
      // Keep accumulating
      currentChunk = potentialChunk
    }
  }

  // Add remaining content
  if (currentChunk.trim()) {
    chunks.push({
      content: currentChunk.trim(),
      chunkIndex: chunkIndex,
      sectionHeader,
      pageNumber,
      tokenCount: estimateTokens(currentChunk),
    })
  }

  return chunks
}

// Chunk with section awareness
export function chunkWithSections(
  sections: Array<{ header?: string; content: string; pageNumber?: number }>,
  config: ChunkConfig = DEFAULT_CONFIG
): TextChunk[] {
  const allChunks: TextChunk[] = []
  let globalIndex = 0

  for (const section of sections) {
    const sectionChunks = chunkText(
      section.content,
      section.header,
      section.pageNumber,
      config
    )

    for (const chunk of sectionChunks) {
      allChunks.push({
        ...chunk,
        chunkIndex: globalIndex++,
      })
    }
  }

  return allChunks
}
