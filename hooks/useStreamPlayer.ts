// ============================================================
// useStreamPlayer — manages stream URL, progress saving, and
// playback state for the video player screen
// ============================================================

import { useState, useEffect, useRef, useCallback } from 'react';
import { streamApi, progressApi } from '../services/api';
import { StreamInfo, WatchProgress } from '../types';
import {
  PROGRESS_SAVE_INTERVAL_MS,
  MIN_WATCH_SECONDS,
  COMPLETION_THRESHOLD,
} from '../constants';

interface UseStreamPlayerOptions {
  movieId:         string;
  durationSeconds: number | null;
}

interface UseStreamPlayerResult {
  streamInfo:      StreamInfo | null;
  savedProgress:   WatchProgress | null;
  isLoadingStream: boolean;
  streamError:     string | null;
  /** Call this periodically from the player's onPlaybackStatusUpdate */
  onProgress:      (positionSec: number) => void;
  /** Call when the video finishes */
  onComplete:      () => void;
}

export function useStreamPlayer({
  movieId,
  durationSeconds,
}: UseStreamPlayerOptions): UseStreamPlayerResult {
  const [streamInfo,      setStreamInfo]      = useState<StreamInfo | null>(null);
  const [savedProgress,   setSavedProgress]   = useState<WatchProgress | null>(null);
  const [isLoadingStream, setIsLoadingStream] = useState(true);
  const [streamError,     setStreamError]     = useState<string | null>(null);

  const lastSavedRef    = useRef<number>(0);
  const saveTimerRef    = useRef<ReturnType<typeof setInterval>>();
  const currentPosRef   = useRef<number>(0);

  // ── Fetch stream URL + saved progress ─────────────────────

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoadingStream(true);
      setStreamError(null);
      try {
        const [info, progress] = await Promise.all([
          streamApi.getUrl(movieId),
          progressApi.get(movieId).catch(() => null),
        ]);
        if (!cancelled) {
          setStreamInfo(info);
          setSavedProgress(progress);
        }
      } catch (err: any) {
        if (!cancelled) setStreamError(err.message ?? 'Failed to load stream');
      } finally {
        if (!cancelled) setIsLoadingStream(false);
      }
    })();

    return () => { cancelled = true; };
  }, [movieId]);

  // ── Periodic progress save ─────────────────────────────────

  const saveProgress = useCallback(
    async (positionSec: number, completed = false) => {
      if (!durationSeconds || positionSec < MIN_WATCH_SECONDS) return;
      try {
        await progressApi.save({
          movie_id:         movieId,
          progress_seconds: Math.round(positionSec),
          duration_seconds: durationSeconds,
          completed,
        });
        lastSavedRef.current = positionSec;
      } catch {
        // Silent fail — will retry on next interval
      }
    },
    [movieId, durationSeconds],
  );

  // Start interval when stream is ready
  useEffect(() => {
    if (!streamInfo) return;

    saveTimerRef.current = setInterval(() => {
      const pos = currentPosRef.current;
      if (Math.abs(pos - lastSavedRef.current) >= 10) {
        saveProgress(pos);
      }
    }, PROGRESS_SAVE_INTERVAL_MS);

    return () => {
      clearInterval(saveTimerRef.current);
      // Final save on unmount
      saveProgress(currentPosRef.current);
    };
  }, [streamInfo, saveProgress]);

  // ── Handlers exposed to player ─────────────────────────────

  const onProgress = useCallback((positionSec: number) => {
    currentPosRef.current = positionSec;

    // Auto-mark complete near end
    if (
      durationSeconds &&
      positionSec / durationSeconds >= COMPLETION_THRESHOLD
    ) {
      clearInterval(saveTimerRef.current);
      saveProgress(positionSec, true);
    }
  }, [durationSeconds, saveProgress]);

  const onComplete = useCallback(() => {
    clearInterval(saveTimerRef.current);
    saveProgress(currentPosRef.current, true);
  }, [saveProgress]);

  return {
    streamInfo,
    savedProgress,
    isLoadingStream,
    streamError,
    onProgress,
    onComplete,
  };
}
