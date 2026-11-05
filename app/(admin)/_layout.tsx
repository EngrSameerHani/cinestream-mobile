// ============================================================
// Admin stack layout — only accessible to admin role
// ============================================================

import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/theme';

export default function AdminLayout() {
  const { session, user } = useAuthStore();

  if (!session)             return <Redirect href="/(auth)/login" />;
  if (user?.role !== 'admin') return <Redirect href="/(tabs)" />;

  return (
    <Stack
      screenOptions={{
        headerShown:   true,
        headerStyle:   { backgroundColor: Colors.surface },
        headerTintColor: Colors.text,
        headerTitleStyle: { color: Colors.text, fontWeight: '700' },
        contentStyle:  { backgroundColor: Colors.background },
      }}
    >
      <Stack.Screen name="index"         options={{ title: 'Admin Dashboard', headerLeft: () => null }} />
      <Stack.Screen name="upload"        options={{ title: 'Upload Movie' }} />
      <Stack.Screen name="movies"        options={{ title: 'Manage Movies' }} />
      <Stack.Screen name="movie/[id]"    options={{ title: 'Edit Movie' }} />
      <Stack.Screen name="categories"    options={{ title: 'Manage Categories' }} />
    </Stack>
  );
}
