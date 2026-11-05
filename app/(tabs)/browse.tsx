// ============================================================
// Browse Screen — all movies filtered by category
// ============================================================

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { moviesApi, categoriesApi } from '../../services/api';
import { Movie, Category } from '../../types';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { ErrorState } from '../../components/ui/ErrorState';
import {
  Colors, FontSize, FontWeight, Spacing, BorderRadius, POSTER_RATIO,
} from '../../constants/theme';
import { PLACEHOLDER_POSTER } from '../../constants';
import { formatDuration } from '../../utils/format';

const { width: W } = Dimensions.get('window');
const COLS   = 3;
const GAP    = Spacing.sm;
const CARD_W = (W - Spacing.md * 2 - GAP * (COLS - 1)) / COLS;
const CARD_H = CARD_W / POSTER_RATIO;

export default function BrowseScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ category?: string }>();

  const [categories,      setCategories]      = useState<Category[]>([]);
  const [activeCategory,  setActiveCategory]  = useState<string | null>(params.category ?? null);
  const [movies,          setMovies]          = useState<Movie[]>([]);
  const [page,            setPage]            = useState(1);
  const [hasMore,         setHasMore]         = useState(true);
  const [isLoading,       setIsLoading]       = useState(true);
  const [isPaging,        setIsPaging]        = useState(false);
  const [isRefreshing,    setIsRefreshing]    = useState(false);
  const [error,           setError]           = useState<string | null>(null);

  // Load categories on mount
  useEffect(() => {
    categoriesApi.list().then(setCategories).catch(() => {});
  }, []);

  // Load movies whenever category or page changes
  const loadMovies = useCallback(async (p: number, reset: boolean) => {
    if (reset) { setIsLoading(true); setMovies([]); }
    else setIsPaging(true);
    setError(null);
    try {
      const data = await moviesApi.list({
        page:     p,
        limit:    18,
        category: activeCategory ?? undefined,
      });
      setMovies((prev) => reset ? data.items : [...prev, ...data.items]);
      setHasMore(p < data.pagination.totalPages);
      setPage(p);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load movies');
    } finally {
      setIsLoading(false);
      setIsPaging(false);
      setIsRefreshing(false);
    }
  }, [activeCategory]);

  useEffect(() => { loadMovies(1, true); }, [loadMovies]);

  // Sync category param from navigation
  useEffect(() => {
    if (params.category !== undefined) setActiveCategory(params.category || null);
  }, [params.category]);

  const onRefresh = () => { setIsRefreshing(true); loadMovies(1, true); };
  const loadMore  = () => { if (!isPaging && hasMore) loadMovies(page + 1, false); };

  const selectCategory = (slug: string | null) => {
    if (slug === activeCategory) return;
    setActiveCategory(slug);
  };

  if (isLoading) return <LoadingScreen message="Loading movies…" />;
  if (error)     return <ErrorState message={error} onRetry={() => loadMovies(1, true)} />;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Browse</Text>
      </View>

      {/* Category chip filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chips}
        style={styles.chipsScroll}
      >
        {/* "All" chip */}
        <TouchableOpacity
          style={[styles.chip, activeCategory === null && styles.chipActive]}
          onPress={() => selectCategory(null)}
        >
          <Text style={[styles.chipText, activeCategory === null && styles.chipTextActive]}>
            All
          </Text>
        </TouchableOpacity>

        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[styles.chip, activeCategory === cat.slug && styles.chipActive]}
            onPress={() => selectCategory(cat.slug)}
          >
            <Text style={[styles.chipText, activeCategory === cat.slug && styles.chipTextActive]}>
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results count */}
      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {movies.length} {movies.length === 1 ? 'movie' : 'movies'}
          {activeCategory ? ` in ${categories.find(c => c.slug === activeCategory)?.name ?? activeCategory}` : ''}
        </Text>
      </View>

      {/* Grid */}
      <FlatList
        data={movies}
        keyExtractor={(m) => m.id}
        numColumns={COLS}
        contentContainerStyle={styles.grid}
        columnWrapperStyle={styles.row}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          isPaging ? (
            <View style={styles.pagerFooter}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No movies found.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/movie/${item.id}`)}
            activeOpacity={0.85}
          >
            <Image
              source={{ uri: item.poster_url ?? PLACEHOLDER_POSTER }}
              style={styles.poster}
              contentFit="cover"
              transition={200}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.88)']}
              style={styles.cardGradient}
            />
            <View style={styles.cardMeta}>
              {item.rating && (
                <Text style={styles.cardRating}>{item.rating}</Text>
              )}
              {item.year && (
                <Text style={styles.cardYear}>{item.year}</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.md,
  },
  headerTitle: {
    color:      Colors.text,
    fontSize:   FontSize.xxl,
    fontWeight: FontWeight.bold,
  },

  // Chips
  chipsScroll: { flexGrow: 0, marginBottom: Spacing.sm },
  chips: {
    paddingHorizontal: Spacing.md,
    gap:               Spacing.sm,
    flexDirection:     'row',
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.xs + 2,
    borderRadius:      BorderRadius.full,
    backgroundColor:   Colors.surfaceElevated,
    borderWidth:       1,
    borderColor:       Colors.border,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor:     Colors.primary,
  },
  chipText:       { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  chipTextActive: { color: Colors.text },

  // Results count
  resultsRow: {
    paddingHorizontal: Spacing.md,
    marginBottom:      Spacing.sm,
  },
  resultsText: {
    color:    Colors.textMuted,
    fontSize: FontSize.xs,
  },

  // Grid
  grid: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },
  row:  { gap: GAP, marginBottom: GAP },
  card: {
    width:           CARD_W,
    height:          CARD_H,
    borderRadius:    BorderRadius.md,
    overflow:        'hidden',
    backgroundColor: Colors.surface,
  },
  poster:      { ...StyleSheet.absoluteFillObject },
  cardGradient: {
    position: 'absolute',
    left:  0, right: 0, bottom: 0,
    height: 60,
  },
  cardMeta: {
    position: 'absolute',
    bottom:   Spacing.xs,
    left:     Spacing.xs,
    flexDirection: 'row',
    gap:      4,
    alignItems: 'center',
  },
  cardRating: {
    color:           Colors.primary,
    fontSize:        8,
    fontWeight:      FontWeight.bold,
    borderWidth:     1,
    borderColor:     Colors.primary,
    borderRadius:    2,
    paddingHorizontal: 3,
  },
  cardYear: {
    color:    Colors.textSecondary,
    fontSize: 9,
  },

  pagerFooter: { alignItems: 'center', paddingVertical: Spacing.lg },

  empty: {
    alignItems:    'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    color:    Colors.textSecondary,
    fontSize: FontSize.md,
  },
});
