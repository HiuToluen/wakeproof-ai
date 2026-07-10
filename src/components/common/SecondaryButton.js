import { Pressable, StyleSheet, Text } from 'react-native';

import { colors, spacing, typography } from '../../theme';

export default function SecondaryButton({ title, onPress, disabled = false, style }) {
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

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pressed: {
    backgroundColor: colors.border,
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    ...typography.label,
    color: colors.primary,
  },
});
