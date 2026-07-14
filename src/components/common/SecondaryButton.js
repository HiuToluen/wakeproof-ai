import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '../../hooks/useTheme';

export default function SecondaryButton({ title, onPress, disabled = false, style }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, disabled && styles.disabled, style]}
    >
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const createStyles = ({ colors, spacing, typography, radius }) =>
  StyleSheet.create({
    button: {
      alignItems: 'center',
      backgroundColor: colors.surface,
      borderColor: colors.primary,
      borderRadius: radius.md,
      borderWidth: 1,
      minHeight: 48, // >=44pt touch target
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    pressed: {
      backgroundColor: colors.primaryMuted,
    },
    disabled: {
      opacity: 0.5,
    },
    text: {
      ...typography.label,
      color: colors.primary,
    },
  });
