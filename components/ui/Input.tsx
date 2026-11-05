// ============================================================
// Reusable text input with label + error state
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, BorderRadius, Spacing, FontWeight } from '../../constants/theme';

interface InputProps extends TextInputProps {
  label?:        string;
  error?:        string;
  containerStyle?: ViewStyle;
  isPassword?:   boolean;
}

export function Input({
  label,
  error,
  containerStyle,
  isPassword = false,
  style,
  ...rest
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View style={[styles.inputWrapper, error ? styles.inputError : null]}>
        <TextInput
          style={[styles.input, style]}
          placeholderTextColor={Colors.textMuted}
          selectionColor={Colors.primary}
          secureTextEntry={isPassword && !showPassword}
          autoCapitalize={isPassword ? 'none' : rest.autoCapitalize}
          {...rest}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setShowPassword((p) => !p)}
            style={styles.eyeButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    color:        Colors.textSecondary,
    fontSize:     FontSize.sm,
    fontWeight:   FontWeight.medium,
    marginBottom: Spacing.xs,
    letterSpacing: 0.3,
  },
  inputWrapper: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: Colors.surfaceElevated,
    borderRadius:    BorderRadius.md,
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  inputError: {
    borderColor: Colors.error,
  },
  input: {
    flex:            1,
    color:           Colors.text,
    fontSize:        FontSize.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    minHeight:       48,
  },
  eyeButton: {
    paddingHorizontal: Spacing.md,
  },
  errorText: {
    color:      Colors.error,
    fontSize:   FontSize.xs,
    marginTop:  Spacing.xs,
  },
});
