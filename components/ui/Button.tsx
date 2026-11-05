// ============================================================
// Reusable Button component
// ============================================================

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  TouchableOpacityProps,
} from 'react-native';
import { Colors, BorderRadius, FontSize, FontWeight, Spacing } from '../../constants/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size    = 'sm' | 'md' | 'lg';

interface ButtonProps extends TouchableOpacityProps {
  label:     string;
  variant?:  Variant;
  size?:     Size;
  isLoading?: boolean;
  fullWidth?: boolean;
  style?:    ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  label,
  variant  = 'primary',
  size     = 'md',
  isLoading = false,
  fullWidth = false,
  disabled,
  style,
  textStyle,
  ...rest
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={isDisabled}
      style={[
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {isLoading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'secondary' || variant === 'ghost' ? Colors.text : Colors.text}
        />
      ) : (
        <Text style={[styles.label, styles[`label_${variant}`], styles[`labelSize_${size}`], textStyle]}>
          {label}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius:  BorderRadius.md,
    alignItems:    'center',
    justifyContent:'center',
    flexDirection: 'row',
  },
  fullWidth: { width: '100%' },
  disabled:  { opacity: 0.45 },

  // Variants
  primary:   { backgroundColor: Colors.primary },
  secondary: { backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border },
  ghost:     { backgroundColor: 'transparent' },
  danger:    { backgroundColor: Colors.error },

  // Sizes
  size_sm: { paddingHorizontal: Spacing.md,  paddingVertical: Spacing.xs },
  size_md: { paddingHorizontal: Spacing.lg,  paddingVertical: Spacing.sm + 2 },
  size_lg: { paddingHorizontal: Spacing.xl,  paddingVertical: Spacing.md - 2 },

  // Label base
  label: {
    fontWeight: FontWeight.semibold,
    letterSpacing: 0.3,
  },
  label_primary:   { color: Colors.text },
  label_secondary: { color: Colors.text },
  label_ghost:     { color: Colors.text },
  label_danger:    { color: Colors.text },

  labelSize_sm: { fontSize: FontSize.sm },
  labelSize_md: { fontSize: FontSize.md },
  labelSize_lg: { fontSize: FontSize.lg },
});
