type WebSearchResult = {
  title: string;
  url: string;
  snippet: string;
};

type WebSearchOptions = {
  query: string;
  count?: number;
  safeSearch?: string;
};

export async function web_search({
  query,
  count = 3,
  safeSearch = "moderate",
}: WebSearchOptions): Promise<{ results: WebSearchResult[] }> {
  try {
    // Using DuckDuckGo HTML Lite API (no API key required)
    const response = await fetch(
      `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=${safeSearch === "strict" ? "us-en" : "us-en"}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
        },
        next: { revalidate: 60 },
      }
    );

    if (!response.ok) {
      throw new Error(`Web search failed: ${response.status}`);
    }

    const html = await response.text();

    // Simple HTML parsing to extract results
    const results: WebSearchResult[] = [];
    const resultRegex = /<a class="result__a" href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    let countNum = 0;

    while ((match = resultRegex.exec(html)) !== null && countNum < count) {
      const url = match[1];
      const title = match[2].replace(/<[^>]+>/g, "").trim();
      const snippet = match[3].replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

      if (title && url && snippet && !url.includes("duckduckgo")) {
        results.push({ title, url, snippet });
        countNum++;
      }
    }

    return { results };
  } catch (e) {
    return { results: [] };
  }
}
