import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';
import { formatTime, getRepeatDaysSummary } from '../../utils/dateTime';

export default function AlarmCard({ alarm, onDelete, onEdit, onToggle }) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.details}>
          <Text style={styles.time}>{formatTime(alarm.hour, alarm.minute)}</Text>
          <Text style={styles.title}>{alarm.title}</Text>
        </View>
        <Switch
          onValueChange={onToggle}
          trackColor={{ false: colors.border, true: colors.primary }}
          value={alarm.isEnabled}
        />
      </View>
      <Text style={styles.meta}>{getRepeatDaysSummary(alarm.repeatDays)}</Text>
      <Text style={styles.meta}>Challenge: {alarm.challengeMode.replaceAll('_', ' ')}</Text>
      <View style={styles.actions}>
        <Pressable onPress={onEdit} style={styles.action}>
          <Text style={styles.editText}>Edit</Text>
        </Pressable>
        <Pressable onPress={onDelete} style={styles.action}>
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    padding: spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  details: {
    flex: 1,
  },
  time: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  title: {
    ...typography.label,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  meta: {
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.md,
  },
  action: {
    paddingVertical: spacing.sm,
  },
  editText: {
    ...typography.label,
    color: colors.primary,
  },
  deleteText: {
    ...typography.label,
    color: colors.danger,
  },
});
