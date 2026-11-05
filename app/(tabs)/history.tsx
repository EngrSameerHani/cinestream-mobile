// ============================================================
// History Screen — Continue Watching + full Watch History
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useContinueWatching, useWatchHistory } from '../../hooks/useMovies';
import { progressApi } from '../../services/api';
import { ContinueWatchingItem, WatchHistoryItem } from '../../types';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { ErrorState } from '../../components/ui/ErrorState';
import {
  Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow,
} from '../../constants/theme';
import { PLACEHOLDER_POSTER } from '../../constants';
import { formatDuration, formatRelativeDate, progressPercent } from '../../utils/format';

const { width: W } = Dimensions.get('window');
const THUMB_W = W * 0.36;
const THUMB_H = THUMB_W * (9 / 16);

export default function HistoryScreen() {
  const router = useRouter();
  const {
    items: continueItems, isLoading: cwLoading, refresh: cwRefresh,
  } = useContinueWatching();
  const {
    history, isLoading: histLoading, error: histError, refresh: histRefresh,
  } = useWatchHistory();

  const [refreshing, setRefreshing] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const isLoading = cwLoading || histLoading;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([cwRefresh(), histRefresh()]);
    setRefreshing(false);
  }, [cwRefresh, histRefresh]);

  const handleRemove = useCallback((movieId: string, title: string) => {
    Alert.alert(
      'Remove from History',
      `Remove "${title}" from your watch history?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setRemovingId(movieId);
            try {
              await progressApi.delete(movieId);
              await Promise.all([cwRefresh(), histRefresh()]);
            } catch {
              Alert.alert('Error', 'Could not remove item. Please try again.');
            } finally {
              setRemovingId(null);
            }
          },
        },
      ],
    );
  }, [cwRefresh, histRefresh]);

  if (isLoading && !refreshing) return <LoadingScreen message="Loading history…" />;
  if (histError) return <ErrorState message={histError} onRetry={onRefresh} />;

  // Build SectionList sections
  const sections: { title: string; data: any[] }[] = [];
  if (continueItems.length > 0) {
    sections.push({ title: 'Continue Watching', data: continueItems });
  }
  if (history.length > 0) {
    sections.push({ title: 'Watch History', data: history });
  }

  const isEmpty = continueItems.length === 0 && history.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Activity</Text>
      </View>

      {isEmpty && !isLoading ? (
        <View style={styles.empty}>
          <Ionicons name="time-outline" size={64} color={Colors.textMuted} />
          <Text style={styles.emptyTitle}>No watch history yet</Text>
          <Text style={styles.emptySubtitle}>Movies you watch will appear here.</Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => router.push('/(tabs)/browse')}
          >
            <Text style={styles.browseBtnText}>Browse Movies</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => item.id ?? String(index)}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {section.title === 'Watch History' && history.length > 0 && (
                <Text style={styles.sectionCount}>{history.length} items</Text>
              )}
            </View>
          )}
          renderItem={({ item, section }) => {
            if (section.title === 'Continue Watching') {
              return (
                <ContinueWatchingCard
                  item={item as ContinueWatchingItem}
                  onRemove={() => handleRemove(item.movie_id, item.title)}
                  isRemoving={removingId === item.movie_id}
                />
              );
            }
            return (
              <HistoryListItem
                item={item as WatchHistoryItem}
                onRemove={() => handleRemove(item.movies?.id, item.movies?.title)}
                isRemoving={removingId === item.movies?.id}
              />
            );
          }}
          ListFooterComponent={<View style={{ height: Spacing.xxl }} />}
        />
      )}
    </SafeAreaView>
  );
}

// ── Continue Watching card (wide thumbnail with progress bar) ─

function ContinueWatchingCard({
  item,
  onRemove,
  isRemoving,
}: {
  item: ContinueWatchingItem;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={[styles.cwCard, Shadow.sm]}
      onPress={() => router.push(`/movie/${item.movie_id}`)}
      activeOpacity={0.85}
    >
      {/* Thumbnail */}
      <View style={[styles.cwThumb, { width: THUMB_W, height: THUMB_H }]}>
        <Image
          source={{ uri: item.poster_url ?? PLACEHOLDER_POSTER }}
          style={StyleSheet.absoluteFill as any}
          contentFit="cover"
          transition={200}
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={StyleSheet.absoluteFill as any}
        />
        {/* Play overlay */}
        <View style={styles.cwPlayOverlay}>
          <Ionicons name="play-circle" size={32} color={Colors.text} />
        </View>
        {/* Progress bar */}
        <View style={styles.cwProgressTrack}>
          <View style={[styles.cwProgressFill, { width: `${item.progress_percent}%` }]} />
        </View>
      </View>

      {/* Info */}
      <View style={styles.cwInfo}>
        <Text style={styles.cwTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.cwMeta}>
          {item.year ? `${item.year}  ·  ` : ''}
          {Math.round(item.progress_percent)}% watched
        </Text>
        {item.duration_seconds && item.progress_seconds && (
          <Text style={styles.cwRemaining}>
            {formatDuration(item.duration_seconds - item.progress_seconds)} left
          </Text>
        )}
      </View>

      {/* Remove button */}
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={onRemove}
        disabled={isRemoving}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={isRemoving ? 'hourglass-outline' : 'close-circle-outline'}
          size={20}
          color={Colors.textMuted}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ── History list item (compact row) ──────────────────────────

function HistoryListItem({
  item,
  onRemove,
  isRemoving,
}: {
  item: WatchHistoryItem;
  onRemove: () => void;
  isRemoving: boolean;
}) {
  const router  = useRouter();
  const movie   = item.movies;
  if (!movie) return null;

  const pct = progressPercent(item.progress_seconds, item.duration_seconds);

  return (
    <TouchableOpacity
      style={styles.histItem}
      onPress={() => router.push(`/movie/${movie.id}`)}
      activeOpacity={0.85}
    >
      {/* Poster */}
      <View style={styles.histPoster}>
        <Image
          source={{ uri: movie.poster_url ?? PLACEHOLDER_POSTER }}
          style={StyleSheet.absoluteFill as any}
          contentFit="cover"
          transition={150}
        />
        {item.completed && (
          <View style={styles.completedOverlay}>
            <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
          </View>
        )}
        {/* Progress bar at bottom of poster */}
        {!item.completed && pct > 0 && (
          <View style={styles.histProgressTrack}>
            <View style={[styles.histProgressFill, { width: `${pct}%` }]} />
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.histInfo}>
        <Text style={styles.histTitle} numberOfLines={2}>{movie.title}</Text>
        <View style={styles.histMeta}>
          {movie.year    ? <Text style={styles.histMetaText}>{movie.year}</Text>   : null}
          {movie.rating  ? <Text style={styles.histRating}>{movie.rating}</Text>   : null}
        </View>
        <Text style={styles.histDate}>{formatRelativeDate(item.updated_at)}</Text>
        <View style={styles.histStatusRow}>
          {item.completed ? (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark" size={10} color={Colors.success} />
              <Text style={styles.completedText}>Completed</Text>
            </View>
          ) : pct > 0 ? (
            <Text style={styles.histProgress}>{pct}% watched</Text>
          ) : null}
        </View>
      </View>

      {/* Remove */}
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={onRemove}
        disabled={isRemoving}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons
          name={isRemoving ? 'hourglass-outline' : 'trash-outline'}
          size={18}
          color={Colors.textMuted}
        />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.md,
  },
  headerTitle: {
    color:      Colors.text,
    fontSize:   FontSize.xxl,
    fontWeight: FontWeight.bold,
  },

  listContent: { paddingHorizontal: Spacing.md },

  sectionHeader: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingVertical: Spacing.md,
  },
  sectionTitle: {
    color:      Colors.text,
    fontSize:   FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  sectionCount: { color: Colors.textMuted, fontSize: FontSize.sm },

  // Empty
  empty: {
    flex:          1,
    alignItems:    'center',
    justifyContent:'center',
    gap:           Spacing.sm,
    paddingBottom: Spacing.xxl,
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle:    { color: Colors.textSecondary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  emptySubtitle: { color: Colors.textMuted, fontSize: FontSize.md, textAlign: 'center' },
  browseBtn: {
    marginTop:       Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius:    BorderRadius.md,
    paddingHorizontal: Spacing.xl,
    paddingVertical:  Spacing.sm + 2,
  },
  browseBtnText: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },

  // Continue Watching card
  cwCard: {
    flexDirection:   'row',
    backgroundColor: Colors.surface,
    borderRadius:    BorderRadius.md,
    marginBottom:    Spacing.sm,
    overflow:        'hidden',
    borderWidth:     1,
    borderColor:     Colors.border,
    alignItems:      'center',
  },
  cwThumb: {
    borderRadius: 0,
    overflow:     'hidden',
    position:     'relative',
  },
  cwPlayOverlay: {
    ...StyleSheet.absoluteFillObject as any,
    alignItems:     'center',
    justifyContent: 'center',
  },
  cwProgressTrack: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    height:          3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  cwProgressFill: {
    height:          '100%',
    backgroundColor: Colors.primary,
  },
  cwInfo: {
    flex:    1,
    padding: Spacing.md,
    gap:     4,
  },
  cwTitle: {
    color:      Colors.text,
    fontSize:   FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  cwMeta:      { color: Colors.textMuted, fontSize: FontSize.xs },
  cwRemaining: { color: Colors.textSecondary, fontSize: FontSize.xs },
  removeBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.md,
  },

  // History item
  histItem: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  histPoster: {
    width:        64,
    height:       96,
    borderRadius: BorderRadius.sm,
    overflow:     'hidden',
    backgroundColor: Colors.surface,
    position:     'relative',
  },
  completedOverlay: {
    ...StyleSheet.absoluteFillObject as any,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  histProgressTrack: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    height:          3,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  histProgressFill: {
    height:          '100%',
    backgroundColor: Colors.primary,
  },
  histInfo:  { flex: 1, gap: 4 },
  histTitle: {
    color:      Colors.text,
    fontSize:   FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  histMeta: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
  },
  histMetaText: { color: Colors.textMuted, fontSize: FontSize.xs },
  histRating: {
    color:           Colors.primary,
    fontSize:        9,
    fontWeight:      FontWeight.bold,
    borderWidth:     1,
    borderColor:     Colors.primary,
    borderRadius:    2,
    paddingHorizontal: 3,
  },
  histDate:     { color: Colors.textMuted, fontSize: FontSize.xs },
  histStatusRow: { flexDirection: 'row', alignItems: 'center' },
  histProgress: { color: Colors.textSecondary, fontSize: FontSize.xs },
  completedBadge: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             3,
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderRadius:    BorderRadius.sm,
    paddingHorizontal: Spacing.xs,
    paddingVertical:  2,
  },
  completedText: { color: Colors.success, fontSize: FontSize.xs, fontWeight: FontWeight.semibold },
});
