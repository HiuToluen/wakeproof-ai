import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import AlarmCard from '../../components/alarm/AlarmCard';
import PrimaryButton from '../../components/common/PrimaryButton';
import ScreenContainer from '../../components/common/ScreenContainer';
import { deleteAlarm, getAllAlarms, setAlarmEnabled } from '../../database/alarmRepository';
import { colors, spacing, typography } from '../../theme';

export default function AlarmListScreen({ navigation }) {
  const [alarms, setAlarms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAlarms = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setAlarms(await getAllAlarms());
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { loadAlarms(); }, [loadAlarms]));

  const confirmDelete = (alarm) => {
    Alert.alert('Delete alarm?', `Delete "${alarm.title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await deleteAlarm(alarm.id); await loadAlarms(); }
        catch (deleteError) { Alert.alert('Unable to delete alarm', deleteError.message); }
      } },
    ]);
  };

  const toggleAlarm = async (alarm, isEnabled) => {
    setAlarms((current) => current.map((item) => item.id === alarm.id ? { ...item, isEnabled } : item));
    try { await setAlarmEnabled(alarm.id, isEnabled); }
    catch (toggleError) {
      setAlarms((current) => current.map((item) => item.id === alarm.id ? { ...item, isEnabled: alarm.isEnabled } : item));
      Alert.alert('Unable to update alarm', toggleError.message);
    }
  };

  const addButton = <PrimaryButton title="Add Alarm" onPress={() => navigation.navigate('AlarmForm')} style={styles.addButton} />;

  return (
    <ScreenContainer>
      <View style={styles.header}><Text style={styles.heading}>Your Alarms</Text>{addButton}</View>
      {loading ? <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.message}>Loading alarms...</Text></View> : null}
      {!loading && error ? <View style={styles.center}><Text style={styles.error}>{error}</Text><PrimaryButton title="Retry" onPress={loadAlarms} style={styles.retry} /></View> : null}
      {!loading && !error && alarms.length === 0 ? <View style={styles.center}><Text style={styles.emptyTitle}>No alarms yet</Text><Text style={styles.message}>Create your first alarm to start building a stronger wake-up routine.</Text></View> : null}
      {!loading && !error && alarms.length > 0 ? <FlatList contentContainerStyle={styles.list} data={alarms} keyExtractor={(item) => item.id} renderItem={({ item }) => <AlarmCard alarm={item} onDelete={() => confirmDelete(item)} onEdit={() => navigation.navigate('AlarmForm', { alarmId: item.id })} onToggle={(value) => toggleAlarm(item, value)} />} /> : null}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({ header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, heading: { ...typography.heading, color: colors.textPrimary }, addButton: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, center: { alignItems: 'center', flex: 1, justifyContent: 'center' }, emptyTitle: { ...typography.heading, color: colors.textPrimary }, message: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }, error: { ...typography.body, color: colors.danger, textAlign: 'center' }, retry: { marginTop: spacing.lg }, list: { gap: spacing.md, paddingBottom: spacing.lg, paddingTop: spacing.lg } });
