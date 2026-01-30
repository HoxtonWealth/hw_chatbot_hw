import { ChatInterface } from '@/components/chat/ChatInterface'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b flex-shrink-0">
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

      <main className="container mx-auto px-4 py-4 flex-1">
        <ChatInterface />
      </main>
    </div>
  )
}
