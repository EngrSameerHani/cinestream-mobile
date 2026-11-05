// ============================================================
// Register Screen
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
  fullName?: string;
  email?:    string;
  password?: string;
  confirm?:  string;
}

function validate(fullName: string, email: string, password: string, confirm: string): FormErrors {
  const errors: FormErrors = {};
  if (!fullName.trim() || fullName.trim().length < 2)
    errors.fullName = 'Full name must be at least 2 characters';
  if (!email.trim())
    errors.email = 'Email is required';
  else if (!/\S+@\S+\.\S+/.test(email))
    errors.email = 'Enter a valid email address';
  if (!password)
    errors.password = 'Password is required';
  else if (password.length < 8)
    errors.password = 'Password must be at least 8 characters';
  else if (!/(?=.*[A-Za-z])(?=.*\d)/.test(password))
    errors.password = 'Password must contain letters and numbers';
  if (password !== confirm)
    errors.confirm = 'Passwords do not match';
  return errors;
}

// Password strength indicator
function getPasswordStrength(password: string): { label: string; color: string; width: string } {
  if (!password) return { label: '', color: 'transparent', width: '0%' };
  let score = 0;
  if (password.length >= 8)            score++;
  if (/[A-Z]/.test(password))          score++;
  if (/[0-9]/.test(password))          score++;
  if (/[^A-Za-z0-9]/.test(password))   score++;
  const map = [
    { label: 'Weak',      color: Colors.error,   width: '25%' },
    { label: 'Fair',      color: Colors.warning,  width: '50%' },
    { label: 'Good',      color: Colors.info,     width: '75%' },
    { label: 'Strong',    color: Colors.success,  width: '100%' },
  ];
  return map[Math.min(score - 1, 3)] ?? map[0];
}

export default function RegisterScreen() {
  const { signUp, isLoading } = useAuthStore();
  const router = useRouter();

  const [fullName,  setFullName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [errors,    setErrors]    = useState<FormErrors>({});

  const strength = getPasswordStrength(password);

  function clearError(field: keyof FormErrors) {
    setErrors((e) => ({ ...e, [field]: undefined }));
  }

  async function handleRegister() {
    const errs = validate(fullName.trim(), email.trim(), password, confirm);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    try {
      await signUp(email.trim().toLowerCase(), password, fullName.trim());
      Alert.alert(
        'Account Created!',
        'Welcome to CineStream. You can now explore thousands of movies.',
        [{ text: 'Let\'s Go!', style: 'default' }],
      );
      // The auth store listener or index redirect handles navigation
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message ?? 'Unable to create account. Please try again.');
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
            {/* Back button */}
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={22} color={Colors.text} />
            </TouchableOpacity>

            {/* Logo */}
            <View style={styles.logoContainer}>
              <View style={styles.logoBox}>
                <Ionicons name="film" size={32} color={Colors.primary} />
              </View>
              <Text style={styles.logoText}>CINESTREAM</Text>
            </View>

            {/* Card */}
            <View style={styles.card}>
              <Text style={styles.heading}>Create Account</Text>
              <Text style={styles.subheading}>Join millions of movie lovers</Text>

              {/* Perks row */}
              <View style={styles.perks}>
                {['Unlimited movies', 'HD streaming', 'Any device'].map((perk) => (
                  <View key={perk} style={styles.perk}>
                    <Ionicons name="checkmark-circle" size={14} color={Colors.success} />
                    <Text style={styles.perkText}>{perk}</Text>
                  </View>
                ))}
              </View>

              <Input
                label="Full Name"
                value={fullName}
                onChangeText={(t) => { setFullName(t); clearError('fullName'); }}
                error={errors.fullName}
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                placeholder="Jane Doe"
                returnKeyType="next"
              />

              <Input
                label="Email"
                value={email}
                onChangeText={(t) => { setEmail(t); clearError('email'); }}
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
                onChangeText={(t) => { setPassword(t); clearError('password'); clearError('confirm'); }}
                error={errors.password}
                isPassword
                autoComplete="new-password"
                textContentType="newPassword"
                placeholder="At least 8 characters"
                returnKeyType="next"
              />

              {/* Password strength bar */}
              {password.length > 0 && (
                <View style={styles.strengthContainer}>
                  <View style={styles.strengthTrack}>
                    <View style={[styles.strengthFill, { width: strength.width, backgroundColor: strength.color }]} />
                  </View>
                  <Text style={[styles.strengthLabel, { color: strength.color }]}>{strength.label}</Text>
                </View>
              )}

              <Input
                label="Confirm Password"
                value={confirm}
                onChangeText={(t) => { setConfirm(t); clearError('confirm'); }}
                error={errors.confirm}
                isPassword
                autoComplete="new-password"
                textContentType="newPassword"
                placeholder="Repeat your password"
                returnKeyType="done"
                onSubmitEditing={handleRegister}
              />

              <Button
                label="Create Account"
                onPress={handleRegister}
                isLoading={isLoading}
                fullWidth
                size="lg"
                style={styles.registerBtn}
              />

              {/* Sign-in link */}
              <View style={styles.loginRow}>
                <Text style={styles.loginText}>Already have an account? </Text>
                <Link href="/(auth)/login" asChild>
                  <TouchableOpacity>
                    <Text style={styles.loginLink}>Sign in</Text>
                  </TouchableOpacity>
                </Link>
              </View>
            </View>

            {/* Footer */}
            <Text style={styles.footer}>
              By creating an account you agree to our{' '}
              <Text style={styles.footerLink}>Terms of Service</Text> and{' '}
              <Text style={styles.footerLink}>Privacy Policy</Text>.
            </Text>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  safe:     { flex: 1 },
  kav:      { flex: 1 },
  scroll: {
    flexGrow:          1,
    paddingHorizontal: Spacing.lg,
    paddingVertical:   Spacing.xl,
  },
  backBtn: {
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: Colors.surfaceElevated,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    Spacing.xl,
  },
  logoContainer: {
    alignItems:   'center',
    marginBottom: Spacing.xl,
  },
  logoBox: {
    width:           60,
    height:          60,
    borderRadius:    BorderRadius.xl,
    backgroundColor: 'rgba(229,9,20,0.15)',
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    Spacing.sm,
    borderWidth:     1,
    borderColor:     'rgba(229,9,20,0.3)',
  },
  logoText: {
    color:         Colors.text,
    fontSize:      FontSize.xl,
    fontWeight:    FontWeight.black,
    letterSpacing: 5,
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
    fontSize:     FontSize.xxl,
    fontWeight:   FontWeight.bold,
    marginBottom: Spacing.xs,
  },
  subheading: {
    color:        Colors.textMuted,
    fontSize:     FontSize.md,
    marginBottom: Spacing.md,
  },

  // Perks
  perks: {
    flexDirection: 'row',
    gap:           Spacing.md,
    marginBottom:  Spacing.xl,
    flexWrap:      'wrap',
  },
  perk: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           4,
  },
  perkText: {
    color:    Colors.textSecondary,
    fontSize: FontSize.xs,
  },

  // Password strength
  strengthContainer: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           Spacing.sm,
    marginTop:     -Spacing.sm,
    marginBottom:  Spacing.md,
  },
  strengthTrack: {
    flex:            1,
    height:          4,
    backgroundColor: Colors.border,
    borderRadius:    2,
    overflow:        'hidden',
  },
  strengthFill: {
    height:       '100%',
    borderRadius: 2,
  },
  strengthLabel: {
    fontSize:   FontSize.xs,
    fontWeight: FontWeight.semibold,
    minWidth:   42,
  },

  registerBtn: { marginTop: Spacing.sm },

  loginRow: {
    flexDirection:  'row',
    justifyContent: 'center',
    alignItems:     'center',
    marginTop:      Spacing.lg,
  },
  loginText: { color: Colors.textSecondary, fontSize: FontSize.md },
  loginLink: { color: Colors.primary, fontSize: FontSize.md, fontWeight: FontWeight.semibold },

  footer: {
    color:     Colors.textMuted,
    fontSize:  FontSize.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
  footerLink: { color: Colors.textSecondary },
});
