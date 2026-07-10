import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import AlarmCard from '../../components/alarm/AlarmCard';
import PrimaryButton from '../../components/common/PrimaryButton';
import ScreenContainer from '../../components/common/ScreenContainer';
import { deleteAlarm, duplicateAlarm, getAllAlarms, setAlarmEnabled } from '../../database/alarmRepository';
import { cancelAlarmSchedule, scheduleAlarm } from '../../services/alarmSchedulerService';
import { assertNoActiveAlarmSession } from '../../services/alarmMutationGuard';
import { colors, spacing, typography } from '../../theme';

export default function AlarmListScreen({ navigation }) {
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [openMenuId, setOpenMenuId] = useState(null);

  const loadAlarms = useCallback(async () => { setLoading(true); setError(''); try { setAlarms(await getAllAlarms()); } catch (loadError) { setError(loadError.message); } finally { setLoading(false); } }, []);
  useFocusEffect(useCallback(() => { setOpenMenuId(null); loadAlarms(); return () => setOpenMenuId(null); }, [loadAlarms]));

  const runMenuAction = (action) => { setOpenMenuId(null); action(); };
  const confirmDelete = (alarm) => { setOpenMenuId(null); Alert.alert('Delete alarm?', `Delete "${alarm.title}"?`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { try { await assertNoActiveAlarmSession(); await cancelAlarmSchedule(alarm); await deleteAlarm(alarm.id); await loadAlarms(); } catch (deleteError) { Alert.alert('Unable to delete alarm', deleteError.message); } } }]); };
  const duplicate = async (alarm) => { setOpenMenuId(null); try { await duplicateAlarm(alarm.id); await loadAlarms(); } catch (duplicateError) { Alert.alert('Unable to duplicate alarm', duplicateError.message); } };
  const toggleAlarm = async (alarm, isEnabled) => { try { await assertNoActiveAlarmSession(); setAlarms((current) => current.map((item) => item.id === alarm.id ? { ...item, isEnabled } : item)); if (isEnabled) { await setAlarmEnabled(alarm.id, true); await scheduleAlarm({ ...alarm, isEnabled: true }); } else { await cancelAlarmSchedule(alarm); await setAlarmEnabled(alarm.id, false); } await loadAlarms(); } catch (toggleError) { await setAlarmEnabled(alarm.id, alarm.isEnabled).catch(() => {}); await loadAlarms(); Alert.alert('Unable to update alarm', toggleError.message); } };

  return <ScreenContainer><View style={styles.header}><Text style={styles.heading}>Your Alarms</Text><PrimaryButton title="Add Alarm" onPress={() => navigation.navigate('AlarmForm')} style={styles.addButton} /></View>{loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.message}>Loading alarms...</Text></View> : null}{!loading && error ? <View style={styles.center}><Text style={styles.error}>{error}</Text><PrimaryButton title="Retry" onPress={loadAlarms} style={styles.retry} /></View> : null}{!loading && !error && alarms.length === 0 ? <View style={styles.center}><Text style={styles.emptyTitle}>No alarms yet</Text><Text style={styles.message}>Create your first alarm to start building a stronger wake-up routine.</Text></View> : null}{!loading && !error && alarms.length > 0 ? <FlatList contentContainerStyle={styles.list} data={alarms} keyExtractor={(item) => item.id} renderItem={({ item }) => <AlarmCard alarm={item} menuVisible={openMenuId === item.id} onAdd={() => runMenuAction(() => navigation.navigate('AlarmForm'))} onDelete={() => confirmDelete(item)} onDuplicate={() => duplicate(item)} onEdit={() => navigation.navigate('AlarmForm', { alarmId: item.id })} onMenuClose={() => setOpenMenuId(null)} onMenuOpen={() => setOpenMenuId(item.id)} onPreview={() => runMenuAction(() => navigation.navigate('AlarmPreview', { alarmId: item.id }))} onToggle={(value) => toggleAlarm(item, value)} />} /> : null}</ScreenContainer>;
}

const styles = StyleSheet.create({ header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, heading: { ...typography.heading, color: colors.textPrimary }, addButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, center: { alignItems: 'center', flex: 1, justifyContent: 'center' }, emptyTitle: { ...typography.heading, color: colors.textPrimary }, message: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }, error: { ...typography.body, color: colors.danger, textAlign: 'center' }, retry: { marginTop: spacing.lg }, list: { gap: spacing.md, paddingBottom: spacing.lg, paddingTop: spacing.lg } });
