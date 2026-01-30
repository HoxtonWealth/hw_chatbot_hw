import { FileUploader } from '@/components/documents/FileUploader'
import { AppHeader } from '@/components/layout/AppHeader'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">Upload Documents</h2>
            <p className="text-muted-foreground">
              Add documents to your knowledge base for AI-powered search and retrieval
            </p>
          </div>

          <FileUploader />
        </div>
      </main>
    </div>
  )
}
