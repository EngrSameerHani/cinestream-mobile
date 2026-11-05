// ============================================================
// Admin Manage Movies Screen
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { adminApi } from '../../services/api';
import { Movie } from '../../types';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { ErrorState } from '../../components/ui/ErrorState';
import {
  Colors, FontSize, FontWeight, Spacing, BorderRadius,
} from '../../constants/theme';
import { PLACEHOLDER_POSTER } from '../../constants';
import { formatDuration, formatRelativeDate } from '../../utils/format';
import { useFocusEffect } from '@react-navigation/native';

type StatusFilter = 'all' | 'published' | 'draft' | 'processing' | 'failed';

const STATUS_FILTERS: { key: StatusFilter; label: string; color: string }[] = [
  { key: 'all',        label: 'All',        color: Colors.textSecondary },
  { key: 'published',  label: 'Published',  color: Colors.success },
  { key: 'draft',      label: 'Draft',      color: Colors.textMuted },
  { key: 'processing', label: 'Processing', color: Colors.warning },
  { key: 'failed',     label: 'Failed',     color: Colors.error },
];

export default function ManageMoviesScreen() {
  const router = useRouter();
  const [movies,       setMovies]       = useState<Movie[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [isPaging,     setIsPaging]     = useState(false);
  const [page,         setPage]         = useState(1);
  const [hasMore,      setHasMore]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [filter,       setFilter]       = useState<StatusFilter>('all');
  const [searchQuery,  setSearchQuery]  = useState('');
  const [deletingId,   setDeletingId]   = useState<string | null>(null);

  const loadMovies = useCallback(async (p: number, reset: boolean, statusFilter: StatusFilter) => {
    if (reset) { setIsLoading(true); setMovies([]); }
    else setIsPaging(true);
    setError(null);
    try {
      const data = await adminApi.listMovies({
        page:   p,
        limit:  20,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setMovies((prev) => reset ? data.items : [...prev, ...data.items]);
      setHasMore(p < data.pagination.totalPages);
      setPage(p);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load movies');
    } finally {
      setIsLoading(false);
      setIsPaging(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    loadMovies(1, true, filter);
  }, [filter]));

  const onRefresh = () => { setRefreshing(true); loadMovies(1, true, filter); };
  const loadMore  = () => { if (!isPaging && hasMore) loadMovies(page + 1, false, filter); };

  const handleDelete = (movie: Movie) => {
    Alert.alert(
      'Delete Movie',
      `Permanently delete "${movie.title}"?\n\nThis will also remove all video files from storage.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(movie.id);
            try {
              await adminApi.deleteMovie(movie.id);
              setMovies((prev) => prev.filter((m) => m.id !== movie.id));
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Failed to delete movie');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const handlePublishToggle = async (movie: Movie) => {
    try {
      if (movie.status === 'published') {
        await adminApi.unpublishMovie(movie.id);
        setMovies((prev) => prev.map((m) => m.id === movie.id ? { ...m, status: 'draft' } : m));
      } else {
        await adminApi.publishMovie(movie.id);
        setMovies((prev) => prev.map((m) => m.id === movie.id ? { ...m, status: 'published' } : m));
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to update movie status');
    }
  };

  // Local filter by search query
  const displayedMovies = searchQuery
    ? movies.filter((m) => m.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : movies;

  if (isLoading) return <LoadingScreen message="Loading movies…" />;
  if (error)     return <ErrorState message={error} onRetry={() => loadMovies(1, true, filter)} />;

  return (
    <View style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={Colors.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Filter by title…"
            placeholderTextColor={Colors.textMuted}
            selectionColor={Colors.primary}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
            </TouchableOpacity>
          ) : null}
        </View>
        <TouchableOpacity style={styles.uploadBtn} onPress={() => router.push('/(admin)/upload')}>
          <Ionicons name="add" size={20} color={Colors.text} />
        </TouchableOpacity>
      </View>

      {/* Status filter chips */}
      <FlatList
        data={STATUS_FILTERS}
        keyExtractor={(f) => f.key}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterChips}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterChip, filter === item.key && { borderColor: item.color, backgroundColor: `${item.color}18` }]}
            onPress={() => setFilter(item.key)}
          >
            <View style={[styles.filterDot, { backgroundColor: item.color }]} />
            <Text style={[styles.filterText, filter === item.key && { color: item.color }]}>{item.label}</Text>
          </TouchableOpacity>
        )}
      />

      <Text style={styles.resultsText}>
        {displayedMovies.length} movie{displayedMovies.length !== 1 ? 's' : ''}
      </Text>

      <FlatList
        data={displayedMovies}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListFooterComponent={isPaging ? <ActivityIndicator color={Colors.primary} style={{ padding: Spacing.lg }} /> : null}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="film-outline" size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No movies found.</Text>
          </View>
        }
        renderItem={({ item: movie }) => (
          <AdminMovieRow
            movie={movie}
            onEdit={() => router.push(`/(admin)/movie/${movie.id}`)}
            onDelete={() => handleDelete(movie)}
            onTogglePublish={() => handlePublishToggle(movie)}
            isDeleting={deletingId === movie.id}
          />
        )}
      />
    </View>
  );
}

// ── Admin movie row ───────────────────────────────────────────

function AdminMovieRow({
  movie, onEdit, onDelete, onTogglePublish, isDeleting,
}: {
  movie: Movie;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePublish: () => void;
  isDeleting: boolean;
}) {
  const statusConfig: Record<string, { color: string; icon: string }> = {
    published:  { color: Colors.success, icon: 'checkmark-circle' },
    draft:      { color: Colors.textMuted, icon: 'ellipse-outline' },
    processing: { color: Colors.warning, icon: 'hourglass-outline' },
    failed:     { color: Colors.error, icon: 'alert-circle' },
  };
  const sc = statusConfig[movie.status] ?? statusConfig.draft;

  return (
    <View style={rowStyles.row}>
      {/* Poster */}
      <Image
        source={{ uri: movie.poster_url ?? PLACEHOLDER_POSTER }}
        style={rowStyles.poster}
        contentFit="cover"
      />

      {/* Info */}
      <View style={rowStyles.info}>
        <Text style={rowStyles.title} numberOfLines={2}>{movie.title}</Text>
        <View style={rowStyles.metaRow}>
          {movie.year ? <Text style={rowStyles.meta}>{movie.year}</Text> : null}
          {movie.duration_seconds ? <Text style={rowStyles.meta}>{formatDuration(movie.duration_seconds)}</Text> : null}
        </View>
        <View style={rowStyles.statusRow}>
          <Ionicons name={sc.icon as any} size={12} color={sc.color} />
          <Text style={[rowStyles.status, { color: sc.color }]}>
            {movie.status.charAt(0).toUpperCase() + movie.status.slice(1)}
          </Text>
          {movie.upload_status === 'processing' && (
            <ActivityIndicator size="small" color={Colors.warning} style={{ marginLeft: 4 }} />
          )}
        </View>
        <Text style={rowStyles.date}>{formatRelativeDate(movie.updated_at)}</Text>
      </View>

      {/* Actions */}
      <View style={rowStyles.actions}>
        {isDeleting ? (
          <ActivityIndicator color={Colors.primary} />
        ) : (
          <>
            <TouchableOpacity style={rowStyles.actionBtn} onPress={onEdit}>
              <Ionicons name="pencil-outline" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>

            {(movie.status === 'draft' || movie.status === 'published') && (
              <TouchableOpacity style={rowStyles.actionBtn} onPress={onTogglePublish}>
                <Ionicons
                  name={movie.status === 'published' ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={movie.status === 'published' ? Colors.warning : Colors.success}
                />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={rowStyles.actionBtn} onPress={onDelete}>
              <Ionicons name="trash-outline" size={18} color={Colors.error} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  poster: {
    width:        56,
    height:       84,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
  },
  info:     { flex: 1, gap: 3 },
  title:    { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  metaRow:  { flexDirection: 'row', gap: Spacing.sm },
  meta:     { color: Colors.textMuted, fontSize: FontSize.xs },
  statusRow:{ flexDirection: 'row', alignItems: 'center', gap: 4 },
  status:   { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
  date:     { color: Colors.textMuted, fontSize: 10 },
  actions: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  actionBtn: {
    width:           32,
    height:          32,
    borderRadius:    BorderRadius.sm,
    backgroundColor: Colors.surfaceElevated,
    alignItems:      'center',
    justifyContent:  'center',
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  searchRow: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.sm,
  },
  searchBar: {
    flex:            1,
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius:    BorderRadius.md,
    paddingHorizontal: Spacing.sm,
    height:          40,
    gap:             Spacing.sm,
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  searchInput: { flex: 1, color: Colors.text, fontSize: FontSize.sm },
  uploadBtn: {
    width:           40,
    height:          40,
    borderRadius:    BorderRadius.md,
    backgroundColor: Colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  filterChips: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm, gap: Spacing.sm },
  filterChip: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    paddingHorizontal: Spacing.md,
    paddingVertical:  Spacing.xs + 2,
    borderRadius:    BorderRadius.full,
    backgroundColor: Colors.surfaceElevated,
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  filterDot:  { width: 6, height: 6, borderRadius: 3 },
  filterText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  resultsText: {
    color:           Colors.textMuted,
    fontSize:        FontSize.xs,
    paddingHorizontal: Spacing.md,
    marginBottom:    Spacing.xs,
  },
  list:      { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },
  separator: { height: 1, backgroundColor: Colors.border },
  empty: {
    alignItems:    'center',
    paddingVertical: Spacing.xxl,
    gap:           Spacing.md,
  },
  emptyText: { color: Colors.textSecondary, fontSize: FontSize.md },
});
