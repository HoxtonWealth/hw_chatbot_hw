'use client'

import { useState } from 'react'
import { FileText, AlertCircle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/components/ui/sonner'

const MAX_CONTENT_LENGTH = 100_000

export function TextInput() {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    setError(null)

    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (!content.trim()) {
      setError('Content is required')
      return
    }

    if (content.length > MAX_CONTENT_LENGTH) {
      setError(`Content exceeds ${MAX_CONTENT_LENGTH.toLocaleString()} character limit`)
      return
    }

    setIsSubmitting(true)

    try {
      const response = await fetch('/api/ingest/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          description: description.trim() || undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error?.message || 'Submission failed')
      }

      toast.success(`"${title.trim()}" added successfully`)
      setTitle('')
      setDescription('')
      setContent('')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Submission failed'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Strip HTML tags from pasted content
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const pastedText = e.clipboardData.getData('text/plain')
    if (pastedText && e.clipboardData.types.includes('text/html')) {
      e.preventDefault()
      const textarea = e.currentTarget
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const newContent = content.slice(0, start) + pastedText + content.slice(end)
      setContent(newContent)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground mb-2">
          <FileText className="h-5 w-5" />
          <span className="text-sm font-medium">Paste or type text content</span>
        </div>

        <div className="space-y-2">
          <label htmlFor="text-title" className="text-sm font-medium">
            Title <span className="text-destructive">*</span>
          </label>
          <Input
            id="text-title"
            placeholder="e.g., Q4 Sales Strategy Notes"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="text-description" className="text-sm font-medium">
            Description
          </label>
          <Input
            id="text-description"
            placeholder="Optional notes about this content"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isSubmitting}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label htmlFor="text-content" className="text-sm font-medium">
              Content <span className="text-destructive">*</span>
            </label>
            <span className={`text-xs ${content.length > MAX_CONTENT_LENGTH ? 'text-destructive' : 'text-muted-foreground'}`}>
              {content.length.toLocaleString()} / {MAX_CONTENT_LENGTH.toLocaleString()}
            </span>
          </div>
          <Textarea
            id="text-content"
            placeholder="Paste or type your content here... Supports plain text and Markdown."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onPaste={handlePaste}
            disabled={isSubmitting}
            rows={12}
            className="font-mono text-sm"
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || !title.trim() || !content.trim()}
          className="w-full"
        >
          {isSubmitting ? 'Adding to knowledge base...' : 'Add to Knowledge Base'}
        </Button>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
