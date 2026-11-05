// ============================================================
// MovieRow — horizontal scroll row with a section title
// ============================================================

import React from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing } from '../../constants/theme';
import { Movie, ContinueWatchingItem } from '../../types';
import { MovieCard } from './MovieCard';

interface MovieRowProps {
  title:         string;
  movies:        (Movie | ContinueWatchingItem)[];
  categorySlug?: string;   // if set, "See all" navigates to browse with filter
  showProgress?: boolean;
}

export function MovieRow({ title, movies, categorySlug, showProgress = false }: MovieRowProps) {
  const router = useRouter();

  if (!movies.length) return null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {categorySlug && (
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/(tabs)/browse', params: { category: categorySlug } })}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.seeAll}>See all</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Horizontal list */}
      <FlatList
        data={movies}
        keyExtractor={(item) => ('movie_id' in item ? item.movie_id : item.id)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={{ width: Spacing.sm }} />}
        renderItem={({ item }) => (
          <MovieCard movie={item} showProgress={showProgress} />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.xl,
  },
  header: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    paddingHorizontal: Spacing.md,
    marginBottom:   Spacing.sm,
  },
  title: {
    color:      Colors.text,
    fontSize:   FontSize.lg,
    fontWeight: FontWeight.bold,
  },
  seeAll: {
    color:      Colors.primary,
    fontSize:   FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  list: {
    paddingHorizontal: Spacing.md,
  },
});
