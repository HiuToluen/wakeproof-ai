import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DAYS } from '../../constants/alarmConstants';
import { colors, spacing, typography } from '../../theme';

export default function DaySelector({ selectedDays, onChange }) {
  const toggleDay = (value) => {
    const nextDays = selectedDays.includes(value)
      ? selectedDays.filter((day) => day !== value)
      : [...selectedDays, value].sort((first, second) => first - second);
    onChange(nextDays);
  };

  return (
    <View style={styles.container}>
      {DAYS.map((day) => {
        const selected = selectedDays.includes(day.value);
        return (
          <Pressable
            accessibilityLabel={day.label}
            accessibilityRole="button"
            key={day.value}
            onPress={() => toggleDay(day.value)}
            style={[styles.day, selected && styles.selectedDay]}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]}>{day.shortLabel}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  day: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  selectedDay: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  label: {
    ...typography.label,
    color: colors.textPrimary,
  },
  selectedLabel: {
    color: colors.white,
  },
});
