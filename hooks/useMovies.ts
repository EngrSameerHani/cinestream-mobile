// ============================================================
// Movie data hooks
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { moviesApi, progressApi } from '../services/api';
import {
  Movie,
  CategoryRow,
  ContinueWatchingItem,
  WatchHistoryItem,
  PaginatedData,
} from '../types';

// ── Home screen data ──────────────────────────────────────────

export function useHomeData() {
  const [featured,         setFeatured]         = useState<Movie[]>([]);
  const [byCategory,       setByCategory]       = useState<CategoryRow[]>([]);
  const [continueWatching, setContinueWatching] = useState<ContinueWatchingItem[]>([]);
  const [isLoading,        setIsLoading]        = useState(true);
  const [error,            setError]            = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [featuredData, byCatData] = await Promise.all([
        moviesApi.featured(6),
        moviesApi.byCategory(12),
      ]);
      setFeatured(featuredData);
      setByCategory(byCatData);

      // Continue watching (requires auth — will silently fail if not logged in)
      const cwData = await progressApi.continueWatching().catch(() => []);
      setContinueWatching(cwData);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load home content');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { featured, byCategory, continueWatching, isLoading, error, refresh: load };
}

// ── Movie detail ──────────────────────────────────────────────

export function useMovie(movieId: string) {
  const [movie,     setMovie]     = useState<Movie | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const data = await moviesApi.get(movieId);
        if (!cancelled) setMovie(data);
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? 'Movie not found');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [movieId]);

  return { movie, isLoading, error };
}

// ── Search ────────────────────────────────────────────────────

export function useSearch() {
  const [results,   setResults]   = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [query,     setQuery]     = useState('');

  const search = useCallback(async (q: string) => {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const data = await moviesApi.search(q, { limit: 30 });
      setResults(data.items);
    } catch (err: any) {
      setError(err.message ?? 'Search failed');
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { results, isLoading, error, query, search };
}

// ── Watch history ─────────────────────────────────────────────

export function useWatchHistory() {
  const [history,   setHistory]   = useState<WatchHistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error,     setError]     = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await progressApi.history({ limit: 50 });
      setHistory(data.items);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { history, isLoading, error, refresh: load };
}

// ── Continue watching ─────────────────────────────────────────

export function useContinueWatching() {
  const [items,     setItems]     = useState<ContinueWatchingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await progressApi.continueWatching();
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { items, isLoading, refresh: load };
}
