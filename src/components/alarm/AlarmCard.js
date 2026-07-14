import { useMemo, useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

import { useTheme } from '../../hooks/useTheme';
import { formatNextTrigger } from '../../utils/alarmDateTime';
import { formatTime, getRepeatDaysSummary } from '../../utils/dateTime';

export default function AlarmCard({ alarm, menuVisible, onAdd, onDelete, onDuplicate, onEdit, onMenuClose, onMenuOpen, onPreview, onToggle }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const menuButtonRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ right: theme.spacing.lg, top: 160 });

  const openMenu = () => {
    menuButtonRef.current?.measureInWindow((x, y, width, height) => {
      const window = Dimensions.get('window');
      const menuHeight = 240;
      const opensUp = y > window.height * 0.55 || y + height + menuHeight > window.height - theme.spacing.md;
      setMenuPosition({
        right: Math.max(theme.spacing.md, window.width - x - width),
        top: opensUp ? Math.max(theme.spacing.md, y - menuHeight - theme.spacing.xs) : y + height + theme.spacing.xs,
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
          <Switch
            onValueChange={onToggle}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            value={alarm.isEnabled}
          />
          <Pressable ref={menuButtonRef} accessibilityLabel="Alarm actions" accessibilityRole="button" onPress={menuVisible ? onMenuClose : openMenu} style={styles.menuButton}>
            <Text style={[styles.menuIcon, { color: theme.colors.textPrimary }]}>⋮</Text>
          </Pressable>
        </View>
      </View>
      <Modal animationType="fade" transparent visible={menuVisible} onRequestClose={onMenuClose}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onMenuClose} />
          <View style={[styles.menu, menuPosition]}><ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
            <MenuAction styles={styles} title="Add New Alarm" onPress={onAdd} />
            <MenuAction styles={styles} title="Preview Alarm" onPress={onPreview} />
            <MenuAction styles={styles} title="Duplicate Alarm" onPress={onDuplicate} />
            <MenuAction styles={styles} danger title="Delete Alarm" onPress={onDelete} />
          </ScrollView></View>
        </View>
      </Modal>
    </View>
  );
}

function MenuAction({ danger = false, onPress, styles, title }) {
  return <Pressable onPress={onPress} style={styles.menuAction}><Text style={[styles.menuText, danger && styles.dangerText]}>{title}</Text></Pressable>;
}

const createStyles = ({ colors, spacing, typography, radius }) => StyleSheet.create({
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md },
  openCard: { zIndex: 20 },
  header: { alignItems: 'flex-start', flexDirection: 'row' },
  details: { flex: 1, paddingRight: spacing.sm },
  actions: { alignItems: 'flex-end' },
  time: { ...typography.heading, color: colors.textPrimary },
  title: { ...typography.label, color: colors.textPrimary, marginTop: spacing.xs },
  meta: { color: colors.textSecondary, marginTop: spacing.sm },
  menuButton: { alignItems: 'center', height: 32, justifyContent: 'center', marginTop: spacing.xs, width: 36 },
  // menuIcon color applied inline from theme.colors.textPrimary (native Text prop)
  menuIcon: { fontSize: 28, lineHeight: 30 },
  // dismiss scrim — uses overlay token (semi-transparent)
  backdrop: { flex: 1, backgroundColor: colors.overlay },
  menu: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    elevation: 6,
    maxHeight: 240,
    minWidth: 200,
    paddingVertical: spacing.sm,
    position: 'absolute',
    shadowColor: colors.textPrimary,
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
  },
  menuAction: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  menuText: { ...typography.label, color: colors.textPrimary },
  dangerText: { color: colors.danger },
});
