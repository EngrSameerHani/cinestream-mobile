// ============================================================
// Admin Dashboard Screen
// ============================================================

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { adminApi } from '../../services/api';
import { AdminStats } from '../../types';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { ErrorState } from '../../components/ui/ErrorState';
import { useAuthStore } from '../../store/authStore';
import {
  Colors, FontSize, FontWeight, Spacing, BorderRadius, Shadow,
} from '../../constants/theme';
import { formatCount } from '../../utils/format';
import { useFocusEffect } from '@react-navigation/native';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

export default function AdminDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [stats,      setStats]      = useState<AdminStats | null>(null);
  const [isLoading,  setIsLoading]  = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setError(null);
    try {
      const data = await adminApi.stats();
      setStats(data);
    } catch (err: any) {
      setError(err.message ?? 'Failed to load stats');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Reload stats every time admin tab gains focus
  useFocusEffect(useCallback(() => { loadStats(); }, [loadStats]));

  const onRefresh = () => { setRefreshing(true); loadStats(); };

  if (isLoading) return <LoadingScreen message="Loading dashboard…" />;
  if (error)     return <ErrorState message={error} onRetry={loadStats} />;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} colors={[Colors.primary]} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Welcome row */}
      <View style={styles.welcomeRow}>
        <View>
          <Text style={styles.welcomeTitle}>Dashboard</Text>
          <Text style={styles.welcomeSub}>Welcome back, {user?.full_name?.split(' ')[0] ?? 'Admin'}</Text>
        </View>
        <View style={styles.shieldBadge}>
          <Ionicons name="shield-checkmark" size={20} color={Colors.primary} />
        </View>
      </View>

      {/* ── Stats grid ── */}
      <Text style={styles.sectionLabel}>Overview</Text>
      <View style={styles.statsGrid}>
        <StatCard
          icon="film"
          label="Total Movies"
          value={formatCount(stats?.movies.total_count ?? 0)}
          color={Colors.info}
        />
        <StatCard
          icon="checkmark-circle"
          label="Published"
          value={formatCount(stats?.movies.published_count ?? 0)}
          color={Colors.success}
        />
        <StatCard
          icon="people"
          label="Users"
          value={formatCount(stats?.total_users ?? 0)}
          color={Colors.primary}
        />
        <StatCard
          icon="eye"
          label="Total Views"
          value={formatCount(stats?.movies.total_views ?? 0)}
          color='#f59e0b'
        />
      </View>

      {/* Processing status row */}
      {(stats?.movies.processing_count ?? 0) > 0 && (
        <View style={styles.processingBanner}>
          <Ionicons name="hourglass-outline" size={16} color={Colors.warning} />
          <Text style={styles.processingText}>
            {stats!.movies.processing_count} movie{stats!.movies.processing_count > 1 ? 's' : ''} still processing
          </Text>
        </View>
      )}
      {(stats?.movies.failed_count ?? 0) > 0 && (
        <View style={[styles.processingBanner, styles.failedBanner]}>
          <Ionicons name="alert-circle-outline" size={16} color={Colors.error} />
          <Text style={[styles.processingText, { color: Colors.error }]}>
            {stats!.movies.failed_count} failed upload{stats!.movies.failed_count > 1 ? 's' : ''}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(admin)/movies')}>
            <Text style={styles.failedLink}>Review →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Quick actions ── */}
      <Text style={styles.sectionLabel}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        <ActionCard
          icon="cloud-upload-outline"
          label="Upload Movie"
          description="Add a new movie with video and poster"
          color={Colors.primary}
          onPress={() => router.push('/(admin)/upload')}
        />
        <ActionCard
          icon="film-outline"
          label="Manage Movies"
          description="Edit, publish or delete movies"
          color={Colors.info}
          onPress={() => router.push('/(admin)/movies')}
        />
        <ActionCard
          icon="grid-outline"
          label="Categories"
          description="Add or edit movie categories"
          color='#f59e0b'
          onPress={() => router.push('/(admin)/categories')}
        />
      </View>

      {/* ── Movie status breakdown ── */}
      <Text style={styles.sectionLabel}>Movie Status</Text>
      <View style={styles.statusCard}>
        <StatusRow label="Published"  value={stats?.movies.published_count  ?? 0} color={Colors.success} total={stats?.movies.total_count ?? 1} />
        <StatusRow label="Draft"      value={stats?.movies.draft_count      ?? 0} color={Colors.textMuted} total={stats?.movies.total_count ?? 1} />
        <StatusRow label="Processing" value={stats?.movies.processing_count ?? 0} color={Colors.warning} total={stats?.movies.total_count ?? 1} />
        <StatusRow label="Failed"     value={stats?.movies.failed_count     ?? 0} color={Colors.error} total={stats?.movies.total_count ?? 1} />
      </View>

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

// ── Sub-components ────────────────────────────────────────────

function StatCard({ icon, label, value, color }: {
  icon: IoniconName; label: string; value: string; color: string;
}) {
  return (
    <View style={[statStyles.card, Shadow.sm]}>
      <View style={[statStyles.iconBox, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={statStyles.value}>{value}</Text>
      <Text style={statStyles.label}>{label}</Text>
    </View>
  );
}

const statStyles = StyleSheet.create({
  card: {
    flex:            1,
    backgroundColor: Colors.surface,
    borderRadius:    BorderRadius.lg,
    padding:         Spacing.md,
    alignItems:      'flex-start',
    borderWidth:     1,
    borderColor:     Colors.border,
    gap:             Spacing.xs,
    minWidth:        '45%',
  },
  iconBox: {
    width:           40,
    height:          40,
    borderRadius:    BorderRadius.md,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    Spacing.xs,
  },
  value: { color: Colors.text, fontSize: FontSize.xxl, fontWeight: FontWeight.bold },
  label: { color: Colors.textMuted, fontSize: FontSize.xs },
});

function ActionCard({ icon, label, description, color, onPress }: {
  icon: IoniconName; label: string; description: string; color: string; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[actionStyles.card, Shadow.sm]} onPress={onPress} activeOpacity={0.85}>
      <View style={[actionStyles.iconBox, { backgroundColor: `${color}22` }]}>
        <Ionicons name={icon} size={26} color={color} />
      </View>
      <View style={actionStyles.info}>
        <Text style={actionStyles.label}>{label}</Text>
        <Text style={actionStyles.desc}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
    </TouchableOpacity>
  );
}

const actionStyles = StyleSheet.create({
  card: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.surface,
    borderRadius:    BorderRadius.lg,
    padding:         Spacing.md,
    gap:             Spacing.md,
    borderWidth:     1,
    borderColor:     Colors.border,
    marginBottom:    Spacing.sm,
  },
  iconBox: {
    width:           52,
    height:          52,
    borderRadius:    BorderRadius.md,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  info:  { flex: 1 },
  label: { color: Colors.text, fontSize: FontSize.md, fontWeight: FontWeight.semibold, marginBottom: 2 },
  desc:  { color: Colors.textMuted, fontSize: FontSize.xs },
});

function StatusRow({ label, value, color, total }: {
  label: string; value: number; color: string; total: number;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  return (
    <View style={srStyles.row}>
      <View style={srStyles.labelRow}>
        <View style={[srStyles.dot, { backgroundColor: color }]} />
        <Text style={srStyles.label}>{label}</Text>
        <Text style={srStyles.value}>{value}</Text>
      </View>
      <View style={srStyles.track}>
        <View style={[srStyles.fill, { width: `${pct}%`, backgroundColor: color }]} />
      </View>
    </View>
  );
}

const srStyles = StyleSheet.create({
  row:      { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, gap: 6 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dot:      { width: 8, height: 8, borderRadius: 4 },
  label:    { flex: 1, color: Colors.textSecondary, fontSize: FontSize.sm },
  value:    { color: Colors.text, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  track: {
    height:          6,
    backgroundColor: Colors.border,
    borderRadius:    3,
    overflow:        'hidden',
  },
  fill: { height: '100%', borderRadius: 3, minWidth: 3 },
});

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content:   { padding: Spacing.md },

  welcomeRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   Spacing.xl,
  },
  welcomeTitle: { color: Colors.text, fontSize: FontSize.xxxl, fontWeight: FontWeight.bold },
  welcomeSub:   { color: Colors.textMuted, fontSize: FontSize.md, marginTop: 2 },
  shieldBadge: {
    width:           44,
    height:          44,
    borderRadius:    22,
    backgroundColor: 'rgba(229,9,20,0.12)',
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     1,
    borderColor:     'rgba(229,9,20,0.25)',
  },

  sectionLabel: {
    color:        Colors.textMuted,
    fontSize:     FontSize.xs,
    fontWeight:   FontWeight.semibold,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom:  Spacing.sm,
    marginTop:     Spacing.lg,
  },

  statsGrid: {
    flexDirection: 'row',
    flexWrap:      'wrap',
    gap:           Spacing.sm,
    marginBottom:  Spacing.sm,
  },

  processingBanner: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             Spacing.sm,
    backgroundColor: 'rgba(245,158,11,0.12)',
    borderRadius:    BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical:  Spacing.sm,
    marginBottom:    Spacing.sm,
    borderWidth:     1,
    borderColor:     'rgba(245,158,11,0.25)',
  },
  failedBanner: {
    backgroundColor: 'rgba(239,68,68,0.12)',
    borderColor:     'rgba(239,68,68,0.25)',
  },
  processingText: { flex: 1, color: Colors.warning, fontSize: FontSize.sm },
  failedLink:     { color: Colors.error, fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  actionsGrid: { marginBottom: Spacing.sm },

  statusCard: {
    backgroundColor: Colors.surface,
    borderRadius:    BorderRadius.lg,
    overflow:        'hidden',
    borderWidth:     1,
    borderColor:     Colors.border,
  },
});
