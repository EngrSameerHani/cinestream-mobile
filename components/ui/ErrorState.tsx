import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, FontWeight } from '../../constants/theme';
import { Button } from './Button';

interface Props {
  message?:   string;
  onRetry?:   () => void;
}

export function ErrorState({ message = 'Something went wrong.', onRetry }: Props) {
  return (
    <View style={styles.container}>
      <Ionicons name="alert-circle-outline" size={48} color={Colors.error} />
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Button label="Try Again" onPress={onRetry} variant="secondary" size="sm" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex:            1,
    backgroundColor: Colors.background,
    alignItems:      'center',
    justifyContent:  'center',
    padding:         Spacing.xl,
    gap:             Spacing.md,
  },
  message: {
    color:     Colors.textSecondary,
    fontSize:  FontSize.md,
    textAlign: 'center',
    fontWeight: FontWeight.medium,
  },
});
