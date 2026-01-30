import { supabaseAdmin } from '@/lib/supabase'
import { DocumentList } from '@/components/documents/DocumentList'
import { EmptyState } from '@/components/documents/EmptyState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

async function getDocuments() {
  const { data: documents, error } = await supabaseAdmin
    .from('documents')
    .select('id, title, source_type, status, created_at, chunk_count, file_name')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching documents:', error)
    return []
  }

  return documents || []
}

export default async function DocumentsPage() {
  const documents = await getDocuments()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">GTM Knowledge Base</h1>
          <nav className="flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link href="/">Upload</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/documents">Documents</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link href="/chat">Chat</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Documents</CardTitle>
            <Button asChild size="sm">
              <Link href="/">
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {documents.length === 0 ? (
              <EmptyState />
            ) : (
              <DocumentList documents={documents} />
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
