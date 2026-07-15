import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DAYS } from '../../constants/alarmConstants';
import { useTheme } from '../../hooks/useTheme';

export default function DaySelector({ selectedDays, onChange }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const selectedDaySet = useMemo(() => new Set(selectedDays), [selectedDays]);

  const toggleDay = (value) => {
    const nextDays = selectedDaySet.has(value)
      ? selectedDays.filter((day) => day !== value)
      : [...selectedDays, value].sort((first, second) => first - second);
    onChange(nextDays);
  };

  return (
    <View style={styles.container}>
      {DAYS.map((day) => {
        const selected = selectedDaySet.has(day.value);
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

const createStyles = ({ colors, spacing, typography }) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  day: {
    alignItems: 'center',
    borderColor: colors.border,
    // 20 doesn't map to a radius token — kept as literal for circular appearance on 40×40 chip
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
    color: colors.onPrimary,
  },
});
