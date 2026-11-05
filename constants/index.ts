export * from './theme';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api';

// Progress save interval while playing (ms)
export const PROGRESS_SAVE_INTERVAL_MS = 15_000;

// Minimum watch time before recording history (seconds)
export const MIN_WATCH_SECONDS = 30;

// Consider movie "completed" when this % is watched
export const COMPLETION_THRESHOLD = 0.95;

export const PLACEHOLDER_POSTER   = 'https://placehold.co/300x450/141414/525252?text=No+Poster';
export const PLACEHOLDER_BACKDROP = 'https://placehold.co/780x440/141414/525252?text=No+Image';
