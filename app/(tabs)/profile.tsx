// ============================================================
// Profile & Settings Screen
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
  Linking,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useAuthStore } from '../../store/authStore';
import { supabase } from '../../services/supabase';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow,
} from '../../constants/theme';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export default function ProfileScreen() {
  const router = useRouter();
  const { user, signOut, updateUser, isLoading } = useAuthStore();

  const [isEditing,      setIsEditing]      = useState(false);
  const [editName,       setEditName]       = useState(user?.full_name ?? '');
  const [nameError,      setNameError]      = useState('');
  const [isSaving,       setIsSaving]       = useState(false);
  const [isSigningOut,   setIsSigningOut]   = useState(false);

  // ── Avatar pick ───────────────────────────────────────────

  const pickAvatar = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo library access in Settings.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      try {
        // Upload to Supabase Storage avatars bucket
        const ext      = asset.uri.split('.').pop() ?? 'jpg';
        const fileName = `${user!.id}/avatar.${ext}`;

        const formData = new FormData();
        formData.append('file', {
          uri:  asset.uri,
          type: `image/${ext}`,
          name: fileName,
        } as any);

        const { data, error } = await supabase.storage
          .from('avatars')
          .upload(fileName, formData as any, { upsert: true });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);

        await updateUser({ avatar_url: publicUrl });
        Alert.alert('Success', 'Avatar updated!');
      } catch (err: any) {
        Alert.alert('Upload failed', err.message ?? 'Could not upload avatar.');
      }
    }
  }, [user, updateUser]);

  // ── Save name ─────────────────────────────────────────────

  const saveName = useCallback(async () => {
    if (!editName.trim() || editName.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      return;
    }
    setNameError('');
    setIsSaving(true);
    try {
      await updateUser({ full_name: editName.trim() });
      setIsEditing(false);
      Alert.alert('Saved', 'Your name has been updated.');
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to update name.');
    } finally {
      setIsSaving(false);
    }
  }, [editName, updateUser]);

  // ── Sign out ──────────────────────────────────────────────

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          setIsSigningOut(true);
          await signOut();
          // Navigation handled by index redirect
        },
      },
    ]);
  }, [signOut]);

  // ── Change password ───────────────────────────────────────

  const handleChangePassword = useCallback(() => {
    Alert.alert(
      'Reset Password',
      `We'll send a password reset link to:\n${user?.email}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Link',
          onPress: async () => {
            if (!user?.email) return;
            const { error } = await supabase.auth.resetPasswordForEmail(user.email);
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              Alert.alert('Email Sent', 'Check your inbox for a password reset link.');
            }
          },
        },
      ],
    );
  }, [user]);

  if (!user) return null;

  const initials = (user.full_name ?? user.email ?? 'U')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>

        {/* ── Hero profile card ── */}
        <View style={styles.profileCard}>
          {/* Avatar */}
          <TouchableOpacity style={styles.avatarContainer} onPress={pickAvatar} activeOpacity={0.8}>
            {user.avatar_url ? (
              <Image
                source={{ uri: user.avatar_url }}
                style={styles.avatar}
                contentFit="cover"
              />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitials}>{initials}</Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={13} color={Colors.text} />
            </View>
          </TouchableOpacity>

          {/* Name / email */}
          {isEditing ? (
            <View style={styles.editNameContainer}>
              <Input
                value={editName}
                onChangeText={(t) => { setEditName(t); setNameError(''); }}
                error={nameError}
                placeholder="Your full name"
                autoFocus
                containerStyle={styles.nameInput}
              />
              <View style={styles.editActions}>
                <Button
                  label="Save"
                  onPress={saveName}
                  isLoading={isSaving}
                  size="sm"
                  style={styles.saveBtn}
                />
                <Button
                  label="Cancel"
                  onPress={() => { setIsEditing(false); setEditName(user.full_name ?? ''); }}
                  variant="ghost"
                  size="sm"
                />
              </View>
            </View>
          ) : (
            <TouchableOpacity style={styles.nameRow} onPress={() => setIsEditing(true)}>
              <Text style={styles.displayName}>
                {user.full_name || 'Add your name'}
              </Text>
              <Ionicons name="pencil-outline" size={14} color={Colors.textMuted} />
            </TouchableOpacity>
          )}

          <Text style={styles.email}>{user.email}</Text>

          {/* Role badge */}
          {user.role === 'admin' && (
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={12} color={Colors.primary} />
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          )}

          {/* Member since */}
          <Text style={styles.memberSince}>
            Member since {new Date(user.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </Text>
        </View>

        {/* ── Admin Panel shortcut ── */}
        {user.role === 'admin' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Admin</Text>
            <SettingsItem
              icon="shield-checkmark-outline"
              label="Admin Dashboard"
              onPress={() => router.push('/(admin)')}
              tintColor={Colors.primary}
              chevron
            />
          </View>
        )}

        {/* ── Account settings ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.settingsCard}>
            <SettingsItem
              icon="person-outline"
              label="Edit Name"
              value={user.full_name ?? 'Not set'}
              onPress={() => setIsEditing(true)}
              chevron
            />
            <View style={styles.settingsDivider} />
            <SettingsItem
              icon="mail-outline"
              label="Email"
              value={user.email}
            />
            <View style={styles.settingsDivider} />
            <SettingsItem
              icon="lock-closed-outline"
              label="Change Password"
              onPress={handleChangePassword}
              chevron
            />
          </View>
        </View>

        {/* ── My content ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Content</Text>
          <View style={styles.settingsCard}>
            <SettingsItem
              icon="bookmark-outline"
              label="My Watchlist"
              onPress={() => router.push('/(tabs)/browse')}
              chevron
            />
            <View style={styles.settingsDivider} />
            <SettingsItem
              icon="time-outline"
              label="Watch History"
              onPress={() => router.push('/(tabs)/history')}
              chevron
            />
          </View>
        </View>

        {/* ── Support ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.settingsCard}>
            <SettingsItem
              icon="help-circle-outline"
              label="Help Center"
              onPress={() => Linking.openURL('https://cinestream.app/help')}
              chevron
            />
            <View style={styles.settingsDivider} />
            <SettingsItem
              icon="document-text-outline"
              label="Terms of Service"
              onPress={() => Linking.openURL('https://cinestream.app/terms')}
              chevron
            />
            <View style={styles.settingsDivider} />
            <SettingsItem
              icon="shield-outline"
              label="Privacy Policy"
              onPress={() => Linking.openURL('https://cinestream.app/privacy')}
              chevron
            />
          </View>
        </View>

        {/* ── App info ── */}
        <View style={styles.appInfo}>
          <View style={styles.appIconRow}>
            <Ionicons name="film" size={18} color={Colors.primary} />
            <Text style={styles.appName}>CineStream</Text>
          </View>
          <Text style={styles.appVersion}>Version 1.0.0</Text>
          <Text style={styles.appPlatform}>{Platform.OS === 'ios' ? 'iOS' : 'Android'}</Text>
        </View>

        {/* ── Sign out ── */}
        <View style={styles.signOutSection}>
          <Button
            label="Sign Out"
            variant="danger"
            onPress={handleSignOut}
            isLoading={isSigningOut}
            fullWidth
            size="lg"
          />
        </View>

        <View style={{ height: Spacing.xxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── SettingsItem row ──────────────────────────────────────────

function SettingsItem({
  icon,
  label,
  value,
  onPress,
  tintColor,
  chevron = false,
  rightElement,
}: {
  icon:          IoniconName;
  label:         string;
  value?:        string;
  onPress?:      () => void;
  tintColor?:    string;
  chevron?:      boolean;
  rightElement?: React.ReactNode;
}) {
  const content = (
    <View style={settingStyles.row}>
      <View style={[settingStyles.iconBox, tintColor && { backgroundColor: `${tintColor}22` }]}>
        <Ionicons name={icon} size={18} color={tintColor ?? Colors.textSecondary} />
      </View>
      <Text style={settingStyles.label}>{label}</Text>
      <View style={settingStyles.right}>
        {value ? <Text style={settingStyles.value} numberOfLines={1}>{value}</Text> : null}
        {rightElement}
        {chevron ? <Ionicons name="chevron-forward" size={16} color={Colors.textMuted} /> : null}
      </View>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

const settingStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems:    'center',
    paddingHorizontal: Spacing.md,
    paddingVertical:   Spacing.md - 2,
    gap:           Spacing.md,
  },
  iconBox: {
    width:           34,
    height:          34,
    borderRadius:    BorderRadius.sm + 2,
    backgroundColor: Colors.surfaceElevated,
    alignItems:      'center',
    justifyContent:  'center',
  },
  label: {
    flex:      1,
    color:     Colors.text,
    fontSize:  FontSize.md,
  },
  right: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.xs,
    maxWidth:      '45%',
  },
  value: {
    color:    Colors.textMuted,
    fontSize: FontSize.sm,
    textAlign:'right',
  },
});

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.sm },

  // Profile card
  profileCard: {
    alignItems:      'center',
    backgroundColor: Colors.surface,
    borderRadius:    BorderRadius.xl,
    padding:         Spacing.xl,
    marginBottom:    Spacing.lg,
    borderWidth:     1,
    borderColor:     Colors.border,
    ...Shadow.sm,
  },
  avatarContainer: {
    position:     'relative',
    marginBottom: Spacing.md,
  },
  avatar: {
    width:        90,
    height:       90,
    borderRadius: 45,
    borderWidth:  3,
    borderColor:  Colors.primary,
  },
  avatarFallback: {
    backgroundColor: Colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  avatarInitials: {
    color:      Colors.text,
    fontSize:   FontSize.xxl,
    fontWeight: FontWeight.bold,
  },
  avatarEditBadge: {
    position:        'absolute',
    bottom:          2,
    right:           2,
    width:           26,
    height:          26,
    borderRadius:    13,
    backgroundColor: Colors.primary,
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     2,
    borderColor:     Colors.surface,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.xs,
    marginBottom:  Spacing.xs,
  },
  displayName: {
    color:      Colors.text,
    fontSize:   FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  email: {
    color:        Colors.textMuted,
    fontSize:     FontSize.sm,
    marginBottom: Spacing.sm,
  },
  adminBadge: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             4,
    backgroundColor: 'rgba(229,9,20,0.12)',
    borderRadius:    BorderRadius.full,
    paddingHorizontal: Spacing.sm,
    paddingVertical:  3,
    marginBottom:    Spacing.sm,
    borderWidth:     1,
    borderColor:     'rgba(229,9,20,0.25)',
  },
  adminBadgeText: {
    color:      Colors.primary,
    fontSize:   FontSize.xs,
    fontWeight: FontWeight.bold,
    letterSpacing: 0.5,
  },
  memberSince: {
    color:    Colors.textMuted,
    fontSize: FontSize.xs,
  },

  // Edit name
  editNameContainer: { width: '100%', alignItems: 'center' },
  nameInput:         { width: '100%' },
  editActions: {
    flexDirection: 'row',
    gap:           Spacing.sm,
    marginTop:     -Spacing.sm,
  },
  saveBtn: { minWidth: 80 },

  // Sections
  section:      { marginBottom: Spacing.lg },
  sectionTitle: {
    color:        Colors.textMuted,
    fontSize:     FontSize.xs,
    fontWeight:   FontWeight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom:  Spacing.sm,
    paddingLeft:   Spacing.xs,
  },
  settingsCard: {
    backgroundColor: Colors.surface,
    borderRadius:    BorderRadius.lg,
    overflow:        'hidden',
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  settingsDivider: {
    height:          1,
    backgroundColor: Colors.border,
    marginLeft:      Spacing.md + 34 + Spacing.md,
  },

  // App info
  appInfo: {
    alignItems:   'center',
    marginBottom: Spacing.xl,
    gap:          4,
  },
  appIconRow: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.xs,
  },
  appName:     { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  appVersion:  { color: Colors.textMuted, fontSize: FontSize.xs },
  appPlatform: { color: Colors.textMuted, fontSize: FontSize.xs },

  // Sign out
  signOutSection: { marginBottom: Spacing.md },
});
