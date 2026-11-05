// ============================================================
// Admin Upload Movie Screen
// Supports video up to 1GB + poster/backdrop images
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { adminApi, categoriesApi } from '../../services/api';
import { Category } from '../../types';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import {
  Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow,
} from '../../constants/theme';
import { useFocusEffect } from '@react-navigation/native';

interface FormData {
  title:       string;
  description: string;
  year:        string;
  rating:      string;
  trailerUrl:  string;
  featured:    boolean;
}

interface FileData {
  video?:    { uri: string; name: string; size: number; mimeType: string };
  poster?:   { uri: string; name: string };
  backdrop?: { uri: string; name: string };
}

const RATINGS = ['G', 'PG', 'PG-13', 'R', 'NC-17', 'TV-MA', 'TV-14', 'TV-PG'];
const MAX_VIDEO_BYTES = 1024 * 1024 * 1024; // 1 GB

type UploadStage = 'idle' | 'uploading' | 'processing' | 'done' | 'failed';

export default function UploadScreen() {
  const router = useRouter();

  const [form,             setForm]             = useState<FormData>({
    title: '', description: '', year: '', rating: '', trailerUrl: '', featured: false,
  });
  const [files,            setFiles]            = useState<FileData>({});
  const [categories,       setCategories]       = useState<Category[]>([]);
  const [selectedCats,     setSelectedCats]     = useState<string[]>([]);
  const [uploadStage,      setUploadStage]      = useState<UploadStage>('idle');
  const [uploadPct,        setUploadPct]        = useState(0);
  const [processingMovieId, setProcessingMovieId] = useState<string | null>(null);
  const [errors,           setErrors]           = useState<Partial<FormData & { video: string }>>({});

  // Load categories
  useFocusEffect(useCallback(() => {
    categoriesApi.list().then(setCategories).catch(() => {});
  }, []));

  // Poll processing status after upload completes
  const pollProcessing = useCallback(async (movieId: string) => {
    setUploadStage('processing');
    let attempts = 0;
    const maxAttempts = 120; // 10 minutes at 5s intervals

    const poll = setInterval(async () => {
      attempts++;
      try {
        const status = await adminApi.uploadStatus(movieId);
        if (status.upload_status === 'completed') {
          clearInterval(poll);
          setUploadStage('done');
          Alert.alert(
            'Upload Complete!',
            `"${form.title}" has been uploaded and processed. You can now publish it.`,
            [
              { text: 'View Movie', onPress: () => router.push(`/(admin)/movie/${movieId}`) },
              { text: 'Upload Another', onPress: () => resetForm() },
            ],
          );
        } else if (status.upload_status === 'failed' || attempts >= maxAttempts) {
          clearInterval(poll);
          setUploadStage('failed');
          Alert.alert('Processing Failed', status.processing_error ?? 'The video could not be processed. Please try again.');
        }
      } catch {
        // Polling error — continue trying
      }
    }, 5000);
  }, [form.title, router]);

  const resetForm = () => {
    setForm({ title: '', description: '', year: '', rating: '', trailerUrl: '', featured: false });
    setFiles({});
    setSelectedCats([]);
    setUploadStage('idle');
    setUploadPct(0);
    setProcessingMovieId(null);
    setErrors({});
  };

  // ── File pickers ───────────────────────────────────────────

  const pickVideo = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/mp4', 'video/x-matroska', 'video/quicktime', 'video/x-msvideo'],
        copyToCacheDirectory: true,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.size && asset.size > MAX_VIDEO_BYTES) {
          Alert.alert('File too large', 'Maximum video size is 1 GB.');
          return;
        }
        setFiles((f) => ({ ...f, video: {
          uri:      asset.uri,
          name:     asset.name ?? 'video.mp4',
          size:     asset.size ?? 0,
          mimeType: asset.mimeType ?? 'video/mp4',
        }}));
        setErrors((e) => ({ ...e, video: undefined }));
      }
    } catch {
      Alert.alert('Error', 'Could not open file picker');
    }
  };

  const pickImage = async (field: 'poster' | 'backdrop') => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: field === 'poster',
      aspect:        field === 'poster' ? [2, 3] : [16, 9],
      quality:       0.85,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const name  = `${field}-${Date.now()}.jpg`;
      setFiles((f) => ({ ...f, [field]: { uri: asset.uri, name } }));
    }
  };

  // ── Validation ─────────────────────────────────────────────

  const validate = (): boolean => {
    const errs: typeof errors = {};
    if (!form.title.trim())  errs.title = 'Title is required';
    if (!files.video)        errs.video  = 'A video file is required';
    if (form.year && (isNaN(Number(form.year)) || Number(form.year) < 1888))
      errs.year = 'Enter a valid year (e.g. 2024)';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit ─────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!validate()) return;

    setUploadStage('uploading');
    setUploadPct(0);

    try {
      const formData = new FormData();
      formData.append('title',       form.title.trim());
      formData.append('description', form.description.trim());
      if (form.year)       formData.append('year',        form.year);
      if (form.rating)     formData.append('rating',      form.rating);
      if (form.trailerUrl) formData.append('trailer_url', form.trailerUrl.trim());
      formData.append('featured', String(form.featured));
      selectedCats.forEach((id) => formData.append('category_ids', id));

      // Attach video
      formData.append('video', {
        uri:  files.video!.uri,
        name: files.video!.name,
        type: files.video!.mimeType,
      } as any);

      // Attach poster/backdrop if picked
      if (files.poster) {
        formData.append('poster', { uri: files.poster.uri, name: files.poster.name, type: 'image/jpeg' } as any);
      }
      if (files.backdrop) {
        formData.append('backdrop', { uri: files.backdrop.uri, name: files.backdrop.name, type: 'image/jpeg' } as any);
      }

      const result = await adminApi.uploadMovie(formData, (pct) => setUploadPct(pct));

      setProcessingMovieId(result.id);
      await pollProcessing(result.id);

    } catch (err: any) {
      setUploadStage('failed');
      Alert.alert('Upload Failed', err.message ?? 'An error occurred. Please try again.');
    }
  };

  const formatBytes = (b: number) => {
    if (b >= 1024 * 1024 * 1024) return `${(b / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (b >= 1024 * 1024)        return `${(b / (1024 * 1024)).toFixed(1)} MB`;
    return `${(b / 1024).toFixed(0)} KB`;
  };

  const isUploading = uploadStage === 'uploading' || uploadStage === 'processing';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* ── Progress overlay ── */}
      {isUploading && (
        <View style={styles.progressCard}>
          <ActivityIndicator color={Colors.primary} size="large" />
          <Text style={styles.progressTitle}>
            {uploadStage === 'uploading' ? 'Uploading…' : 'Processing video…'}
          </Text>
          {uploadStage === 'uploading' && (
            <>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${uploadPct}%` }]} />
              </View>
              <Text style={styles.progressPct}>{uploadPct}%</Text>
            </>
          )}
          {uploadStage === 'processing' && (
            <Text style={styles.progressSub}>
              Converting to HLS format. This may take several minutes depending on video length.
            </Text>
          )}
        </View>
      )}

      {/* ── Movie info ── */}
      <Text style={styles.sectionTitle}>Movie Information</Text>

      <Input
        label="Title *"
        value={form.title}
        onChangeText={(t) => { setForm((f) => ({ ...f, title: t })); setErrors((e) => ({ ...e, title: undefined })); }}
        error={errors.title}
        placeholder="Enter movie title"
        editable={!isUploading}
      />

      <Input
        label="Description"
        value={form.description}
        onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
        placeholder="Brief synopsis of the movie"
        multiline
        numberOfLines={4}
        style={styles.textarea}
        editable={!isUploading}
      />

      <View style={styles.row}>
        <Input
          label="Year"
          value={form.year}
          onChangeText={(t) => { setForm((f) => ({ ...f, year: t })); setErrors((e) => ({ ...e, year: undefined })); }}
          error={errors.year}
          placeholder="2024"
          keyboardType="numeric"
          containerStyle={styles.halfInput}
          editable={!isUploading}
        />
        <Input
          label="Trailer URL"
          value={form.trailerUrl}
          onChangeText={(t) => setForm((f) => ({ ...f, trailerUrl: t }))}
          placeholder="https://youtube.com/…"
          keyboardType="url"
          autoCapitalize="none"
          containerStyle={styles.halfInput}
          editable={!isUploading}
        />
      </View>

      {/* Rating picker */}
      <Text style={styles.fieldLabel}>Content Rating</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.ratingScroll}>
        {RATINGS.map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.ratingChip, form.rating === r && styles.ratingChipActive]}
            onPress={() => setForm((f) => ({ ...f, rating: f.rating === r ? '' : r }))}
            disabled={isUploading}
          >
            <Text style={[styles.ratingChipText, form.rating === r && styles.ratingChipTextActive]}>{r}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Featured toggle */}
      <TouchableOpacity
        style={styles.toggleRow}
        onPress={() => !isUploading && setForm((f) => ({ ...f, featured: !f.featured }))}
        activeOpacity={0.8}
      >
        <View style={styles.toggleInfo}>
          <Ionicons name="star-outline" size={18} color={Colors.textSecondary} />
          <View>
            <Text style={styles.toggleLabel}>Featured Movie</Text>
            <Text style={styles.toggleSub}>Show in the hero carousel on home screen</Text>
          </View>
        </View>
        <View style={[styles.toggle, form.featured && styles.toggleActive]}>
          <View style={[styles.toggleThumb, form.featured && styles.toggleThumbActive]} />
        </View>
      </TouchableOpacity>

      {/* ── Categories ── */}
      <Text style={styles.sectionTitle}>Categories</Text>
      <View style={styles.catsGrid}>
        {categories.map((cat) => {
          const selected = selectedCats.includes(cat.id);
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.catChip, selected && styles.catChipActive]}
              onPress={() => {
                if (isUploading) return;
                setSelectedCats((prev) =>
                  selected ? prev.filter((id) => id !== cat.id) : [...prev, cat.id],
                );
              }}
            >
              <Text style={[styles.catChipText, selected && styles.catChipTextActive]}>{cat.name}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ── Files ── */}
      <Text style={styles.sectionTitle}>Media Files</Text>

      {/* Video file */}
      <TouchableOpacity
        style={[styles.filePicker, errors.video ? styles.filePickerError : null]}
        onPress={pickVideo}
        disabled={isUploading}
        activeOpacity={0.8}
      >
        <Ionicons
          name={files.video ? 'film' : 'cloud-upload-outline'}
          size={28}
          color={files.video ? Colors.success : Colors.textMuted}
        />
        <View style={styles.fileInfo}>
          {files.video ? (
            <>
              <Text style={styles.fileName} numberOfLines={1}>{files.video.name}</Text>
              <Text style={styles.fileSize}>{formatBytes(files.video.size)}</Text>
            </>
          ) : (
            <>
              <Text style={styles.filePickerLabel}>Select Video File *</Text>
              <Text style={styles.filePickerSub}>MP4, MKV, MOV, AVI — up to 1 GB</Text>
            </>
          )}
        </View>
        {files.video && (
          <TouchableOpacity
            onPress={() => setFiles((f) => ({ ...f, video: undefined }))}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close-circle" size={20} color={Colors.textMuted} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
      {errors.video ? <Text style={styles.fieldError}>{errors.video}</Text> : null}

      {/* Poster */}
      <View style={styles.imageRow}>
        <ImagePickerBox
          label="Poster"
          subLabel="2:3 ratio"
          uri={files.poster?.uri}
          onPick={() => pickImage('poster')}
          onClear={() => setFiles((f) => ({ ...f, poster: undefined }))}
          disabled={isUploading}
          style={styles.posterBox}
        />
        <ImagePickerBox
          label="Backdrop"
          subLabel="16:9 ratio"
          uri={files.backdrop?.uri}
          onPick={() => pickImage('backdrop')}
          onClear={() => setFiles((f) => ({ ...f, backdrop: undefined }))}
          disabled={isUploading}
          style={styles.backdropBox}
        />
      </View>

      {/* ── Submit ── */}
      <View style={styles.submitSection}>
        <Button
          label={
            uploadStage === 'idle'       ? 'Upload Movie' :
            uploadStage === 'uploading'  ? `Uploading ${uploadPct}%…` :
            uploadStage === 'processing' ? 'Processing…' :
            uploadStage === 'done'       ? '✓ Upload Complete' : 'Retry Upload'
          }
          onPress={uploadStage === 'failed' ? handleUpload : handleUpload}
          isLoading={isUploading}
          disabled={isUploading || uploadStage === 'done'}
          fullWidth
          size="lg"
          variant={uploadStage === 'failed' ? 'danger' : 'primary'}
        />
        {uploadStage === 'failed' && (
          <Button
            label="Reset Form"
            onPress={resetForm}
            variant="ghost"
            fullWidth
            style={{ marginTop: Spacing.sm }}
          />
        )}
      </View>

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

// ── Image picker box ──────────────────────────────────────────

function ImagePickerBox({
  label, subLabel, uri, onPick, onClear, disabled, style,
}: {
  label: string; subLabel: string; uri?: string;
  onPick: () => void; onClear: () => void;
  disabled?: boolean; style?: any;
}) {
  return (
    <View style={[imgStyles.container, style]}>
      <TouchableOpacity style={imgStyles.box} onPress={onPick} disabled={disabled} activeOpacity={0.8}>
        {uri ? (
          <>
            <Image source={{ uri }} style={StyleSheet.absoluteFill as any} contentFit="cover" />
            <TouchableOpacity style={imgStyles.clearBtn} onPress={onClear}>
              <Ionicons name="close-circle" size={20} color={Colors.text} />
            </TouchableOpacity>
          </>
        ) : (
          <View style={imgStyles.placeholder}>
            <Ionicons name="image-outline" size={24} color={Colors.textMuted} />
            <Text style={imgStyles.label}>{label}</Text>
            <Text style={imgStyles.sub}>{subLabel}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const imgStyles = StyleSheet.create({
  container: { flex: 1 },
  box: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius:    BorderRadius.md,
    borderWidth:     1,
    borderColor:     Colors.border,
    borderStyle:     'dashed',
    overflow:        'hidden',
    position:        'relative',
  },
  placeholder: {
    alignItems:    'center',
    justifyContent:'center',
    padding:       Spacing.md,
    gap:           4,
  },
  label: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  sub:   { color: Colors.textMuted, fontSize: FontSize.xs },
  clearBtn: {
    position:        'absolute',
    top:             Spacing.xs,
    right:           Spacing.xs,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius:    10,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content:   { padding: Spacing.md },

  sectionTitle: {
    color:        Colors.text,
    fontSize:     FontSize.lg,
    fontWeight:   FontWeight.bold,
    marginTop:    Spacing.xl,
    marginBottom: Spacing.md,
  },

  textarea: { minHeight: 96, textAlignVertical: 'top', paddingTop: Spacing.sm },

  row: { flexDirection: 'row', gap: Spacing.sm },
  halfInput: { flex: 1 },

  fieldLabel: {
    color:        Colors.textSecondary,
    fontSize:     FontSize.sm,
    fontWeight:   FontWeight.medium,
    marginBottom: Spacing.xs,
    letterSpacing: 0.3,
  },
  fieldError: { color: Colors.error, fontSize: FontSize.xs, marginTop: -Spacing.sm, marginBottom: Spacing.sm },

  ratingScroll: { marginBottom: Spacing.md },
  ratingChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.xs + 2,
    borderRadius:      BorderRadius.full,
    backgroundColor:   Colors.surfaceElevated,
    borderWidth:       1,
    borderColor:       Colors.border,
    marginRight:       Spacing.sm,
  },
  ratingChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  ratingChipText:   { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  ratingChipTextActive: { color: Colors.text },

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
  toggleInfo:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  toggleLabel: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  toggleSub:   { color: Colors.textMuted, fontSize: FontSize.xs },
  toggle: {
    width:           44,
    height:          24,
    borderRadius:    12,
    backgroundColor: Colors.border,
    padding:         2,
    justifyContent:  'center',
  },
  toggleActive: { backgroundColor: Colors.primary },
  toggleThumb: {
    width:           20,
    height:          20,
    borderRadius:    10,
    backgroundColor: Colors.text,
    alignSelf:       'flex-start',
  },
  toggleThumbActive: { alignSelf: 'flex-end' },

  catsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  catChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.xs + 2,
    borderRadius:      BorderRadius.full,
    backgroundColor:   Colors.surfaceElevated,
    borderWidth:       1,
    borderColor:       Colors.border,
  },
  catChipActive:    { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catChipText:      { color: Colors.textSecondary, fontSize: FontSize.sm },
  catChipTextActive:{ color: Colors.text },

  filePicker: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius:    BorderRadius.md,
    borderWidth:     1,
    borderColor:     Colors.border,
    borderStyle:     'dashed',
    padding:         Spacing.md,
    gap:             Spacing.md,
    marginBottom:    Spacing.xs,
  },
  filePickerError: { borderColor: Colors.error },
  fileInfo:        { flex: 1 },
  filePickerLabel: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: FontWeight.medium },
  filePickerSub:   { color: Colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
  fileName:        { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.medium },
  fileSize:        { color: Colors.textMuted, fontSize: FontSize.xs },

  imageRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  posterBox:   { aspectRatio: 2 / 3 },
  backdropBox: { aspectRatio: 16 / 9, flex: 2 },

  progressCard: {
    backgroundColor: Colors.surface,
    borderRadius:    BorderRadius.lg,
    padding:         Spacing.xl,
    alignItems:      'center',
    gap:             Spacing.md,
    marginBottom:    Spacing.xl,
    borderWidth:     1,
    borderColor:     Colors.border,
    ...Shadow.md,
  },
  progressTitle: { color: Colors.text, fontSize: FontSize.lg, fontWeight: FontWeight.bold },
  progressTrack: {
    width:           '100%',
    height:          8,
    backgroundColor: Colors.border,
    borderRadius:    4,
    overflow:        'hidden',
  },
  progressFill:  { height: '100%', backgroundColor: Colors.primary, borderRadius: 4 },
  progressPct:   { color: Colors.primary, fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  progressSub:   { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },

  submitSection: { marginTop: Spacing.xl },
});
