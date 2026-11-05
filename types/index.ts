// ============================================================
// Mobile-side TypeScript types
// ============================================================

export type UserRole = 'user' | 'admin';
export type MovieStatus = 'draft' | 'processing' | 'published' | 'failed';

// ── Auth ──────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
}

// ── Category ──────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface CategoryRef {
  id: string;
  name: string;
  slug: string;
}

// ── Movie ─────────────────────────────────────────────────────

export interface Movie {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  year: number | null;
  duration_seconds: number | null;
  rating: string | null;
  poster_url: string | null;
  backdrop_url: string | null;
  trailer_url: string | null;
  status: MovieStatus;
  upload_status: string;
  view_count: number;
  featured: boolean;
  categories: CategoryRef[];
  created_at: string;
  updated_at: string;
}

// ── Watch Progress ────────────────────────────────────────────

export interface WatchProgress {
  progress_seconds: number;
  duration_seconds: number | null;
  completed: boolean;
}

export interface WatchHistoryItem {
  id: string;
  progress_seconds: number;
  duration_seconds: number | null;
  completed: boolean;
  watched_at: string;
  updated_at: string;
  progress_percent?: number;
  movies: Movie;
}

export interface ContinueWatchingItem {
  id: string;
  user_id: string;
  movie_id: string;
  progress_seconds: number;
  duration_seconds: number | null;
  completed: boolean;
  updated_at: string;
  progress_percent: number;
  title: string;
  slug: string;
  poster_url: string | null;
  backdrop_url: string | null;
  year: number | null;
  rating: string | null;
}

// ── Stream ────────────────────────────────────────────────────

export interface StreamInfo {
  movie_id: string;
  stream_url: string;
  expires_in: number;
  content_type: string;
}

// ── API ───────────────────────────────────────────────────────

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedData<T> {
  items: T[];
  pagination: PaginationMeta;
}

// ── Category Row (home screen) ────────────────────────────────

export interface CategoryRow {
  category: CategoryRef;
  movies: Movie[];
}

// ── Admin ─────────────────────────────────────────────────────

export interface AdminStats {
  movies: {
    published_count: number;
    draft_count: number;
    processing_count: number;
    failed_count: number;
    total_count: number;
    total_views: number;
  };
  total_users: number;
  total_watches: number;
}
