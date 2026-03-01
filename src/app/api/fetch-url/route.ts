export async function POST(request: Request) {
  try {
    const { url } = await request.json()
    if (!url) return Response.json({ error: 'Missing url' }, { status: 400 })

    // Basic URL validation
    let parsed: URL
    try { parsed = new URL(url) } catch { return Response.json({ error: 'Invalid URL' }, { status: 400 }) }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return Response.json({ error: 'Only http/https URLs supported' }, { status: 400 })
    }

    const res = await fetch(url, {
      headers: { 'User-Agent': 'AnyChat/1.0 (URL Fetcher)' },
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const html = await res.text()

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : ''

    // Remove script, style, nav, header, footer tags
    let text = html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<[^>]+>/g, ' ')  // Strip remaining tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim()

    // Truncate to 5000 chars
    if (text.length > 5000) text = text.slice(0, 5000) + '...'

    return Response.json({ title, content: text, url })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
