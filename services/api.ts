// ============================================================
// API Service
// Uses mock data when backend is unavailable (EXPO_PUBLIC_USE_MOCK=true)
// Automatically falls back to mock if backend request fails
// ============================================================

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { supabase } from './supabase';
import { API_URL } from '../constants';
import {
  Movie, Category, CategoryRow, StreamInfo,
  WatchProgress, WatchHistoryItem, ContinueWatchingItem,
  PaginatedData, AdminStats, User, ApiResponse,
} from '../types';
import {
  MOCK_MOVIES, MOCK_CATEGORIES, MOCK_FEATURED, MOCK_BY_CATEGORY,
  MOCK_CONTINUE_WATCHING, MOCK_HISTORY,
} from './mockData';

// ── Toggle mock mode ──────────────────────────────────────────
// Set EXPO_PUBLIC_USE_MOCK=true in mobile/.env to always use mock
// Otherwise falls back to mock only when backend is unreachable
const FORCE_MOCK = process.env.EXPO_PUBLIC_USE_MOCK === 'true';

// ── Axios client ──────────────────────────────────────────────

function createApiClient(): AxiosInstance {
  const client = axios.create({
    baseURL: API_URL,
    timeout: 8_000, // short timeout so fallback is fast
    headers: { 'Content-Type': 'application/json' },
  });

  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => {
      const body = response.data as ApiResponse<unknown>;
      if (body && typeof body === 'object' && 'success' in body) {
        if (body.success) {
          response.data = body.data;
        } else {
          return Promise.reject(new Error((body as any).error ?? 'Request failed'));
        }
      }
      return response;
    },
    (error: AxiosError) => {
      const msg = (error.response?.data as any)?.error ?? error.message ?? 'Network error';
      return Promise.reject(new Error(msg));
    },
  );

  return client;
}

const api = createApiClient();

// ── Helper: try real API, fall back to mock ───────────────────

async function tryOrMock<T>(realFn: () => Promise<T>, mockFn: () => T): Promise<T> {
  if (FORCE_MOCK) return mockFn();
  try {
    return await realFn();
  } catch {
    return mockFn();
  }
}

// ── Pagination helper for mock data ──────────────────────────

function paginate<T>(items: T[], page = 1, limit = 20): PaginatedData<T> {
  const offset = (page - 1) * limit;
  const sliced = items.slice(offset, offset + limit);
  return {
    items: sliced,
    pagination: {
      page,
      limit,
      total: items.length,
      totalPages: Math.ceil(items.length / limit),
    },
  };
}

// ── Auth API ──────────────────────────────────────────────────

export const authApi = {
  getMe: () =>
    tryOrMock(
      () => api.get<User>('/auth/me').then(r => r.data),
      () => ({
        id: 'mock-user-id',
        email: 'demo@cinestream.com',
        full_name: 'Demo User',
        avatar_url: null,
        role: 'user' as const,
        created_at: new Date().toISOString(),
      }),
    ),

  updateProfile: (data: Partial<Pick<User, 'full_name' | 'avatar_url'>>) =>
    tryOrMock(
      () => api.patch<User>('/auth/profile', data).then(r => r.data),
      () => ({
        id: 'mock-user-id',
        email: 'demo@cinestream.com',
        full_name: data.full_name ?? 'Demo User',
        avatar_url: data.avatar_url ?? null,
        role: 'user' as const,
        created_at: new Date().toISOString(),
      }),
    ),

  getWatchlist: () =>
    tryOrMock(
      () => api.get<any[]>('/auth/watchlist').then(r => r.data),
      () => [],
    ),

  addToWatchlist: (movieId: string) =>
    tryOrMock(
      () => api.post(`/auth/watchlist/${movieId}`).then(r => r.data),
      () => ({ added: true }),
    ),

  removeFromWatchlist: (movieId: string) =>
    tryOrMock(
      () => api.delete(`/auth/watchlist/${movieId}`).then(r => r.data),
      () => ({ removed: true }),
    ),
};

// ── Movies API ────────────────────────────────────────────────

export const moviesApi = {
  list: (params?: { page?: number; limit?: number; category?: string; featured?: boolean }) =>
    tryOrMock(
      () => api.get<PaginatedData<Movie>>('/movies', { params }).then(r => r.data),
      () => {
        let movies = MOCK_MOVIES;
        if (params?.category) {
          movies = movies.filter(m => m.categories.some(c => c.slug === params.category));
        }
        if (params?.featured) {
          movies = movies.filter(m => m.featured);
        }
        return paginate(movies, params?.page, params?.limit);
      },
    ),

  featured: (limit = 5) =>
    tryOrMock(
      () => api.get<Movie[]>('/movies/featured', { params: { limit } }).then(r => r.data),
      () => MOCK_FEATURED.slice(0, limit),
    ),

  search: (q: string, params?: { page?: number; limit?: number }) =>
    tryOrMock(
      () => api.get<PaginatedData<Movie> & { query: string }>(
        '/movies/search', { params: { q, ...params } }
      ).then(r => r.data),
      () => {
        const results = MOCK_MOVIES.filter(m =>
          m.title.toLowerCase().includes(q.toLowerCase()) ||
          m.description?.toLowerCase().includes(q.toLowerCase()) ||
          m.categories.some(c => c.name.toLowerCase().includes(q.toLowerCase()))
        );
        return { ...paginate(results, params?.page, params?.limit), query: q };
      },
    ),

  byCategory: (limit = 10) =>
    tryOrMock(
      () => api.get<CategoryRow[]>('/movies/by-category', { params: { limit } }).then(r => r.data),
      () => MOCK_BY_CATEGORY,
    ),

  get: (id: string) =>
    tryOrMock(
      () => api.get<Movie>(`/movies/${id}`).then(r => r.data),
      () => {
        const movie = MOCK_MOVIES.find(m => m.id === id);
        if (!movie) throw new Error('Movie not found');
        return movie;
      },
    ),
};

// ── Categories API ────────────────────────────────────────────

export const categoriesApi = {
  list: (all = false) =>
    tryOrMock(
      () => api.get<Category[]>('/categories', {
        params: all ? { all: 'true' } : undefined,
      }).then(r => r.data),
      () => MOCK_CATEGORIES,
    ),

  get: (id: string) =>
    tryOrMock(
      () => api.get<Category>(`/categories/${id}`).then(r => r.data),
      () => MOCK_CATEGORIES.find(c => c.id === id) ?? MOCK_CATEGORIES[0],
    ),

  create: (data: { name: string; description?: string; sort_order?: number }) =>
    api.post<Category>('/categories', data).then(r => r.data),

  update: (id: string, data: Partial<Category>) =>
    api.patch<Category>(`/categories/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    api.delete(`/categories/${id}`),
};

// ── Stream API ────────────────────────────────────────────────

export const streamApi = {
  getUrl: (movieId: string) =>
    tryOrMock(
      () => api.get<StreamInfo>(`/stream/${movieId}`).then(r => r.data),
      () => ({
        movie_id: movieId,
        // Public Big Buck Bunny HLS stream for demo
        stream_url: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        expires_in: 14400,
        content_type: 'application/vnd.apple.mpegurl',
      }),
    ),
};

// ── Progress API ──────────────────────────────────────────────

// In-memory progress store for mock mode
const mockProgressStore: Record<string, WatchProgress> = {};

export const progressApi = {
  save: (data: {
    movie_id: string;
    progress_seconds: number;
    duration_seconds: number;
    completed?: boolean;
  }) =>
    tryOrMock(
      () => api.post('/progress', data).then(r => r.data),
      () => {
        mockProgressStore[data.movie_id] = {
          progress_seconds: data.progress_seconds,
          duration_seconds: data.duration_seconds,
          completed: data.completed ?? false,
        };
        return { saved: true };
      },
    ),

  get: (movieId: string) =>
    tryOrMock(
      () => api.get<WatchProgress>(`/progress/${movieId}`).then(r => r.data),
      () => mockProgressStore[movieId] ?? {
        progress_seconds: 0,
        duration_seconds: null,
        completed: false,
      },
    ),

  history: (params?: { page?: number; limit?: number }) =>
    tryOrMock(
      () => api.get<PaginatedData<WatchHistoryItem>>('/progress/history', { params }).then(r => r.data),
      () => paginate(MOCK_HISTORY, params?.page, params?.limit),
    ),

  continueWatching: () =>
    tryOrMock(
      () => api.get<ContinueWatchingItem[]>('/progress/continue-watching').then(r => r.data),
      () => MOCK_CONTINUE_WATCHING,
    ),

  delete: (movieId: string) =>
    tryOrMock(
      () => api.delete(`/progress/${movieId}`).then(r => r.data),
      () => {
        delete mockProgressStore[movieId];
        return { deleted: true };
      },
    ),
};

// ── Admin API ─────────────────────────────────────────────────

export const adminApi = {
  stats: () =>
    tryOrMock(
      () => api.get<AdminStats>('/admin/stats').then(r => r.data),
      () => ({
        movies: {
          published_count:  MOCK_MOVIES.length,
          draft_count:      2,
          processing_count: 1,
          failed_count:     0,
          total_count:      MOCK_MOVIES.length + 3,
          total_views:      MOCK_MOVIES.reduce((sum, m) => sum + m.view_count, 0),
        },
        total_users:   1247,
        total_watches: 8934,
      }),
    ),

  listMovies: (params?: { page?: number; limit?: number; status?: string }) =>
    tryOrMock(
      () => api.get<PaginatedData<Movie>>('/admin/movies', { params }).then(r => r.data),
      () => paginate(MOCK_MOVIES, params?.page, params?.limit),
    ),

  getMovie: (id: string) =>
    tryOrMock(
      () => api.get<Movie>(`/admin/movies/${id}`).then(r => r.data),
      () => MOCK_MOVIES.find(m => m.id === id) ?? MOCK_MOVIES[0],
    ),

  updateMovie: (id: string, data: Partial<Movie> & { category_ids?: string[] }) =>
    tryOrMock(
      () => api.patch<Movie>(`/admin/movies/${id}`, data).then(r => r.data),
      () => ({ ...MOCK_MOVIES.find(m => m.id === id)!, ...data }),
    ),

  publishMovie: (id: string) =>
    tryOrMock(
      () => api.post<{ id: string; status: string }>(`/admin/movies/${id}/publish`).then(r => r.data),
      () => ({ id, status: 'published' }),
    ),

  unpublishMovie: (id: string) =>
    tryOrMock(
      () => api.post<{ id: string; status: string }>(`/admin/movies/${id}/unpublish`).then(r => r.data),
      () => ({ id, status: 'draft' }),
    ),

  deleteMovie: (id: string) =>
    tryOrMock(
      () => api.delete(`/admin/movies/${id}`),
      () => ({ deleted: true }),
    ),

  uploadMovie: (formData: FormData, onProgress?: (pct: number) => void) =>
    api.post<{ id: string; title: string; status: string; upload_status: string }>(
      '/upload/movie',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (onProgress && e.total) {
            onProgress(Math.round((e.loaded * 100) / e.total));
          }
        },
        timeout: 30 * 60 * 1000,
      },
    ).then(r => r.data),

  uploadStatus: (movieId: string) =>
    tryOrMock(
      () => api.get<{ id: string; status: string; upload_status: string }>(
        `/upload/status/${movieId}`
      ).then(r => r.data),
      () => ({ id: movieId, status: 'published', upload_status: 'completed' }),
    ),
};

export default api;
