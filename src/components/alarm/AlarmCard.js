import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../theme';
import { formatNextTrigger } from '../../utils/alarmDateTime';
import { formatTime, getRepeatDaysSummary } from '../../utils/dateTime';

export default function AlarmCard({ alarm, menuVisible, onAdd, onDelete, onDuplicate, onEdit, onMenuClose, onMenuOpen, onPreview, onToggle }) {
  return (
    <View style={[styles.card, menuVisible && styles.openCard]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" onPress={onEdit} style={styles.details}>
          <Text style={styles.time}>{formatTime(alarm.hour, alarm.minute)}</Text>
          <Text style={styles.title}>{alarm.title}</Text>
          <Text style={styles.meta}>{getRepeatDaysSummary(alarm.repeatDays)}</Text>
          <Text style={styles.meta}>Challenge: {alarm.challengeMode.replaceAll('_', ' ')}</Text>
          {alarm.isEnabled ? <Text style={styles.meta}>{alarm.nextTriggerAt ? `Next: ${formatNextTrigger(alarm.nextTriggerAt)}` : 'Scheduling required'}</Text> : null}
        </Pressable>
        <View style={styles.actions}>
          <Switch onValueChange={onToggle} trackColor={{ false: colors.border, true: colors.primary }} value={alarm.isEnabled} />
          <Pressable accessibilityLabel="Alarm actions" accessibilityRole="button" onPress={menuVisible ? onMenuClose : onMenuOpen} style={styles.menuButton}>
            <Text style={styles.menuIcon}>⋮</Text>
          </Pressable>
          {menuVisible ? <View style={styles.menu}>
            <MenuAction title="Add New Alarm" onPress={onAdd} />
            <MenuAction title="Preview Alarm" onPress={onPreview} />
            <MenuAction title="Duplicate Alarm" onPress={onDuplicate} />
            <MenuAction danger title="Delete Alarm" onPress={onDelete} />
          </View> : null}
        </View>
      </View>
    </View>
  );
}

function MenuAction({ danger = false, onPress, title }) {
  return <Pressable onPress={onPress} style={styles.menuAction}><Text style={[styles.menuText, danger && styles.dangerText]}>{title}</Text></Pressable>;
}

const styles = StyleSheet.create({ card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, padding: spacing.md }, openCard: { zIndex: 20 }, header: { alignItems: 'flex-start', flexDirection: 'row' }, details: { flex: 1, paddingRight: spacing.sm }, actions: { alignItems: 'flex-end', position: 'relative' }, time: { ...typography.heading, color: colors.textPrimary }, title: { ...typography.label, color: colors.textPrimary, marginTop: spacing.xs }, meta: { color: colors.textSecondary, marginTop: spacing.sm }, menuButton: { alignItems: 'center', height: 32, justifyContent: 'center', marginTop: spacing.xs, width: 36 }, menuIcon: { color: colors.textPrimary, fontSize: 28, lineHeight: 30 }, menu: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, elevation: 6, minWidth: 180, paddingVertical: spacing.sm, position: 'absolute', right: 0, shadowColor: colors.textPrimary, shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.12, shadowRadius: 12, top: 72, zIndex: 10 }, menuAction: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }, menuText: { ...typography.label, color: colors.textPrimary }, dangerText: { color: colors.danger } });
