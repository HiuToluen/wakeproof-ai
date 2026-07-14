import { useMemo } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '../../hooks/useTheme';

function formatValue(value, maximum) {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue >= 0 && numericValue <= maximum
    ? String(numericValue).padStart(2, '0')
    : value;
}

export default function TimeInput({ hour, minute, onHourChange, onMinuteChange }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <View style={styles.container}>
      <TextInput
        accessibilityLabel="Hour"
        keyboardType="number-pad"
        maxLength={2}
        onBlur={() => onHourChange(formatValue(hour, 23))}
        onChangeText={onHourChange}
        selectTextOnFocus
        style={styles.input}
        value={hour}
      />
      <Text style={styles.separator}>:</Text>
      <TextInput
        accessibilityLabel="Minute"
        keyboardType="number-pad"
        maxLength={2}
        onBlur={() => onMinuteChange(formatValue(minute, 59))}
        onChangeText={onMinuteChange}
        selectTextOnFocus
        style={styles.input}
        value={minute}
      />
    </View>
  );
}

const createStyles = ({ colors, spacing, typography, radius }) => StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  input: {
    ...typography.heading,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.textPrimary,
    padding: spacing.md,
    textAlign: 'center',
    width: 72,
  },
  separator: {
    ...typography.heading,
    color: colors.textPrimary,
    marginHorizontal: spacing.sm,
  },
});
