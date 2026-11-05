// ============================================================
// Admin Manage Categories Screen
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { categoriesApi } from '../../services/api';
import { Category } from '../../types';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import {
  Colors, FontSize, FontWeight, Spacing, BorderRadius,
} from '../../constants/theme';
import { useFocusEffect } from '@react-navigation/native';

interface EditModal {
  visible:  boolean;
  category: Category | null; // null = creating new
}

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading,  setIsLoading]  = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [modal,      setModal]      = useState<EditModal>({ visible: false, category: null });

  const loadCategories = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await categoriesApi.list(true); // include inactive
      setCategories(data);
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to load categories');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadCategories(); }, [loadCategories]));

  const onRefresh = () => { setRefreshing(true); loadCategories(); };

  const handleDelete = (cat: Category) => {
    Alert.alert(
      'Delete Category',
      `Delete "${cat.name}"? Movies in this category will not be deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(cat.id);
            try {
              await categoriesApi.delete(cat.id);
              setCategories((prev) => prev.filter((c) => c.id !== cat.id));
            } catch (err: any) {
              Alert.alert('Error', err.message ?? 'Failed to delete category');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ],
    );
  };

  const handleToggleActive = async (cat: Category) => {
    try {
      const updated = await categoriesApi.update(cat.id, { is_active: !cat.is_active });
      setCategories((prev) => prev.map((c) => c.id === cat.id ? updated : c));
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to update category');
    }
  };

  const openCreate = () => setModal({ visible: true, category: null });
  const openEdit   = (cat: Category) => setModal({ visible: true, category: cat });
  const closeModal = () => setModal({ visible: false, category: null });

  const handleSave = async (name: string, description: string, sortOrder: string) => {
    const payload = {
      name:        name.trim(),
      description: description.trim() || undefined,
      sort_order:  sortOrder ? parseInt(sortOrder, 10) : undefined,
    };
    try {
      if (modal.category) {
        const updated = await categoriesApi.update(modal.category.id, payload);
        setCategories((prev) => prev.map((c) => c.id === modal.category!.id ? updated : c));
      } else {
        const created = await categoriesApi.create(payload);
        setCategories((prev) => [...prev, created].sort((a, b) => a.sort_order - b.sort_order));
      }
      closeModal();
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to save category');
    }
  };

  if (isLoading) return <LoadingScreen message="Loading categories…" />;

  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <Text style={styles.count}>{categories.length} categories</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={18} color={Colors.text} />
          <Text style={styles.addBtnText}>Add Category</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={categories}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item: cat }) => (
          <View style={styles.row}>
            {/* Sort order badge */}
            <View style={styles.orderBadge}>
              <Text style={styles.orderText}>{cat.sort_order}</Text>
            </View>

            {/* Info */}
            <View style={styles.info}>
              <View style={styles.nameRow}>
                <Text style={[styles.name, !cat.is_active && styles.nameInactive]}>
                  {cat.name}
                </Text>
                {!cat.is_active && (
                  <View style={styles.inactiveBadge}>
                    <Text style={styles.inactiveBadgeText}>Hidden</Text>
                  </View>
                )}
              </View>
              {cat.description && (
                <Text style={styles.description} numberOfLines={1}>{cat.description}</Text>
              )}
              <Text style={styles.slug}>/{cat.slug}</Text>
            </View>

            {/* Actions */}
            <View style={styles.actions}>
              {deletingId === cat.id ? (
                <ActivityIndicator color={Colors.primary} size="small" />
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleToggleActive(cat)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons
                      name={cat.is_active ? 'eye-outline' : 'eye-off-outline'}
                      size={18}
                      color={cat.is_active ? Colors.success : Colors.textMuted}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => openEdit(cat)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="pencil-outline" size={18} color={Colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleDelete(cat)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Ionicons name="trash-outline" size={18} color={Colors.error} />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        )}
      />

      {/* Create / Edit Modal */}
      <CategoryModal
        visible={modal.visible}
        category={modal.category}
        onClose={closeModal}
        onSave={handleSave}
      />
    </View>
  );
}

// ── Category modal ────────────────────────────────────────────

function CategoryModal({
  visible, category, onClose, onSave,
}: {
  visible:   boolean;
  category:  Category | null;
  onClose:   () => void;
  onSave:    (name: string, desc: string, order: string) => Promise<void>;
}) {
  const [name,        setName]        = useState('');
  const [description, setDescription] = useState('');
  const [sortOrder,   setSortOrder]   = useState('');
  const [isSaving,    setIsSaving]    = useState(false);
  const [nameError,   setNameError]   = useState('');

  // Populate when editing
  React.useEffect(() => {
    if (visible) {
      setName(category?.name ?? '');
      setDescription(category?.description ?? '');
      setSortOrder(category?.sort_order !== undefined ? String(category.sort_order) : '');
      setNameError('');
    }
  }, [visible, category]);

  const handleSubmit = async () => {
    if (!name.trim()) { setNameError('Category name is required'); return; }
    setIsSaving(true);
    await onSave(name, description, sortOrder);
    setIsSaving(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <TouchableOpacity style={modalStyles.overlay} activeOpacity={1} onPress={onClose} />
        <View style={modalStyles.sheet}>
          <View style={modalStyles.handle} />
          <Text style={modalStyles.title}>
            {category ? 'Edit Category' : 'New Category'}
          </Text>

          <Input
            label="Name *"
            value={name}
            onChangeText={(t) => { setName(t); setNameError(''); }}
            error={nameError}
            placeholder="e.g. Action"
            autoFocus
          />
          <Input
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Optional short description"
            multiline
            numberOfLines={2}
            style={{ minHeight: 64, textAlignVertical: 'top' }}
          />
          <Input
            label="Sort Order"
            value={sortOrder}
            onChangeText={setSortOrder}
            placeholder="0"
            keyboardType="numeric"
          />

          <View style={modalStyles.buttons}>
            <Button label="Cancel" onPress={onClose} variant="secondary" style={{ flex: 1 }} />
            <Button label="Save" onPress={handleSubmit} isLoading={isSaving} style={{ flex: 1 }} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex:            1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor:  Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding:          Spacing.xl,
    paddingBottom:    Platform.OS === 'ios' ? 40 : Spacing.xl,
    borderWidth:      1,
    borderColor:      Colors.border,
  },
  handle: {
    width:           40,
    height:          4,
    borderRadius:    2,
    backgroundColor: Colors.border,
    alignSelf:       'center',
    marginBottom:    Spacing.lg,
  },
  title: {
    color:        Colors.text,
    fontSize:     FontSize.xl,
    fontWeight:   FontWeight.bold,
    marginBottom: Spacing.lg,
  },
  buttons: {
    flexDirection: 'row',
    gap:           Spacing.sm,
    marginTop:     Spacing.sm,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection:   'row',
    justifyContent:  'space-between',
    alignItems:      'center',
    paddingHorizontal: Spacing.md,
    paddingVertical:  Spacing.md,
  },
  count:   { color: Colors.textMuted, fontSize: FontSize.sm },
  addBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             Spacing.xs,
    backgroundColor: Colors.primary,
    borderRadius:    BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical:  Spacing.xs + 2,
  },
  addBtnText: { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  list:      { paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl },
  separator: { height: 1, backgroundColor: Colors.border },

  row: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingVertical: Spacing.md,
    gap:            Spacing.sm,
  },
  orderBadge: {
    width:           32,
    height:          32,
    borderRadius:    BorderRadius.sm,
    backgroundColor: Colors.surfaceElevated,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  orderText:  { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  info:       { flex: 1, gap: 2 },
  nameRow:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  name:       { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold },
  nameInactive: { color: Colors.textMuted },
  inactiveBadge: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius:    BorderRadius.sm,
    paddingHorizontal: 6,
    paddingVertical:  1,
  },
  inactiveBadgeText: { color: Colors.textMuted, fontSize: 10 },
  description: { color: Colors.textMuted, fontSize: FontSize.xs },
  slug:        { color: Colors.textMuted, fontSize: 10, fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace' },
  actions:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  actionBtn: {
    width:           32,
    height:          32,
    borderRadius:    BorderRadius.sm,
    backgroundColor: Colors.surfaceElevated,
    alignItems:      'center',
    justifyContent:  'center',
  },
});
