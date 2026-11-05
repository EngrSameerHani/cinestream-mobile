// ============================================================
// HeroBanner — full-screen auto-scrolling featured carousel
// ============================================================

import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Colors, FontSize, FontWeight, Spacing, BorderRadius,
} from '../../constants/theme';
import { Movie } from '../../types';
import { truncate, formatDuration } from '../../utils/format';
import { PLACEHOLDER_BACKDROP } from '../../constants';

const { width: W, height: H } = Dimensions.get('window');
const BANNER_H = H * 0.58;
const AUTO_SCROLL_MS = 5000;

interface Props {
  movies: Movie[];
}

export function HeroBanner({ movies }: Props) {
  const router      = useRouter();
  const flatRef     = useRef<FlatList>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const timerRef    = useRef<ReturnType<typeof setTimeout>>();

  const scrollTo = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(idx, movies.length - 1));
    flatRef.current?.scrollToIndex({ index: clamped, animated: true });
    setActiveIdx(clamped);
  }, [movies.length]);

  // Auto-advance carousel
  useEffect(() => {
    if (movies.length <= 1) return;
    timerRef.current = setInterval(() => {
      setActiveIdx((prev) => {
        const next = (prev + 1) % movies.length;
        flatRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, AUTO_SCROLL_MS);
    return () => clearInterval(timerRef.current);
  }, [movies.length]);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.x / W);
    setActiveIdx(idx);
  };

  if (!movies.length) return null;

  const current = movies[activeIdx] ?? movies[0];

  return (
    <View style={[styles.container, { height: BANNER_H }]}>
      <FlatList
        ref={flatRef}
        data={movies}
        keyExtractor={(m) => m.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        renderItem={({ item }) => (
          <Image
            source={{ uri: item.backdrop_url ?? item.poster_url ?? PLACEHOLDER_BACKDROP }}
            style={{ width: W, height: BANNER_H }}
            contentFit="cover"
            transition={300}
          />
        )}
      />

      {/* Dark gradient from bottom */}
      <LinearGradient
        colors={['transparent', 'rgba(10,10,10,0.6)', Colors.background]}
        style={styles.gradient}
        locations={[0, 0.5, 1]}
      />

      {/* Content overlay */}
      <View style={styles.content}>
        {/* Category chips */}
        <View style={styles.chips}>
          {current.categories?.slice(0, 3).map((cat) => (
            <View key={cat.id} style={styles.chip}>
              <Text style={styles.chipText}>{cat.name}</Text>
            </View>
          ))}
        </View>

        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {current.title}
        </Text>

        {/* Meta */}
        <View style={styles.meta}>
          {current.year     ? <Text style={styles.metaText}>{current.year}</Text>   : null}
          {current.rating   ? <Text style={styles.rating}>{current.rating}</Text>   : null}
          {current.duration_seconds
            ? <Text style={styles.metaText}>{formatDuration(current.duration_seconds)}</Text>
            : null}
        </View>

        {/* Description */}
        <Text style={styles.description} numberOfLines={2}>
          {truncate(current.description, 120)}
        </Text>

        {/* CTA buttons */}
        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.playBtn}
            onPress={() => router.push(`/movie/${current.id}`)}
            activeOpacity={0.85}
          >
            <Ionicons name="play" size={18} color={Colors.textInverse} />
            <Text style={styles.playText}>Play</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.infoBtn}
            onPress={() => router.push(`/movie/${current.id}`)}
            activeOpacity={0.85}
          >
            <Ionicons name="information-circle-outline" size={18} color={Colors.text} />
            <Text style={styles.infoText}>More Info</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Dot indicators */}
      {movies.length > 1 && (
        <View style={styles.dots}>
          {movies.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => scrollTo(i)}>
              <View style={[styles.dot, i === activeIdx && styles.dotActive]} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:   { width: W, backgroundColor: Colors.background },
  gradient:    { position: 'absolute', left: 0, right: 0, bottom: 0, height: BANNER_H },
  content: {
    position: 'absolute',
    bottom:   Spacing.xl,
    left:     Spacing.md,
    right:    Spacing.md,
  },
  chips: {
    flexDirection: 'row',
    gap:           Spacing.xs,
    marginBottom:  Spacing.sm,
    flexWrap:      'wrap',
  },
  chip: {
    backgroundColor: 'rgba(229,9,20,0.18)',
    borderRadius:    BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical:  2,
  },
  chipText:   { color: Colors.primary, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
  title: {
    color:       Colors.text,
    fontSize:    FontSize.xxl,
    fontWeight:  FontWeight.black,
    letterSpacing: -0.5,
    marginBottom: Spacing.xs,
  },
  meta: {
    flexDirection: 'row',
    gap:           Spacing.sm,
    alignItems:    'center',
    marginBottom:  Spacing.xs,
  },
  metaText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  rating: {
    color:           Colors.primary,
    fontSize:        FontSize.xs,
    fontWeight:      FontWeight.bold,
    borderWidth:     1,
    borderColor:     Colors.primary,
    borderRadius:    BorderRadius.sm,
    paddingHorizontal: 4,
    paddingVertical:  1,
  },
  description: {
    color:        Colors.textSecondary,
    fontSize:     FontSize.sm,
    lineHeight:   20,
    marginBottom: Spacing.md,
  },
  buttons: {
    flexDirection: 'row',
    gap:           Spacing.sm,
  },
  playBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.text,
    borderRadius:    BorderRadius.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical:  Spacing.sm,
    gap:             Spacing.xs,
  },
  playText:  { color: Colors.textInverse, fontWeight: FontWeight.bold, fontSize: FontSize.md },
  infoBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius:    BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical:  Spacing.sm,
    gap:             Spacing.xs,
  },
  infoText:  { color: Colors.text, fontWeight: FontWeight.semibold, fontSize: FontSize.md },
  dots: {
    position:      'absolute',
    bottom:        Spacing.sm,
    right:         Spacing.md,
    flexDirection: 'row',
    gap:           5,
  },
  dot: {
    width: 5, height: 5,
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  dotActive: { backgroundColor: Colors.primary, width: 16 },
});
