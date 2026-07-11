import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRef, useState } from 'react';

import { colors, spacing, typography } from '../../theme';
import { formatNextTrigger } from '../../utils/alarmDateTime';
import { formatTime, getRepeatDaysSummary } from '../../utils/dateTime';

export default function AlarmCard({ alarm, menuVisible, onAdd, onDelete, onDuplicate, onEdit, onMenuClose, onMenuOpen, onPreview, onToggle }) {
  const menuButtonRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ right: spacing.lg, top: 160 });

  const openMenu = () => {
    menuButtonRef.current?.measureInWindow((x, y, width, height) => {
      const window = Dimensions.get('window');
      const menuHeight = 240;
      const opensUp = y > window.height * 0.55 || y + height + menuHeight > window.height - spacing.md;
      setMenuPosition({
        right: Math.max(spacing.md, window.width - x - width),
        top: opensUp ? Math.max(spacing.md, y - menuHeight - spacing.xs) : y + height + spacing.xs,
      });
    });
    onMenuOpen();
  };

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
          <Pressable ref={menuButtonRef} accessibilityLabel="Alarm actions" accessibilityRole="button" onPress={menuVisible ? onMenuClose : openMenu} style={styles.menuButton}>
            <Text style={styles.menuIcon}>⋮</Text>
          </Pressable>
        </View>
      </View>
      <Modal animationType="fade" transparent visible={menuVisible} onRequestClose={onMenuClose}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onMenuClose} />
          <View style={[styles.menu, menuPosition]}><ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
            <MenuAction title="Add New Alarm" onPress={onAdd} />
            <MenuAction title="Preview Alarm" onPress={onPreview} />
            <MenuAction title="Duplicate Alarm" onPress={onDuplicate} />
            <MenuAction danger title="Delete Alarm" onPress={onDelete} />
          </ScrollView></View>
        </View>
      </Modal>
    </View>
  );
}

function MenuAction({ danger = false, onPress, title }) {
  return <Pressable onPress={onPress} style={styles.menuAction}><Text style={[styles.menuText, danger && styles.dangerText]}>{title}</Text></Pressable>;
}

const styles = StyleSheet.create({ card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, padding: spacing.md }, openCard: { zIndex: 20 }, header: { alignItems: 'flex-start', flexDirection: 'row' }, details: { flex: 1, paddingRight: spacing.sm }, actions: { alignItems: 'flex-end' }, time: { ...typography.heading, color: colors.textPrimary }, title: { ...typography.label, color: colors.textPrimary, marginTop: spacing.xs }, meta: { color: colors.textSecondary, marginTop: spacing.sm }, menuButton: { alignItems: 'center', height: 32, justifyContent: 'center', marginTop: spacing.xs, width: 36 }, menuIcon: { color: colors.textPrimary, fontSize: 28, lineHeight: 30 }, backdrop: { flex: 1 }, menu: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, elevation: 6, maxHeight: 240, minWidth: 200, paddingVertical: spacing.sm, position: 'absolute', shadowColor: colors.textPrimary, shadowOffset: { height: 4, width: 0 }, shadowOpacity: 0.12, shadowRadius: 12 }, menuAction: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md }, menuText: { ...typography.label, color: colors.textPrimary }, dangerText: { color: colors.danger } });
