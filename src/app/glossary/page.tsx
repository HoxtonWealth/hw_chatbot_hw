'use client'

import { useState, useEffect } from 'react'
import { Search, BookOpen } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AppHeader } from '@/components/layout/AppHeader'

interface GlossaryTerm {
  id: string
  term: string
  definition: string
  source_document_id?: string
  auto_extracted: boolean
  created_at: string
  documents?: { title: string } | null
}

export default function GlossaryPage() {
  const [terms, setTerms] = useState<GlossaryTerm[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTerms()
  }, [])

  const fetchTerms = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/glossary')
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setTerms(data.terms || [])
        }
      }
    } catch (err) {
      console.error('Failed to fetch glossary:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = search
    ? terms.filter(
        (t) =>
          t.term.toLowerCase().includes(search.toLowerCase()) ||
          t.definition.toLowerCase().includes(search.toLowerCase())
      )
    : terms

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              <CardTitle>Glossary</CardTitle>
              <Badge variant="secondary" className="ml-2">
                {filtered.length} term{filtered.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search terms or definitions..."
                className="pl-9"
              />
            </div>

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {search
                  ? `No terms matching "${search}"`
                  : 'No glossary terms yet. Terms are auto-extracted when documents are processed.'}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Term</TableHead>
                    <TableHead>Definition</TableHead>
                    <TableHead className="w-[200px]">Source</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((term) => (
                    <TableRow key={term.id}>
                      <TableCell className="font-medium">{term.term}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {term.definition}
                      </TableCell>
                      <TableCell>
                        {term.documents?.title ? (
                          <Badge variant="outline" className="text-xs">
                            {term.documents.title}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
