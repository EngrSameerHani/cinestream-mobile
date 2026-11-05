// ============================================================
// Root index — redirect based on auth state
// ============================================================

import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/authStore';

export default function Index() {
  const { session } = useAuthStore();
  return session
    ? <Redirect href="/(tabs)" />
    : <Redirect href="/(auth)/login" />;
}
