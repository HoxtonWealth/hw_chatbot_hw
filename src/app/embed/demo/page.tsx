'use client'

import Script from 'next/script'

export default function EmbedDemoPage() {
  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif', maxWidth: 800, margin: '40px auto', padding: '0 20px' }}>
      <h1 style={{ color: '#171717' }}>Embed Widget Demo</h1>
      <p style={{ color: '#525252', lineHeight: 1.6 }}>
        This page demonstrates the embeddable RAG chatbot widget. You should see a floating chat button in the bottom-right corner.
      </p>
      <p style={{ color: '#525252', lineHeight: 1.6 }}>
        Click the button to open the chat and ask a question about the knowledge base.
      </p>

      <div style={{ marginTop: 32, padding: 20, background: '#f5f5f5', borderRadius: 8 }}>
        <p style={{ color: '#525252', fontSize: 14, marginBottom: 8 }}>
          <strong>Embed code:</strong> Add this to any landing page:
        </p>
        <pre style={{ background: '#171717', color: '#e5e5e5', padding: 16, borderRadius: 8, fontSize: 13, overflowX: 'auto' }}>
{`<script
  src="${typeof window !== 'undefined' ? window.location.origin : ''}/embed.js"
  data-position="bottom-right"
  data-primary-color="#6366f1"
  data-title="Ask me anything"
  defer>
</script>`}
        </pre>
      </div>

      <Script
        src="/embed.js"
        data-position="bottom-right"
        data-primary-color="#6366f1"
        data-title="Ask me anything"
        strategy="lazyOnload"
      />
    </div>
  )
}
