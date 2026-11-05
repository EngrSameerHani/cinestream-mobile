// ============================================================
// Login Screen
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import {
  Colors, FontSize, FontWeight, Spacing, BorderRadius,
} from '../../constants/theme';

interface FormErrors {
  email?:    string;
  password?: string;
}

function validate(email: string, password: string): FormErrors {
  const errors: FormErrors = {};
  if (!email.trim())                       errors.email    = 'Email is required';
  else if (!/\S+@\S+\.\S+/.test(email))   errors.email    = 'Enter a valid email address';
  if (!password)                           errors.password = 'Password is required';
  else if (password.length < 6)           errors.password = 'Password must be at least 6 characters';
  return errors;
}

export default function LoginScreen() {
  const router    = useRouter();
  const { signIn, isLoading } = useAuthStore();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [errors,   setErrors]   = useState<FormErrors>({});

  async function handleLogin() {
    const errs = validate(email.trim(), password);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    try {
      await signIn(email.trim().toLowerCase(), password);
      // Navigation is handled automatically by the auth state listener in _layout
    } catch (err: any) {
      Alert.alert('Sign In Failed', err.message ?? 'Incorrect email or password.');
    }
  }

  return (
    <LinearGradient
      colors={[Colors.background, '#0d0d0d', Colors.background]}
      style={styles.gradient}
    >
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.kav}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Logo */}
            <View style={styles.logoContainer}>
              <View style={styles.logoBox}>
                <Ionicons name="film" size={36} color={Colors.primary} />
              </View>
              <Text style={styles.logoText}>CINESTREAM</Text>
              <Text style={styles.tagline}>Unlimited movies, anytime.</Text>
            </View>

            {/* Card */}
            <View style={styles.card}>
              <Text style={styles.heading}>Sign In</Text>
              <Text style={styles.subheading}>Welcome back</Text>

              <Input
                label="Email"
                value={email}
                onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: undefined })); }}
                error={errors.email}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                placeholder="you@example.com"
                returnKeyType="next"
              />

              <Input
                label="Password"
                value={password}
                onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: undefined })); }}
                error={errors.password}
                isPassword
                autoComplete="current-password"
                textContentType="password"
                placeholder="••••••••"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />

              <Button
                label="Sign In"
                onPress={handleLogin}
                isLoading={isLoading}
                fullWidth
                size="lg"
                style={styles.loginBtn}
              />

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Register link */}
              <View style={styles.registerRow}>
                <Text style={styles.registerText}>Don't have an account? </Text>
                <Link href="/(auth)/register" asChild>
                  <TouchableOpacity>
                    <Text style={styles.registerLink}>Create account</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>

            {/* Footer */}
            <Text style={styles.footer}>
              By signing in you agree to our Terms of Service and Privacy Policy.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient:  { flex: 1 },
  safe:      { flex: 1 },
  kav:       { flex: 1 },
  scroll: {
    flexGrow:        1,
    justifyContent:  'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.xl,
  },

  // Logo
  logoContainer: {
    alignItems:   'center',
    marginBottom: Spacing.xl,
  },
  logoBox: {
    width:           72,
    height:          72,
    borderRadius:    BorderRadius.xl,
    backgroundColor: 'rgba(229,9,20,0.15)',
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    Spacing.md,
    borderWidth:     1,
    borderColor:     'rgba(229,9,20,0.3)',
  },
  logoText: {
    color:         Colors.text,
    fontSize:      FontSize.xxl,
    fontWeight:    FontWeight.black,
    letterSpacing: 6,
  },
  tagline: {
    color:      Colors.textMuted,
    fontSize:   FontSize.sm,
    marginTop:  Spacing.xs,
    letterSpacing: 0.5,
  },

  // Card
  card: {
    backgroundColor: Colors.surface,
    borderRadius:    BorderRadius.xl,
    padding:         Spacing.xl,
    borderWidth:     1,
    borderColor:     Colors.border,
    marginBottom:    Spacing.lg,
  },
  heading: {
    color:        Colors.text,
    fontSize:     FontSize.xxxl,
    fontWeight:   FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  subheading: {
    color:        Colors.textMuted,
    fontSize:     FontSize.md,
    marginBottom: Spacing.xl,
  },
  loginBtn: {
    marginTop: Spacing.sm,
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems:    'center',
    marginVertical: Spacing.lg,
    gap:           Spacing.sm,
  },
  dividerLine: {
    flex:            1,
    height:          1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    color:    Colors.textMuted,
    fontSize: FontSize.sm,
  },

  // Register row
  registerRow: {
    flexDirection: 'row',
    justifyContent:'center',
    alignItems:    'center',
  },
  registerText: {
    color:    Colors.textSecondary,
    fontSize: FontSize.md,
  },
  registerLink: {
    color:      Colors.primary,
    fontSize:   FontSize.md,
    fontWeight: FontWeight.semibold,
  },

  // Footer
  footer: {
    color:     Colors.textMuted,
    fontSize:  FontSize.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
});
