// ============================================================
// Movie Detail + Player Screen
// Route: /movie/[id]
// Presented as a modal (slide from bottom)
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  StatusBar,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useMovie } from '../../hooks/useMovies';
import { useStreamPlayer } from '../../hooks/useStreamPlayer';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';
import { VideoPlayer } from '../../components/movie/VideoPlayer';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { ErrorState } from '../../components/ui/ErrorState';
import { Button } from '../../components/ui/Button';
import {
  Colors, FontSize, FontWeight, Spacing, BorderRadius,
} from '../../constants/theme';
import { PLACEHOLDER_BACKDROP, PLACEHOLDER_POSTER } from '../../constants';
import { formatDuration, formatRelativeDate, progressPercent } from '../../utils/format';

const { width: W } = Dimensions.get('window');
const BACKDROP_H = W * (9 / 16);

export default function MovieDetailScreen() {
  const { id }  = useLocalSearchParams<{ id: string }>();
  const router  = useRouter();
  const { user } = useAuthStore();

  const { movie, isLoading, error } = useMovie(id);
  const {
    streamInfo, savedProgress, isLoadingStream, streamError,
    onProgress, onComplete,
  } = useStreamPlayer({
    movieId:         id,
    durationSeconds: movie?.duration_seconds ?? null,
  });

  const [isPlayerVisible,   setIsPlayerVisible]   = useState(false);
  const [isInWatchlist,     setIsInWatchlist]     = useState(false);
  const [watchlistLoading,  setWatchlistLoading]  = useState(false);

  // ── Toggle watchlist ──────────────────────────────────────

  const toggleWatchlist = useCallback(async () => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to add movies to your list.');
      return;
    }
    setWatchlistLoading(true);
    try {
      if (isInWatchlist) {
        await authApi.removeFromWatchlist(id);
        setIsInWatchlist(false);
      } else {
        await authApi.addToWatchlist(id);
        setIsInWatchlist(true);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Could not update watchlist');
    } finally {
      setWatchlistLoading(false);
    }
  }, [id, user, isInWatchlist]);

  // ── Share ─────────────────────────────────────────────────

  const shareMovie = useCallback(async () => {
    if (!movie) return;
    try {
      await Share.share({
        title:   movie.title,
        message: `Watch "${movie.title}" on CineStream!`,
      });
    } catch { /* ignore */ }
  }, [movie]);

  // ── Play handler ──────────────────────────────────────────

  const handlePlay = useCallback(() => {
    if (!user) {
      Alert.alert('Sign in required', 'Please sign in to watch movies.');
      return;
    }
    if (streamError) {
      Alert.alert('Stream Error', streamError);
      return;
    }
    if (!streamInfo) return;
    setIsPlayerVisible(true);
  }, [user, streamError, streamInfo]);

  // ── Guards ────────────────────────────────────────────────

  if (isLoading) return <LoadingScreen message="Loading movie…" />;
  if (error || !movie) return <ErrorState message={error ?? 'Movie not found'} onRetry={() => router.back()} />;

  // ── Full-screen player mode ───────────────────────────────

  if (isPlayerVisible && streamInfo) {
    return (
      <View style={styles.playerContainer}>
        <StatusBar hidden />
        <VideoPlayer
          uri={streamInfo.stream_url}
          title={movie.title}
          initialPosition={savedProgress?.progress_seconds ?? 0}
          onBack={() => setIsPlayerVisible(false)}
          onProgress={onProgress}
          onComplete={onComplete}
        />
      </View>
    );
  }

  // ── Progress variables ────────────────────────────────────

  const pct = progressPercent(
    savedProgress?.progress_seconds ?? 0,
    movie.duration_seconds,
  );
  const hasProgress = pct > 2 && !savedProgress?.completed;

  // ── Detail view ───────────────────────────────────────────

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Backdrop ── */}
        <View style={[styles.backdropContainer, { height: BACKDROP_H }]}>
          <Image
            source={{ uri: movie.backdrop_url ?? movie.poster_url ?? PLACEHOLDER_BACKDROP }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={300}
          />
          <LinearGradient
            colors={['rgba(0,0,0,0.15)', 'transparent', Colors.background]}
            style={StyleSheet.absoluteFill}
            locations={[0, 0.4, 1]}
          />

          {/* Close button */}
          <SafeAreaView style={styles.backdropTopBar} edges={['top']}>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => router.back()}
            >
              <Ionicons name="chevron-down" size={22} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={shareMovie}
            >
              <Ionicons name="share-outline" size={22} color={Colors.text} />
            </TouchableOpacity>
          </SafeAreaView>

          {/* Progress bar over backdrop bottom */}
          {hasProgress && (
            <View style={styles.backdropProgress}>
              <View style={[styles.progressFill, { width: `${pct}%` }]} />
            </View>
          )}
        </View>

        {/* ── Content ── */}
        <View style={styles.content}>
          {/* Title */}
          <Text style={styles.title}>{movie.title}</Text>

          {/* Meta row */}
          <View style={styles.metaRow}>
            {movie.year && (
              <Text style={styles.metaText}>{movie.year}</Text>
            )}
            {movie.rating && (
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>{movie.rating}</Text>
              </View>
            )}
            {movie.duration_seconds && (
              <Text style={styles.metaText}>{formatDuration(movie.duration_seconds)}</Text>
            )}
            <View style={styles.metaDot} />
            <Text style={styles.viewCount}>
              <Ionicons name="eye-outline" size={12} color={Colors.textMuted} />
              {' '}{movie.view_count.toLocaleString()} views
            </Text>
          </View>

          {/* Category chips */}
          {movie.categories?.length > 0 && (
            <View style={styles.categories}>
              {movie.categories.map((cat) => (
                <View key={cat.id} style={styles.catChip}>
                  <Text style={styles.catChipText}>{cat.name}</Text>
                </View>
              ))}
            </View>
          )}

          {/* ── Play / Resume button ── */}
          <TouchableOpacity
            style={styles.playBtn}
            onPress={handlePlay}
            activeOpacity={0.85}
            disabled={isLoadingStream}
          >
            {isLoadingStream ? (
              <>
                <View style={styles.playBtnIcon}>
                  <Ionicons name="hourglass-outline" size={22} color={Colors.textInverse} />
                </View>
                <Text style={styles.playBtnText}>Preparing stream…</Text>
              </>
            ) : (
              <>
                <View style={styles.playBtnIcon}>
                  <Ionicons name={hasProgress ? 'play-skip-forward' : 'play'} size={22} color={Colors.textInverse} />
                </View>
                <View>
                  <Text style={styles.playBtnText}>
                    {hasProgress ? `Resume from ${formatDuration(savedProgress?.progress_seconds ?? 0)}` : 'Play'}
                  </Text>
                  {hasProgress && (
                    <Text style={styles.playBtnSub}>{pct}% watched</Text>
                  )}
                </View>
              </>
            )}
          </TouchableOpacity>

          {/* Restart if resumed */}
          {hasProgress && (
            <TouchableOpacity
              style={styles.restartBtn}
              onPress={() => {
                // Play from the beginning by zeroing out the saved progress before opening player
                if (streamInfo) {
                  setIsPlayerVisible(true);
                }
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh" size={16} color={Colors.textSecondary} />
              <Text style={styles.restartText}>Start over</Text>
            </TouchableOpacity>
          )}

          {/* Action row: watchlist + share */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={toggleWatchlist}
              disabled={watchlistLoading}
            >
              <Ionicons
                name={isInWatchlist ? 'checkmark-circle' : 'add-circle-outline'}
                size={28}
                color={isInWatchlist ? Colors.success : Colors.textSecondary}
              />
              <Text style={styles.actionLabel}>
                {isInWatchlist ? 'In My List' : 'My List'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionBtn} onPress={shareMovie}>
              <Ionicons name="share-social-outline" size={28} color={Colors.textSecondary} />
              <Text style={styles.actionLabel}>Share</Text>
            </TouchableOpacity>

            {user?.role === 'admin' && (
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => router.push(`/(admin)/movie/${id}`)}
              >
                <Ionicons name="settings-outline" size={28} color={Colors.textSecondary} />
                <Text style={styles.actionLabel}>Edit</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Description */}
          {movie.description && (
            <ExpandableText text={movie.description} />
          )}

          {/* Info table */}
          <View style={styles.infoTable}>
            {movie.year && (
              <InfoRow label="Year" value={String(movie.year)} />
            )}
            {movie.rating && (
              <InfoRow label="Rating" value={movie.rating} />
            )}
            {movie.duration_seconds && (
              <InfoRow label="Duration" value={formatDuration(movie.duration_seconds)} />
            )}
            {movie.categories?.length > 0 && (
              <InfoRow
                label="Genres"
                value={movie.categories.map((c) => c.name).join(', ')}
              />
            )}
            <InfoRow label="Added" value={formatRelativeDate(movie.created_at)} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ── Sub-components ────────────────────────────────────────────

function ExpandableText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 200;

  return (
    <View style={styles.descContainer}>
      <Text style={styles.description} numberOfLines={expanded ? undefined : 4}>
        {text}
      </Text>
      {isLong && (
        <TouchableOpacity onPress={() => setExpanded((e) => !e)}>
          <Text style={styles.expandBtn}>{expanded ? 'Show less' : 'Read more'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: Colors.background },
  playerContainer: { flex: 1, backgroundColor: '#000' },
  scroll:          { flex: 1 },

  // Backdrop
  backdropContainer: { width: W, overflow: 'hidden' },
  backdropTopBar: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    paddingHorizontal: Spacing.md,
  },
  closeBtn: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  backdropProgress: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    height:          3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  progressFill: {
    height:          '100%',
    backgroundColor: Colors.primary,
  },

  // Content
  content: {
    padding: Spacing.md,
    paddingTop: Spacing.sm,
  },
  title: {
    color:        Colors.text,
    fontSize:     FontSize.xxl,
    fontWeight:   FontWeight.bold,
    marginBottom: Spacing.xs,
    lineHeight:   32,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
    flexWrap:      'wrap',
    marginBottom:  Spacing.sm,
  },
  metaText:   { color: Colors.textSecondary, fontSize: FontSize.sm },
  metaDot:    { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.textMuted },
  viewCount:  { color: Colors.textMuted, fontSize: FontSize.xs },
  ratingBadge: {
    borderWidth:     1,
    borderColor:     Colors.primary,
    borderRadius:    BorderRadius.sm,
    paddingHorizontal: Spacing.xs + 2,
    paddingVertical:  2,
  },
  ratingText: { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.bold },

  categories: {
    flexDirection: 'row',
    gap:           Spacing.xs,
    flexWrap:      'wrap',
    marginBottom:  Spacing.md,
  },
  catChip: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius:    BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical:  3,
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  catChipText: { color: Colors.textSecondary, fontSize: FontSize.xs },

  // Play button
  playBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.primary,
    borderRadius:    BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical:  Spacing.md - 2,
    gap:             Spacing.md,
    marginBottom:    Spacing.sm,
  },
  playBtnIcon: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  playBtnText: {
    color:      Colors.text,
    fontSize:   FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  playBtnSub: {
    color:    'rgba(255,255,255,0.7)',
    fontSize: FontSize.xs,
  },

  restartBtn: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            Spacing.xs,
    paddingVertical: Spacing.sm,
    marginBottom:   Spacing.sm,
  },
  restartText: {
    color:    Colors.textSecondary,
    fontSize: FontSize.sm,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    gap:           Spacing.xl,
    marginVertical: Spacing.md,
  },
  actionBtn: {
    alignItems: 'center',
    gap:        Spacing.xs,
  },
  actionLabel: {
    color:    Colors.textSecondary,
    fontSize: FontSize.xs,
  },

  divider: {
    height:          1,
    backgroundColor: Colors.border,
    marginVertical:  Spacing.md,
  },

  // Description
  descContainer: { marginBottom: Spacing.md },
  description: {
    color:      Colors.textSecondary,
    fontSize:   FontSize.md,
    lineHeight: 24,
  },
  expandBtn: {
    color:      Colors.primary,
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.semibold,
    marginTop:  Spacing.xs,
  },

  // Info table
  infoTable: {
    backgroundColor: Colors.surface,
    borderRadius:    BorderRadius.md,
    borderWidth:     1,
    borderColor:     Colors.border,
    overflow:        'hidden',
    marginBottom:    Spacing.xl,
  },
  infoRow: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical:  Spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  infoLabel: {
    color:      Colors.textMuted,
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  infoValue: {
    color:      Colors.text,
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.medium,
    flex:       1,
    textAlign:  'right',
  },
});
