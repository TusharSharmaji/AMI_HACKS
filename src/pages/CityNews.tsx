import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Newspaper, RefreshCw, ExternalLink, Clock,
  Loader2, WifiOff, AlertTriangle, Globe
} from 'lucide-react';
import { fetchCityNews } from '../services/newsService';
import type { NewsArticle } from '../services/newsService';
import { useLocation } from '../hooks/useLocation';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatNewsDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = Date.now();
    const diffMs = now - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

// ─── Article Card ─────────────────────────────────────────────────────────────
const ArticleCard: React.FC<{ article: NewsArticle; index: number }> = ({ article }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-white/[0.03] border border-white/8 hover:border-white/15 hover:bg-white/[0.05] rounded-xl transition-all duration-150 overflow-hidden"
    >
      <div className="flex gap-0">
        {/* Image */}
        {article.socialimage && !imgError && (
          <div className="shrink-0 w-20 sm:w-28 h-full min-h-[80px] bg-white/5 overflow-hidden rounded-l-xl">
            <img
              src={article.socialimage}
              alt=""
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              onError={() => setImgError(true)}
              loading="lazy"
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0 p-3 sm:p-4">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 min-w-0">
              <Globe className="w-3 h-3 text-slate-600 shrink-0" />
              <span className="text-[10px] font-mono text-slate-500 truncate">{article.domain}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Clock className="w-3 h-3 text-slate-600" />
              <span className="text-[10px] font-mono text-slate-500">{formatNewsDate(article.seendate)}</span>
              <ExternalLink className="w-3 h-3 text-slate-700 group-hover:text-cyan-500 transition-colors ml-1" />
            </div>
          </div>
          <h3 className="text-sm text-slate-200 font-medium leading-snug group-hover:text-white transition-colors line-clamp-2">
            {article.title}
          </h3>
          {article.snippet && (
            <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed line-clamp-2">
              {article.snippet}
            </p>
          )}
        </div>
      </div>
    </a>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export const CityNews: React.FC = () => {
  const { selectedLocation } = useLocation();
  const cityName = selectedLocation?.name ?? 'New York City';

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [, setLastCity] = useState('');
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  // debounce city changes
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (city: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchCityNews(city);
      setArticles(result.articles);
      setFetchedAt(result.fetchedAt);
      setLastCity(city);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setError(msg);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch when city changes (debounced 400 ms)
  useEffect(() => {
    if (!cityName) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load(cityName);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [cityName, load]);

  const handleRefresh = () => load(cityName);

  return (
    <div className="h-full overflow-y-auto bg-[#090d14]">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Newspaper className="w-5 h-5 text-cyan-400" />
              <h1 className="text-lg font-bold font-mono text-white tracking-tight">City News</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                LIVE
              </span>
            </div>
            <p className="text-xs text-slate-500 font-mono">
              Latest news for{' '}
              <span className="text-cyan-400">{cityName}</span>
              {fetchedAt && (
                <span className="text-slate-600 ml-2">· updated {formatNewsDate(fetchedAt)}</span>
              )}
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-1.5 text-xs font-mono text-slate-400 hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-colors bg-white/5 hover:bg-white/10 disabled:opacity-40"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* ── Source note ── */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-600">
          <Globe className="w-3 h-3" />
          Powered by GDELT Project — last 48 hours, sorted by date
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
            <p className="text-xs font-mono text-slate-500">Fetching news for {cityName}…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <WifiOff className="w-8 h-8 text-slate-600" />
            <p className="text-sm font-mono text-slate-400">Could not load news</p>
            <p className="text-xs text-slate-600 max-w-xs">{error}</p>
            <button
              onClick={handleRefresh}
              className="mt-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 border border-cyan-800/40 hover:border-cyan-700/60 px-3 py-1.5 rounded-lg transition-colors"
            >
              Try again
            </button>
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
            <AlertTriangle className="w-8 h-8 text-slate-600" />
            <p className="text-sm font-mono text-slate-400">No articles found for {cityName}</p>
            <p className="text-xs text-slate-600">Try selecting a different city or refresh later.</p>
            <button
              onClick={handleRefresh}
              className="mt-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 border border-cyan-800/40 hover:border-cyan-700/60 px-3 py-1.5 rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {articles.map((article, i) => (
              <ArticleCard key={article.url + i} article={article} index={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
