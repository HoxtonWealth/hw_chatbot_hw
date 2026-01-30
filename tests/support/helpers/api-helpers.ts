/**
 * Helpers for testing Next.js API routes
 */

/**
 * Create a mock NextRequest object for API route testing
 */
export function createMockRequest(
  url: string,
  options: {
    method?: string
    body?: Record<string, unknown>
    headers?: Record<string, string>
    cookies?: Record<string, string>
  } = {}
) {
  const { method = 'GET', body, headers = {}, cookies = {} } = options

  const requestInit: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  }

  if (body) {
    requestInit.body = JSON.stringify(body)
  }

  const request = new Request(`http://localhost:3000${url}`, requestInit)

  // Add cookie header
  if (Object.keys(cookies).length > 0) {
    const cookieStr = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ')
    Object.defineProperty(request, 'cookies', {
      value: {
        get: (name: string) => cookies[name] ? { name, value: cookies[name] } : undefined,
        has: (name: string) => name in cookies,
      },
    })
  }

  return request
}

/**
 * Create a mock FormData with a file
 */
export function createMockFormData(
  fileName: string,
  content: string,
  mimeType: string
): FormData {
  const blob = new Blob([content], { type: mimeType })
  const file = new File([blob], fileName, { type: mimeType })
  const formData = new FormData()
  formData.append('file', file)
  return formData
}

/**
 * Parse SSE stream response into events
 */
export async function parseSSEResponse(response: Response): Promise<Array<{
  type: string
  [key: string]: unknown
}>> {
  const text = await response.text()
  const events: Array<{ type: string;[key: string]: unknown }> = []

  for (const line of text.split('\n')) {
    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
      try {
        events.push(JSON.parse(line.slice(6)))
      } catch {
        // Skip unparseable lines
      }
    }
  }

  return events
}
