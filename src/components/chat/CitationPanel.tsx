'use client'

import { useState } from 'react'
import { FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Source } from '@/lib/rag'

interface CitationPanelProps {
  sources: Source[]
  className?: string
}

export function CitationPanel({ sources, className }: CitationPanelProps) {
  const [selectedSource, setSelectedSource] = useState<Source | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  if (sources.length === 0) return null

  const handleSourceClick = (source: Source) => {
    setSelectedSource(source)
    setIsDialogOpen(true)
  }

  return (
    <>
      <Card className={cn('w-72', className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Sources ({sources.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <div className="space-y-1 p-4 pt-0">
              {sources.map((source) => (
                <button
                  key={source.index}
                  onClick={() => handleSourceClick(source)}
                  className="w-full text-left p-3 rounded-lg border border-transparent hover:bg-muted hover:border-border transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                      {source.index}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {source.documentTitle || 'Document'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Relevance: {Math.round(source.similarity * 100)}%
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          {selectedSource && (
            <>
              <DialogHeader className="flex-shrink-0">
                <DialogTitle className="flex items-center gap-3 pr-8">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                    {selectedSource.index}
                  </div>
                  <span className="break-words">
                    {selectedSource.documentTitle || 'Source Document'}
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground flex-shrink-0">
                {selectedSource.pageNumber && (
                  <span>Page {selectedSource.pageNumber}</span>
                )}
                {selectedSource.sectionHeader && (
                  <span>Section: {selectedSource.sectionHeader}</span>
                )}
                <span>Relevance: {Math.round(selectedSource.similarity * 100)}%</span>
              </div>

              <ScrollArea className="flex-1 min-h-0 max-h-[55vh] mt-2">
                <div className="pr-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {selectedSource.content}
                  </p>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
