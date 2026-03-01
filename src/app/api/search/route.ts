export async function POST(request: Request) {
  try {
    const { query } = await request.json()
    if (!query) return Response.json({ error: 'Missing query' }, { status: 400 })

    // DuckDuckGo Instant Answer API
    const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_redirect=1&no_html=1`
    const res = await fetch(ddgUrl, { headers: { 'User-Agent': 'AnyChat/1.0' } })
    const data = await res.json()

    const results: Array<{ title: string; url: string; snippet: string }> = []

    // Abstract (main answer)
    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL || '',
        snippet: data.AbstractText,
      })
    }

    // Related topics
    if (data.RelatedTopics) {
      for (const topic of data.RelatedTopics.slice(0, 8)) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0]?.slice(0, 80) || topic.Text.slice(0, 80),
            url: topic.FirstURL,
            snippet: topic.Text,
          })
        }
        // Subtopics
        if (topic.Topics) {
          for (const sub of topic.Topics.slice(0, 3)) {
            if (sub.Text && sub.FirstURL) {
              results.push({
                title: sub.Text.split(' - ')[0]?.slice(0, 80) || sub.Text.slice(0, 80),
                url: sub.FirstURL,
                snippet: sub.Text,
              })
            }
          }
        }
      }
    }

    // Answer box
    if (data.Answer && results.length === 0) {
      results.push({ title: 'Direct Answer', url: '', snippet: data.Answer })
    }

    // If DDG API returned nothing useful, try the HTML lite version
    if (results.length === 0) {
      try {
        const htmlRes = await fetch(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`, {
          headers: { 'User-Agent': 'AnyChat/1.0' },
        })
        const html = await htmlRes.text()
        // Parse simple result snippets from the lite page
        const snippetRegex = new RegExp('class="result-snippet">(.*?)<\\/td>', 'gs')
        const linkRegex = new RegExp('class="result-link"[^>]*>(.*?)<\\/a>', 'gs')
        const snippets = [...html.matchAll(snippetRegex)].map(m => m[1].replace(/<[^>]*>/g, '').trim())
        const links = [...html.matchAll(linkRegex)].map(m => m[1].replace(/<[^>]*>/g, '').trim())
        
        // Also grab URLs
        const urlRegex = /class="result-link"\s+href="([^"]+)"/g
        const urls = [...html.matchAll(urlRegex)].map(m => m[1])

        for (let i = 0; i < Math.min(snippets.length, 5); i++) {
          results.push({
            title: links[i] || `Result ${i + 1}`,
            url: urls[i] || '',
            snippet: snippets[i] || '',
          })
        }
      } catch { /* fallback failed, return empty */ }
    }

    return Response.json({ results: results.slice(0, 10), query })
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
