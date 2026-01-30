'use client'

import { X, FileText, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { Source } from '@/lib/rag'

interface CitationPanelProps {
  sources: Source[]
  selectedSource: Source | null
  onSourceSelect: (source: Source) => void
  onClose: () => void
}

export function CitationPanel({
  sources,
  selectedSource,
  onSourceSelect,
  onClose,
}: CitationPanelProps) {
  if (sources.length === 0) {
    return null
  }

  return (
    <Card className="w-80 flex-shrink-0 flex flex-col">
      <CardHeader className="py-3 px-4 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Sources ({sources.length})</CardTitle>
          {selectedSource && (
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-2 space-y-2">
            {sources.map((source) => (
              <button
                key={source.index}
                onClick={() => onSourceSelect(source)}
                className={cn(
                  'w-full text-left p-3 rounded-lg border transition-colors',
                  selectedSource?.index === source.index
                    ? 'border-primary bg-primary/5'
                    : 'border-transparent hover:bg-muted'
                )}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                    {source.index}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                      <FileText className="h-3 w-3" />
                      <span className="truncate">{source.documentTitle || 'Document'}</span>
                      {source.pageNumber && (
                        <span>• p.{source.pageNumber}</span>
                      )}
                    </div>
                    <p className="text-sm line-clamp-2">
                      {source.sectionHeader && (
                        <span className="font-medium">{source.sectionHeader}: </span>
                      )}
                      {source.content.slice(0, 100)}...
                    </p>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Relevance: {Math.round(source.similarity * 100)}%
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Expanded Source View */}
          {selectedSource && (
            <div className="p-4 border-t bg-muted/50">
              <h4 className="font-medium text-sm mb-2">
                [{selectedSource.index}] {selectedSource.sectionHeader || 'Source'}
              </h4>
              <p className="text-sm text-muted-foreground mb-3">
                {selectedSource.content}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{selectedSource.documentTitle || 'Document'}</span>
                {selectedSource.pageNumber && (
                  <span>• Page {selectedSource.pageNumber}</span>
                )}
                <span>• {Math.round(selectedSource.similarity * 100)}% match</span>
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
