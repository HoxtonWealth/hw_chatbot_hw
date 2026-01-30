'use client'

interface GlossaryTermProps {
  term: string
  definition: string
  sourceDocument?: string
}

export function GlossaryTerm({ term, definition, sourceDocument }: GlossaryTermProps) {
  return (
    <span className="relative inline-block group">
      <span className="border-b border-dotted border-foreground/50 cursor-help">
        {term}
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 rounded-md bg-popover text-popover-foreground shadow-md border p-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50">
        <span className="block font-semibold mb-1">{term}</span>
        <span className="block text-muted-foreground leading-relaxed">{definition}</span>
        {sourceDocument && (
          <span className="inline-block mt-2 px-1.5 py-0.5 bg-muted text-muted-foreground rounded text-[10px]">
            {sourceDocument}
          </span>
        )}
      </span>
    </span>
  )
}
