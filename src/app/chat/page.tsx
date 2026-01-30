import { ChatInterface } from '@/components/chat/ChatInterface'
import { AppHeader } from '@/components/layout/AppHeader'

export default function ChatPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="container mx-auto px-4 py-4 flex-1">
        <ChatInterface />
      </main>
    </div>
  )
}
