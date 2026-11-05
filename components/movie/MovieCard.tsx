// ============================================================
// MovieCard — poster card used in horizontal lists
// ============================================================

import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  Dimensions,
  ViewStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Colors, BorderRadius, FontSize, FontWeight,
  Spacing, Shadow, POSTER_RATIO,
} from '../../constants/theme';
import { Movie, ContinueWatchingItem } from '../../types';
import { PLACEHOLDER_POSTER } from '../../constants';
import { formatDuration, progressPercent } from '../../utils/format';

const SCREEN_W  = Dimensions.get('window').width;
const CARD_W    = SCREEN_W * 0.36;
const CARD_H    = CARD_W / POSTER_RATIO;

interface MovieCardProps {
  movie:        Movie | ContinueWatchingItem;
  style?:       ViewStyle;
  /** Show continue-watching progress bar */
  showProgress?: boolean;
  /** Override width */
  width?:       number;
}

export function MovieCard({ movie, style, showProgress = false, width = CARD_W }: MovieCardProps) {
  const router   = useRouter();
  const cardH    = width / POSTER_RATIO;

  // Normalise: both Movie and ContinueWatchingItem have id, title, poster_url
  const movieId  = 'movie_id' in movie ? movie.movie_id : movie.id;
  const title    = movie.title;
  const poster   = movie.poster_url ?? PLACEHOLDER_POSTER;
  const year     = movie.year;
  const rating   = movie.rating;

  // Progress bar only for ContinueWatchingItem
  const pct = showProgress && 'progress_percent' in movie
    ? (movie as ContinueWatchingItem).progress_percent
    : showProgress && 'progress_seconds' in movie && 'duration_seconds' in movie
      ? progressPercent(
          (movie as any).progress_seconds,
          (movie as any).duration_seconds,
        )
      : 0;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => router.push(`/movie/${movieId}`)}
      style={[styles.card, { width, height: cardH }, Shadow.sm, style]}
    >
      <Image
        source={{ uri: poster }}
        style={styles.poster}
        contentFit="cover"
        transition={200}
      />

      {/* Gradient overlay at bottom */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={styles.gradient}
      />

      {/* Meta row */}
      <View style={styles.meta}>
        {year    ? <Text style={styles.year}>{year}</Text>    : null}
        {rating  ? <Text style={styles.rating}>{rating}</Text> : null}
      </View>

      {/* Progress bar */}
      {showProgress && pct > 0 && (
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius:    BorderRadius.md,
    overflow:        'hidden',
    backgroundColor: Colors.surface,
  },
  poster: {
    ...StyleSheet.absoluteFillObject,
  },
  gradient: {
    position: 'absolute',
    left:     0,
    right:    0,
    bottom:   0,
    height:   80,
  },
  meta: {
    position:      'absolute',
    bottom:        Spacing.sm,
    left:          Spacing.sm,
    flexDirection: 'row',
    gap:           Spacing.xs,
    alignItems:    'center',
  },
  year: {
    color:      Colors.textSecondary,
    fontSize:   FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  rating: {
    color:           Colors.primary,
    fontSize:        FontSize.xs,
    fontWeight:      FontWeight.bold,
    borderWidth:     1,
    borderColor:     Colors.primary,
    borderRadius:    BorderRadius.sm,
    paddingHorizontal: 4,
    paddingVertical:   1,
  },
  progressTrack: {
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
});
