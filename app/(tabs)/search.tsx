// ============================================================
// Search Screen
// ============================================================

import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Keyboard,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSearch } from '../../hooks/useMovies';
import { Movie } from '../../types';
import {
  Colors, FontSize, FontWeight, Spacing, BorderRadius,
} from '../../constants/theme';
import { PLACEHOLDER_POSTER, PLACEHOLDER_BACKDROP } from '../../constants';
import { formatDuration, truncate } from '../../utils/format';

const { width: W } = Dimensions.get('window');

// Suggested search categories shown when input is empty
const SUGGESTIONS = [
  'Action', 'Comedy', 'Thriller', 'Horror',
  'Sci-Fi', 'Drama', 'Romance', 'Animation',
  'Documentary', 'Crime',
];

export default function SearchScreen() {
  const router  = useRouter();
  const { results, isLoading, query, search } = useSearch();
  const inputRef = useRef<TextInput>(null);
  const [inputValue, setInputValue] = useState('');

  // Debounced search
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const handleChange = useCallback((text: string) => {
    setInputValue(text);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(text), 350);
  }, [search]);

  const clearSearch = () => {
    setInputValue('');
    search('');
    inputRef.current?.focus();
  };

  const hasResults = results.length > 0;
  const hasQuery   = inputValue.trim().length > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Search bar */}
      <View style={styles.searchBarContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color={Colors.textMuted} style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            value={inputValue}
            onChangeText={handleChange}
            placeholder="Search movies…"
            placeholderTextColor={Colors.textMuted}
            returnKeyType="search"
            onSubmitEditing={() => search(inputValue)}
            selectionColor={Colors.primary}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {hasQuery && (
            <TouchableOpacity onPress={clearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={18} color={Colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        {hasQuery && (
          <TouchableOpacity onPress={() => { Keyboard.dismiss(); }} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Loading spinner */}
      {isLoading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={Colors.primary} size="small" />
          <Text style={styles.loadingText}>Searching…</Text>
        </View>
      )}

      {/* No results */}
      {!isLoading && hasQuery && !hasResults && (
        <View style={styles.noResults}>
          <Ionicons name="search" size={48} color={Colors.textMuted} />
          <Text style={styles.noResultsTitle}>No results for</Text>
          <Text style={styles.noResultsQuery}>"{query}"</Text>
          <Text style={styles.noResultsHint}>Try a different title or genre</Text>
        </View>
      )}

      {/* Results */}
      {hasResults && (
        <FlatList
          data={results}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.resultsList}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListHeaderComponent={
            <Text style={styles.resultsHeader}>
              {results.length} {results.length === 1 ? 'result' : 'results'} for "{query}"
            </Text>
          }
          renderItem={({ item }) => <SearchResultItem movie={item} />}
        />
      )}

      {/* Default: suggestions when empty */}
      {!hasQuery && !isLoading && (
        <View style={styles.suggestions}>
          <Text style={styles.suggestionsTitle}>Popular Genres</Text>
          <View style={styles.suggestionsGrid}>
            {SUGGESTIONS.map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.suggestionChip}
                onPress={() => { setInputValue(s); search(s); }}
              >
                <Text style={styles.suggestionText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// ── Search result row item ────────────────────────────────────

function SearchResultItem({ movie }: { movie: Movie }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      style={styles.resultItem}
      onPress={() => router.push(`/movie/${movie.id}`)}
      activeOpacity={0.85}
    >
      {/* Poster thumbnail */}
      <Image
        source={{ uri: movie.poster_url ?? PLACEHOLDER_POSTER }}
        style={styles.resultPoster}
        contentFit="cover"
        transition={150}
      />

      {/* Info */}
      <View style={styles.resultInfo}>
        <Text style={styles.resultTitle} numberOfLines={2}>{movie.title}</Text>

        {/* Meta row */}
        <View style={styles.resultMeta}>
          {movie.year   ? <Text style={styles.resultMetaText}>{movie.year}</Text>   : null}
          {movie.rating ? (
            <View style={styles.ratingBadge}>
              <Text style={styles.ratingText}>{movie.rating}</Text>
            </View>
          ) : null}
          {movie.duration_seconds ? (
            <Text style={styles.resultMetaText}>{formatDuration(movie.duration_seconds)}</Text>
          ) : null}
        </View>

        {/* Category chips */}
        <View style={styles.resultCategories}>
          {movie.categories?.slice(0, 3).map((c) => (
            <View key={c.id} style={styles.catChip}>
              <Text style={styles.catChipText}>{c.name}</Text>
            </View>
          ))}
        </View>

        {/* Description excerpt */}
        {movie.description ? (
          <Text style={styles.resultDesc} numberOfLines={2}>
            {truncate(movie.description, 100)}
          </Text>
        ) : null}
      </View>

      {/* Arrow */}
      <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },

  // Search bar
  searchBarContainer: {
    flexDirection: 'row',
    alignItems:    'center',
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.sm,
    gap:               Spacing.sm,
  },
  searchBar: {
    flex:            1,
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius:    BorderRadius.md,
    borderWidth:     1,
    borderColor:     Colors.border,
    paddingHorizontal: Spacing.sm,
    height:          44,
    gap:             Spacing.sm,
  },
  searchIcon:  {},
  searchInput: {
    flex:      1,
    color:     Colors.text,
    fontSize:  FontSize.md,
    height:    44,
  },
  cancelBtn:  { paddingVertical: Spacing.sm },
  cancelText: { color: Colors.primary, fontSize: FontSize.md },

  // Loading
  loadingRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.sm,
  },
  loadingText: { color: Colors.textMuted, fontSize: FontSize.sm },

  // No results
  noResults: {
    flex:          1,
    alignItems:    'center',
    justifyContent:'center',
    gap:           Spacing.sm,
    paddingBottom: Spacing.xxl,
  },
  noResultsTitle: { color: Colors.textSecondary, fontSize: FontSize.lg, fontWeight: FontWeight.semibold },
  noResultsQuery: { color: Colors.text, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  noResultsHint:  { color: Colors.textMuted, fontSize: FontSize.sm },

  // Results list
  resultsList: { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },
  resultsHeader: {
    color:         Colors.textMuted,
    fontSize:      FontSize.xs,
    marginBottom:  Spacing.md,
    marginTop:     Spacing.xs,
  },
  separator: {
    height:          1,
    backgroundColor: Colors.border,
    marginVertical:  Spacing.sm,
  },

  // Result item
  resultItem: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.md,
  },
  resultPoster: {
    width:        64,
    height:       96,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surface,
  },
  resultInfo: {
    flex:  1,
    gap:   4,
  },
  resultTitle: {
    color:      Colors.text,
    fontSize:   FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
  },
  resultMetaText: { color: Colors.textMuted, fontSize: FontSize.xs },
  ratingBadge: {
    borderWidth:     1,
    borderColor:     Colors.primary,
    borderRadius:    2,
    paddingHorizontal: 4,
    paddingVertical:  1,
  },
  ratingText: { color: Colors.primary, fontSize: 9, fontWeight: FontWeight.bold },
  resultCategories: {
    flexDirection: 'row',
    gap:           4,
    flexWrap:      'wrap',
  },
  catChip: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius:    BorderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical:  2,
  },
  catChipText: { color: Colors.textMuted, fontSize: 10 },
  resultDesc: {
    color:    Colors.textMuted,
    fontSize: FontSize.xs,
    lineHeight: 16,
  },

  // Suggestions
  suggestions: {
    paddingHorizontal: Spacing.md,
    paddingTop:        Spacing.md,
  },
  suggestionsTitle: {
    color:        Colors.text,
    fontSize:     FontSize.lg,
    fontWeight:   FontWeight.bold,
    marginBottom: Spacing.md,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           Spacing.sm,
  },
  suggestionChip: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius:    BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical:  Spacing.sm,
    borderWidth:     1,
    borderColor:     Colors.border,
    minWidth:        (W - Spacing.md * 2 - Spacing.sm * 4) / 4,
    alignItems:      'center',
  },
  suggestionText: {
    color:      Colors.textSecondary,
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.medium,
  },
});
