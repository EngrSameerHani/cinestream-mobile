// ============================================================
// Admin Edit Movie Screen
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { adminApi, categoriesApi } from '../../../services/api';
import { Movie, Category } from '../../../types';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { LoadingScreen } from '../../../components/ui/LoadingScreen';
import {
  Colors, FontSize, FontWeight, Spacing, BorderRadius,
} from '../../../constants/theme';
import { PLACEHOLDER_POSTER } from '../../../constants';
import { formatDuration } from '../../../utils/format';

const RATINGS = ['G', 'PG', 'PG-13', 'R', 'NC-17', 'TV-MA', 'TV-14', 'TV-PG'];

export default function EditMovieScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [movie,        setMovie]        = useState<Movie | null>(null);
  const [categories,   setCategories]   = useState<Category[]>([]);
  const [isLoading,    setIsLoading]    = useState(true);
  const [isSaving,     setIsSaving]     = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);

  // Form state
  const [title,       setTitle]       = useState('');
  const [description, setDescription] = useState('');
  const [year,        setYear]        = useState('');
  const [rating,      setRating]      = useState('');
  const [trailerUrl,  setTrailerUrl]  = useState('');
  const [featured,    setFeatured]    = useState(false);
  const [selectedCats, setSelectedCats] = useState<string[]>([]);

  // Load movie + categories
  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const [movieData, catsData] = await Promise.all([
          adminApi.getMovie(id),
          categoriesApi.list(),
        ]);
        setMovie(movieData);
        setCategories(catsData);
        // Populate form
        setTitle(movieData.title ?? '');
        setDescription(movieData.description ?? '');
        setYear(movieData.year ? String(movieData.year) : '');
        setRating(movieData.rating ?? '');
        setTrailerUrl(movieData.trailer_url ?? '');
        setFeatured(movieData.featured ?? false);
        setSelectedCats(movieData.categories?.map((c) => c.id) ?? []);
      } catch (err: any) {
        Alert.alert('Error', err.message ?? 'Failed to load movie');
        router.back();
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      Alert.alert('Validation', 'Title is required');
      return;
    }
    setIsSaving(true);
    try {
      const updated = await adminApi.updateMovie(id, {
        title:        title.trim(),
        description:  description.trim() || undefined,
        year:         year ? parseInt(year, 10) : undefined,
        rating:       rating || undefined,
        trailer_url:  trailerUrl.trim() || undefined,
        featured,
        category_ids: selectedCats,
      });
      setMovie(updated);
      Alert.alert('Saved', 'Movie updated successfully.');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }, [id, title, description, year, rating, trailerUrl, featured, selectedCats]);

  const handlePublishToggle = useCallback(async () => {
    if (!movie) return;

    if (movie.status !== 'published' && movie.upload_status !== 'completed') {
      Alert.alert('Cannot publish', 'This movie is still processing or failed. Wait for processing to complete.');
      return;
    }

    setIsPublishing(true);
    try {
      if (movie.status === 'published') {
        await adminApi.unpublishMovie(id);
        setMovie((m) => m ? { ...m, status: 'draft' } : m);
        Alert.alert('Unpublished', 'Movie is now hidden from users.');
      } else {
        await adminApi.publishMovie(id);
        setMovie((m) => m ? { ...m, status: 'published' } : m);
        Alert.alert('Published!', 'Movie is now visible to all users.');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to update status');
    } finally {
      setIsPublishing(false);
    }
  }, [id, movie]);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete Movie',
      `Permanently delete "${movie?.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminApi.deleteMovie(id);
              router.back();
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Failed to delete');
            }
          },
        },
      ],
    );
  }, [id, movie, router]);

  if (isLoading) return <LoadingScreen message="Loading movie…" />;
  if (!movie)    return null;

  const statusColor = {
    published:  Colors.success,
    draft:      Colors.textMuted,
    processing: Colors.warning,
    failed:     Colors.error,
  }[movie.status] ?? Colors.textMuted;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Movie header */}
      <View style={styles.movieHeader}>
        <Image
          source={{ uri: movie.poster_url ?? PLACEHOLDER_POSTER }}
          style={styles.poster}
          contentFit="cover"
        />
        <View style={styles.movieMeta}>
          <Text style={styles.movieTitle} numberOfLines={2}>{movie.title}</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {movie.status.charAt(0).toUpperCase() + movie.status.slice(1)}
            </Text>
          </View>
          {movie.duration_seconds && (
            <Text style={styles.movieDuration}>{formatDuration(movie.duration_seconds)}</Text>
          )}
          <Text style={styles.movieViews}>{movie.view_count.toLocaleString()} views</Text>
        </View>
      </View>

      {/* Publish / Unpublish button */}
      <TouchableOpacity
        style={[
          styles.publishBtn,
          movie.status === 'published' ? styles.unpublishBtn : styles.publishBtnActive,
          (movie.upload_status !== 'completed' && movie.status !== 'published') && styles.disabledBtn,
        ]}
        onPress={handlePublishToggle}
        disabled={isPublishing || (movie.upload_status !== 'completed' && movie.status !== 'published')}
      >
        {isPublishing ? (
          <ActivityIndicator size="small" color={Colors.text} />
        ) : (
          <>
            <Ionicons
              name={movie.status === 'published' ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={Colors.text}
            />
            <Text style={styles.publishBtnText}>
              {movie.status === 'published' ? 'Unpublish' : 'Publish'}
            </Text>
          </>
        )}
      </TouchableOpacity>

      {movie.upload_status !== 'completed' && movie.status !== 'published' && (
        <View style={styles.processingNote}>
          <Ionicons name="information-circle-outline" size={14} color={Colors.warning} />
          <Text style={styles.processingNoteText}>
            {movie.upload_status === 'processing'
              ? 'Video is still processing. Publishing will be available once complete.'
              : movie.upload_status === 'failed'
              ? `Processing failed: ${movie.processing_error ?? 'Unknown error'}`
              : 'Upload pending.'}
          </Text>
        </View>
      )}

      {/* ── Edit form ── */}
      <Text style={styles.sectionTitle}>Edit Details</Text>

      <Input label="Title *" value={title} onChangeText={setTitle} placeholder="Movie title" />
      <Input
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="Movie description…"
        multiline
        numberOfLines={4}
        style={styles.textarea}
      />

      <View style={styles.row}>
        <Input
          label="Year"
          value={year}
          onChangeText={setYear}
          placeholder="2024"
          keyboardType="numeric"
          containerStyle={styles.halfInput}
        />
        <Input
          label="Trailer URL"
          value={trailerUrl}
          onChangeText={setTrailerUrl}
          placeholder="https://…"
          keyboardType="url"
          autoCapitalize="none"
          containerStyle={styles.halfInput}
        />
      </View>

      {/* Rating */}
      <Text style={styles.fieldLabel}>Content Rating</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ratingScroll}>
        {RATINGS.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.ratingChip, rating === r && styles.ratingChipActive]}
            onPress={() => setRating((prev) => prev === r ? '' : r)}
          >
            <Text style={[styles.ratingText, rating === r && styles.ratingTextActive]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Featured toggle */}
      <TouchableOpacity style={styles.toggleRow} onPress={() => setFeatured((f) => !f)}>
        <View style={styles.toggleInfo}>
          <Ionicons name="star-outline" size={18} color={Colors.textSecondary} />
          <Text style={styles.toggleLabel}>Featured on Home Screen</Text>
        </View>
        <View style={[styles.toggle, featured && styles.toggleActive]}>
          <View style={[styles.toggleThumb, featured && styles.toggleThumbActive]} />
        </View>
      </TouchableOpacity>

      {/* Categories */}
      <Text style={styles.sectionTitle}>Categories</Text>
      <View style={styles.catsGrid}>
        {categories.map((cat) => {
          const selected = selectedCats.includes(cat.id);
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catChip, selected && styles.catChipActive]}
              onPress={() => setSelectedCats((prev) =>
                selected ? prev.filter((i) => i !== cat.id) : [...prev, cat.id],
              )}
            >
              <Text style={[styles.catText, selected && styles.catTextActive]}>{cat.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Save button */}
      <Button
        label="Save Changes"
        onPress={handleSave}
        isLoading={isSaving}
        fullWidth
        size="lg"
        style={styles.saveBtn}
      />

      {/* Delete button */}
      <Button
        label="Delete Movie"
        onPress={handleDelete}
        variant="danger"
        fullWidth
        style={styles.deleteBtn}
      />

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content:   { padding: Spacing.md },

  movieHeader: {
    flexDirection: 'row',
    gap:           Spacing.md,
    marginBottom:  Spacing.lg,
    backgroundColor: Colors.surface,
    borderRadius:  BorderRadius.lg,
    padding:       Spacing.md,
    borderWidth:   1,
    borderColor:   Colors.border,
  },
  poster: {
    width:        72,
    height:       108,
    borderRadius: BorderRadius.sm,
    backgroundColor: Colors.surfaceElevated,
  },
  movieMeta: { flex: 1, gap: 4, justifyContent: 'center' },
  movieTitle:    { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  statusRow:     { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot:     { width: 8, height: 8, borderRadius: 4 },
  statusText:    { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  movieDuration: { color: Colors.textMuted, fontSize: FontSize.sm },
  movieViews:    { color: Colors.textMuted, fontSize: FontSize.xs },

  publishBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             Spacing.sm,
    borderRadius:    BorderRadius.md,
    paddingVertical: Spacing.md - 2,
    marginBottom:    Spacing.sm,
  },
  publishBtnActive: { backgroundColor: Colors.success },
  unpublishBtn:     { backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border },
  disabledBtn:      { opacity: 0.4 },
  publishBtnText:   { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },

  processingNote: {
    flexDirection:   'row',
    alignItems:      'flex-start',
    gap:             Spacing.xs,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderRadius:    BorderRadius.sm,
    padding:         Spacing.sm,
    marginBottom:    Spacing.md,
  },
  processingNoteText: { flex: 1, color: Colors.warning, fontSize: FontSize.xs, lineHeight: 18 },

  sectionTitle: {
    color:        Colors.text,
    fontSize:     FontSize.lg,
    fontWeight:   FontWeight.bold,
    marginTop:    Spacing.lg,
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    color:        Colors.textSecondary,
    fontSize:     FontSize.sm,
    fontWeight:   FontWeight.medium,
    marginBottom: Spacing.xs,
  },
  textarea:    { minHeight: 96, textAlignVertical: 'top', paddingTop: Spacing.sm },
  row:         { flexDirection: 'row', gap: Spacing.sm },
  halfInput:   { flex: 1 },

  ratingScroll: { marginBottom: Spacing.md },
  ratingChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical:  Spacing.xs + 2,
    borderRadius:     BorderRadius.full,
    backgroundColor:  Colors.surfaceElevated,
    borderWidth:      1,
    borderColor:      Colors.border,
    marginRight:      Spacing.sm,
  },
  ratingChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  ratingText:       { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  ratingTextActive: { color: Colors.text },

  toggleRow: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'space-between',
    backgroundColor: Colors.surface,
    borderRadius:    BorderRadius.md,
    padding:         Spacing.md,
    borderWidth:     1,
    borderColor:     Colors.border,
    marginBottom:    Spacing.md,
  },
  toggleInfo:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  toggleLabel:      { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  toggle: {
    width:           44,
    height:          24,
    borderRadius:    12,
    backgroundColor: Colors.border,
    padding:         2,
    justifyContent:  'center',
  },
  toggleActive:      { backgroundColor: Colors.primary },
  toggleThumb:       { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.text, alignSelf: 'flex-start' },
  toggleThumbActive: { alignSelf: 'flex-end' },

  catsGrid:         { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  catChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical:  Spacing.xs + 2,
    borderRadius:     BorderRadius.full,
    backgroundColor:  Colors.surfaceElevated,
    borderWidth:      1,
    borderColor:      Colors.border,
  },
  catChipActive:    { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catText:          { color: Colors.textSecondary, fontSize: FontSize.sm },
  catTextActive:    { color: Colors.text },

  saveBtn:          { marginBottom: Spacing.sm },
  deleteBtn:        { marginBottom: Spacing.md },
});
