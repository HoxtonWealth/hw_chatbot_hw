import { TextChunk } from './semantic'

export interface HierarchyNode {
  id?: string
  level: 'document' | 'section' | 'chunk'
  content: string
  summary?: string
  sectionHeader?: string
  pageNumber?: number
  chunkIndex: number
  tokenCount: number
  children?: HierarchyNode[]
  parentId?: string
}

export interface DocumentHierarchy {
  document: HierarchyNode
  sections: HierarchyNode[]
  chunks: HierarchyNode[]
}

// Generate a simple summary (first N chars + ellipsis)
// In production, this would use an LLM
function generateSimpleSummary(text: string, maxLength: number = 200): string {
  if (text.length <= maxLength) return text
  const truncated = text.slice(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + '...'
}

export function buildHierarchy(
  documentTitle: string,
  fullText: string,
  sections: Array<{ header?: string; content: string; level?: number }>,
  chunks: TextChunk[]
): DocumentHierarchy {
  // Document level node
  const documentNode: HierarchyNode = {
    level: 'document',
    content: fullText,
    summary: generateSimpleSummary(fullText, 500),
    chunkIndex: 0,
    tokenCount: Math.ceil(fullText.length / 4),
  }

  // Section level nodes
  const sectionNodes: HierarchyNode[] = sections
    .filter(s => s.header || s.content.length > 200)
    .map((section, index) => ({
      level: 'section' as const,
      content: section.content,
      summary: generateSimpleSummary(section.content, 300),
      sectionHeader: section.header,
      chunkIndex: index,
      tokenCount: Math.ceil(section.content.length / 4),
    }))

  // Chunk level nodes with parent references
  const chunkNodes: HierarchyNode[] = chunks.map(chunk => {
    // Find parent section based on section header
    const parentSection = sectionNodes.find(
      s => s.sectionHeader === chunk.sectionHeader
    )

    return {
      level: 'chunk' as const,
      content: chunk.content,
      sectionHeader: chunk.sectionHeader,
      pageNumber: chunk.pageNumber,
      chunkIndex: chunk.chunkIndex,
      tokenCount: chunk.tokenCount,
      parentId: parentSection?.id,
    }
  })

  return {
    document: documentNode,
    sections: sectionNodes,
    chunks: chunkNodes,
  }
}

// Flatten hierarchy for database storage
export function flattenHierarchy(hierarchy: DocumentHierarchy): HierarchyNode[] {
  return [
    hierarchy.document,
    ...hierarchy.sections,
    ...hierarchy.chunks,
  ]
}
