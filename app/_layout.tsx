// ============================================================
// Root Layout — initialises auth and controls navigation
// ============================================================

import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/authStore';
import { Colors } from '../constants/theme';

// Keep splash visible until we've resolved the auth session
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { initialise, isInitialised } = useAuthStore();

  useEffect(() => {
    initialise().finally(() => SplashScreen.hideAsync());
  }, []);

  if (!isInitialised) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: Colors.background }}>
      <SafeAreaProvider>
        <StatusBar style="light" backgroundColor={Colors.background} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
          <Stack.Screen name="(auth)"  options={{ animation: 'fade' }} />
          <Stack.Screen name="(tabs)"  options={{ animation: 'fade' }} />
          <Stack.Screen name="(admin)" options={{ animation: 'slide_from_right' }} />
          <Stack.Screen
            name="movie/[id]"
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
