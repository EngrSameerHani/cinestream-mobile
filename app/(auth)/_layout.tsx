// ============================================================
// Auth stack layout
// ============================================================

import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/theme';

export default function AuthLayout() {
  const { session } = useAuthStore();

  // If already logged in, skip to main app
  if (session) return <Redirect href="/(tabs)" />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
      <Stack.Screen name="login"    options={{ animation: 'fade' }} />
      <Stack.Screen name="register" options={{ animation: 'slide_from_right' }} />
    </Stack>
  );
}
