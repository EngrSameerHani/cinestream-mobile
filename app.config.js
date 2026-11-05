// ============================================================
// app.config.js — dynamic Expo config
// Overrides app.json at build time
// ============================================================

export default ({ config }) => ({
  ...config,
  name: 'CineStream',
  slug: 'cinestream',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'cinestream',
  userInterfaceStyle: 'dark',
  splash: {
    image: './assets/images/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0a0a0a',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.cinestream.app',
    infoPlist: {
      NSCameraUsageDescription: 'Used for profile photo',
      NSPhotoLibraryUsageDescription: 'Used for profile photo',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/images/adaptive-icon.png',
      backgroundColor: '#0a0a0a',
    },
    package: 'com.cinestream.app',
    permissions: [
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.INTERNET',
    ],
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    ['expo-av', { microphonePermission: false }],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    // Inline env vars so they work even when .env is not present (e.g. EAS build)
    supabaseUrl:  process.env.EXPO_PUBLIC_SUPABASE_URL  ?? 'https://odqhpazfxkxrgddplsrh.supabase.co',
    supabaseAnon: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9kcWhwYXpmeGt4cmdkZHBsc3JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTM3OTgzNjgsImV4cCI6MjEwOTM3NDM2OH0.itLNhFa03la7bAL1seKi47xIMPbFKtMP28_MrzgabvI',
    apiUrl:       process.env.EXPO_PUBLIC_API_URL       ?? 'http://localhost:4000/api',
    useMock:      process.env.EXPO_PUBLIC_USE_MOCK      ?? 'true',
    eas: {
      projectId: config?.extra?.eas?.projectId ?? '',
    },
  },
});
