/**
 * newsService.ts
 * Fetches city-specific news via the GDELT DOC 2.0 API.
 * No API key required. No fabricated results.
 */

export interface NewsArticle {
  url: string;
  title: string;
  domain: string;
  /** ISO 8601 date string, e.g. "20250615T143000Z" → normalized to Date-compatible */
  seendate: string;
  /** May be absent */
  socialimage?: string;
  /** Not always present in GDELT artlist */
  snippet?: string;
}

export interface NewsResult {
  articles: NewsArticle[];
  city: string;
  fetchedAt: string;
}

// Simple in-memory cache to avoid hammering GDELT on every re-render
interface CacheEntry {
  result: NewsResult;
  expiresAt: number; // ms timestamp
}
const cache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Converts GDELT's compact date format "20250615T143000Z" to an ISO string.
 */
export function parseGdeltDate(raw: string): string {
  // Already ISO
  if (raw.includes('-')) return raw;
  // "20250615T143000Z"
  const m = raw.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/);
  if (m) {
    return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}Z`;
  }
  return raw;
}

/**
 * Returns the hostname from a URL, or the full URL if parsing fails.
 */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

/**
 * Fetch top news articles for a city from GDELT DOC 2.0.
 * Results are cached for 5 minutes per city name.
 * Throws on network / parse errors so callers can show an error state.
 */
export async function fetchCityNews(cityName: string): Promise<NewsResult> {
  const key = cityName.toLowerCase().trim();

  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const query = encodeURIComponent(cityName);
  const url =
    `https://api.gdeltproject.org/api/v2/doc/doc` +
    `?query=${query}` +
    `&mode=artlist` +
    `&maxrecords=15` +
    `&timespan=48h` +
    `&sort=datedesc` +
    `&format=json`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GDELT responded with HTTP ${res.status}`);
  }

  const text = await res.text();
  if (!text || text.trim() === '') {
    // GDELT returns empty body when there are no results
    const result: NewsResult = { articles: [], city: cityName, fetchedAt: new Date().toISOString() };
    cache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
    return result;
  }

  let data: { articles?: unknown[] };
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Failed to parse GDELT response as JSON.');
  }

  const rawArticles: NewsArticle[] = (data.articles ?? []).map((a: unknown) => {
    const art = a as Record<string, unknown>;
    return {
      url: String(art.url ?? ''),
      title: String(art.title ?? ''),
      domain: art.domain ? String(art.domain) : extractDomain(String(art.url ?? '')),
      seendate: parseGdeltDate(String(art.seendate ?? '')),
      socialimage: art.socialimage ? String(art.socialimage) : undefined,
      snippet: art.snippet ? String(art.snippet) : undefined,
    };
  }).filter((a) => a.url && a.title);

  const result: NewsResult = {
    articles: rawArticles,
    city: cityName,
    fetchedAt: new Date().toISOString(),
  };

  cache.set(key, { result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}
