import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, FontSize, BorderRadius, Spacing, FontWeight } from '../../constants/theme';

type BadgeVariant = 'rating' | 'category' | 'status' | 'year';

interface Props {
  label:    string;
  variant?: BadgeVariant;
  style?:   ViewStyle;
}

export function Badge({ label, variant = 'category', style }: Props) {
  return (
    <View style={[styles.base, styles[variant], style]}>
      <Text style={[styles.text, styles[`text_${variant}`]]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius:    BorderRadius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical:  2,
    alignSelf:       'flex-start',
  },
  rating: {
    backgroundColor: Colors.ratingBg,
    borderWidth:     1,
    borderColor:     Colors.ratingBorder,
  },
  category: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth:     1,
    borderColor:     Colors.border,
  },
  status: {
    backgroundColor: 'rgba(34,197,94,0.15)',
    borderWidth:     1,
    borderColor:     Colors.success,
  },
  year: {
    backgroundColor: Colors.surfaceElevated,
  },

  text: {
    fontSize:    FontSize.xs,
    fontWeight:  FontWeight.semibold,
    letterSpacing: 0.4,
  },
  text_rating:   { color: Colors.primary },
  text_category: { color: Colors.textSecondary },
  text_status:   { color: Colors.success },
  text_year:     { color: Colors.textSecondary },
});
