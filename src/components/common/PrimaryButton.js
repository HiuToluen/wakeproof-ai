import { useMemo } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useTheme } from '../../hooks/useTheme';

export default function PrimaryButton({ title, onPress, disabled = false, style }) {
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
      backgroundColor: colors.primary,
      borderRadius: radius.md,
      minHeight: 48, // >=44pt touch target
      justifyContent: 'center',
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    pressed: {
      backgroundColor: colors.primaryPressed,
      // subtle physical push without shifting layout bounds
      transform: [{ scale: 0.98 }],
    },
    disabled: {
      opacity: 0.5,
    },
    text: {
      ...typography.label,
      color: colors.onPrimary,
    },
  });
