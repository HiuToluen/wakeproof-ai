import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';

function formatValue(value, maximum) {
  const numericValue = Number(value);
  return Number.isInteger(numericValue) && numericValue >= 0 && numericValue <= maximum
    ? String(numericValue).padStart(2, '0')
    : value;
}

export default function TimeInput({ hour, minute, onHourChange, onMinuteChange }) {
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

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  input: {
    ...typography.heading,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
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
