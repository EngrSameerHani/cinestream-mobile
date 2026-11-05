// ============================================================
// Home Screen — Netflix-style dark cinematic layout
// ============================================================

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useAuthStore } from '../../store/authStore';
import { useHomeData } from '../../hooks/useMovies';
import { HeroBanner } from '../../components/movie/HeroBanner';
import { MovieRow } from '../../components/movie/MovieRow';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { ErrorState } from '../../components/ui/ErrorState';
import {
  Colors, FontSize, FontWeight, Spacing, BorderRadius,
} from '../../constants/theme';

export default function HomeScreen() {
  const router  = useRouter();
  const { user } = useAuthStore();
  const { featured, byCategory, continueWatching, isLoading, error, refresh } = useHomeData();

  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  if (isLoading && !refreshing) return <LoadingScreen message="Loading movies…" />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* ── Header overlay (sits on top of hero) ── */}
        <View style={styles.headerOverlay}>
          <View style={styles.logoRow}>
            <Ionicons name="film" size={22} color={Colors.primary} />
            <Text style={styles.logoText}>CINESTREAM</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerBtn}
              onPress={() => router.push('/(tabs)/search')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="search-outline" size={22} color={Colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.avatarBtn}
              onPress={() => router.push('/(tabs)/profile')}
            >
              {user?.avatar_url ? (
                <Image
                  source={{ uri: user.avatar_url }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.avatarFallback}>
                  <Text style={styles.avatarInitial}>
                    {(user?.full_name ?? user?.email ?? 'U')[0].toUpperCase()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Hero carousel ── */}
        {featured.length > 0 && <HeroBanner movies={featured} />}

        {/* ── Continue Watching ── */}
        {continueWatching.length > 0 && (
          <MovieRow
            title="Continue Watching"
            movies={continueWatching}
            showProgress
          />
        )}

        {/* ── Category rows ── */}
        {byCategory.map(({ category, movies }) => (
          <MovieRow
            key={category.id}
            title={category.name}
            movies={movies}
            categorySlug={category.slug}
          />
        ))}

        {/* Empty state */}
        {byCategory.length === 0 && continueWatching.length === 0 && !featured.length && (
          <View style={styles.empty}>
            <Ionicons name="film-outline" size={56} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No movies available yet.</Text>
            <Text style={styles.emptySubText}>Check back soon!</Text>
          </View>
        )}

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: Colors.background,
  },
  scroll: { flex: 1 },

  // Floating header
  headerOverlay: {
    position:        'absolute',
    top:             0,
    left:            0,
    right:           0,
    zIndex:          10,
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    paddingHorizontal: Spacing.md,
    paddingTop:      Platform.OS === 'ios' ? 52 : (StatusBar.currentHeight ?? 28) + 8,
    paddingBottom:   Spacing.sm,
    // Faint gradient fade at top
    backgroundColor: 'rgba(10,10,10,0.55)',
  },
  logoRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.xs,
  },
  logoText: {
    color:         Colors.text,
    fontSize:      FontSize.lg,
    fontWeight:    FontWeight.black,
    letterSpacing: 3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
  },
  headerBtn: {
    width:           36,
    height:          36,
    borderRadius:    18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarBtn: {
    width:        36,
    height:       36,
    borderRadius: 18,
    overflow:     'hidden',
    borderWidth:  2,
    borderColor:  Colors.primary,
  },
  avatar: {
    width:  36,
    height: 36,
  },
  avatarFallback: {
    flex:            1,
    backgroundColor: Colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarInitial: {
    color:      Colors.text,
    fontSize:   FontSize.md,
    fontWeight: FontWeight.bold,
  },

  // Empty
  empty: {
    alignItems:    'center',
    justifyContent:'center',
    paddingTop:    Spacing.xxl * 2,
    gap:           Spacing.sm,
  },
  emptyText: {
    color:      Colors.textSecondary,
    fontSize:   FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
  emptySubText: {
    color:    Colors.textMuted,
    fontSize: FontSize.md,
  },
});
