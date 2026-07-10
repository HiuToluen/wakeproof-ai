import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import DaySelector from '../../components/alarm/DaySelector';
import TimeInput from '../../components/alarm/TimeInput';
import PrimaryButton from '../../components/common/PrimaryButton';
import ScreenContainer from '../../components/common/ScreenContainer';
import { CHALLENGE_MODES, DEFAULT_RINGTONE_ID, RINGTONES } from '../../constants/alarmConstants';
import { createAlarm, disableAlarmAndClearSchedule, getAlarmById, updateAlarm } from '../../database/alarmRepository';
import { previewRingtone, releaseAlarmAudio } from '../../services/alarmAudioService';
import { cancelAlarmSchedule, scheduleAlarm } from '../../services/alarmSchedulerService';
import { assertNoActiveAlarmSession } from '../../services/alarmMutationGuard';
import { colors, spacing, typography } from '../../theme';

const defaults = { title: 'Wake up', hour: '07', minute: '00', repeatDays: [], isEnabled: true, snoozeDuration: '5', maxSnooze: '2', challengeMode: CHALLENGE_MODES.RANDOM, ringtoneId: DEFAULT_RINGTONE_ID };

export default function AlarmFormScreen({ navigation, route }) {
  const alarmId = route.params?.alarmId;
  const [form, setForm] = useState(defaults);
  const [createdAt, setCreatedAt] = useState(null);
  const [loading, setLoading] = useState(Boolean(alarmId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!alarmId) return;
    getAlarmById(alarmId).then((alarm) => {
      if (!alarm) throw new Error('Alarm not found.');
      setForm({ ...alarm, hour: String(alarm.hour).padStart(2, '0'), minute: String(alarm.minute).padStart(2, '0'), snoozeDuration: String(alarm.snoozeDuration), maxSnooze: String(alarm.maxSnooze) });
      setCreatedAt(alarm.createdAt);
    }).catch((loadError) => setError(loadError.message)).finally(() => setLoading(false));
  }, [alarmId]);

  useEffect(() => () => { releaseAlarmAudio().catch(() => {}); }, []);

  const selectRingtone = async (ringtoneId) => {
    updateField('ringtoneId', ringtoneId);
    try { await previewRingtone(ringtoneId); }
    catch (audioError) { Alert.alert('Unable to preview ringtone', audioError.message); }
  };

  const updateField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const validate = () => {
    const hour = Number(form.hour); const minute = Number(form.minute); const snooze = Number(form.snoozeDuration); const maxSnooze = Number(form.maxSnooze);
    if (!form.title.trim()) return 'Title is required.';
    if (form.title.trim().length > 50) return 'Title must be 50 characters or fewer.';
    if (!Number.isInteger(hour) || hour < 0 || hour > 23) return 'Hour must be between 0 and 23.';
    if (!Number.isInteger(minute) || minute < 0 || minute > 59) return 'Minute must be between 0 and 59.';
    if (!Number.isInteger(snooze) || snooze < 1 || snooze > 10) return 'Snooze duration must be between 1 and 10 minutes.';
    if (!Number.isInteger(maxSnooze) || maxSnooze < 0 || maxSnooze > 2) return 'Maximum snooze count must be between 0 and 2.';
    if (!Object.values(CHALLENGE_MODES).includes(form.challengeMode)) return 'Select a valid challenge mode.';
    if (!RINGTONES.some((ringtone) => ringtone.id === form.ringtoneId)) return 'Select a valid ringtone.';
    return '';
  };

  const save = async () => {
    if (saving) return;
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setSaving(true); setError('');
    const now = new Date().toISOString();
    const alarm = { ...form, isEnabled: true, title: form.title.trim(), hour: Number(form.hour), minute: Number(form.minute), snoozeDuration: Number(form.snoozeDuration), maxSnooze: Number(form.maxSnooze), createdAt: createdAt || now, updatedAt: now };
    try {
      await assertNoActiveAlarmSession();
      const previousAlarm = alarmId ? await getAlarmById(alarmId) : null;
      if (previousAlarm?.notificationId) await cancelAlarmSchedule(previousAlarm);
      const savedAlarm = alarmId
        ? await updateAlarm(alarmId, { ...alarm, notificationId: null, nextTriggerAt: null })
        : await createAlarm({ ...alarm, id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`, notificationId: null, nextTriggerAt: null });
      if (savedAlarm.isEnabled) {
        try {
          await scheduleAlarm(savedAlarm);
        } catch (scheduleError) {
          await disableAlarmAndClearSchedule(savedAlarm.id);
          Alert.alert('Alarm saved but disabled', scheduleError.message);
        }
      }
      navigation.goBack();
    } catch (saveError) { Alert.alert('Unable to save alarm', saveError.message); setSaving(false); }
  };

  if (loading) return <ScreenContainer><Text style={styles.message}>Loading alarm...</Text></ScreenContainer>;
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
      <ScreenContainer scroll>
        <Text style={styles.heading}>{alarmId ? 'Edit Alarm' : 'Add Alarm'}</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.label}>Title</Text><TextInput maxLength={50} onChangeText={(value) => updateField('title', value)} style={styles.input} value={form.title} />
        <Text style={styles.label}>Time</Text><TimeInput hour={form.hour} minute={form.minute} onHourChange={(value) => updateField('hour', value)} onMinuteChange={(value) => updateField('minute', value)} />
        <Text style={styles.label}>Repeat days</Text><DaySelector selectedDays={form.repeatDays} onChange={(value) => updateField('repeatDays', value)} />
        <Text style={styles.label}>Snooze duration (minutes)</Text><TextInput keyboardType="number-pad" onChangeText={(value) => updateField('snoozeDuration', value)} style={styles.input} value={form.snoozeDuration} />
        <Text style={styles.label}>Maximum snooze count</Text><TextInput keyboardType="number-pad" onChangeText={(value) => updateField('maxSnooze', value)} style={styles.input} value={form.maxSnooze} />
        <Text style={styles.label}>Ringtone</Text>
        <Text style={styles.message}>Tap a ringtone to select and preview it.</Text>
        <View style={styles.options}>{RINGTONES.map((ringtone) => <Pressable key={ringtone.id} onPress={() => selectRingtone(ringtone.id)} style={[styles.option, form.ringtoneId === ringtone.id && styles.selectedOption]}><Text style={[styles.optionText, form.ringtoneId === ringtone.id && styles.selectedOptionText]}>{ringtone.label}</Text></Pressable>)}</View>
        <Text style={styles.label}>Challenge mode</Text>
        <View style={styles.options}>{Object.values(CHALLENGE_MODES).map((mode) => <Pressable key={mode} onPress={() => updateField('challengeMode', mode)} style={[styles.option, form.challengeMode === mode && styles.selectedOption]}><Text style={[styles.optionText, form.challengeMode === mode && styles.selectedOptionText]}>{mode.replaceAll('_', ' ')}</Text></Pressable>)}</View>
        <PrimaryButton disabled={saving} onPress={save} title={saving ? 'Saving...' : 'Save Alarm'} style={styles.save} />
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 }, heading: { ...typography.heading, color: colors.textPrimary }, message: { ...typography.body, color: colors.textSecondary }, error: { ...typography.body, color: colors.danger, marginTop: spacing.md }, label: { ...typography.label, color: colors.textPrimary, marginBottom: spacing.sm, marginTop: spacing.lg }, input: { ...typography.body, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.textPrimary, padding: spacing.md }, options: { gap: spacing.sm }, option: { borderColor: colors.border, borderRadius: 12, borderWidth: 1, padding: spacing.md }, selectedOption: { backgroundColor: colors.primary, borderColor: colors.primary }, optionText: { color: colors.textPrimary }, selectedOptionText: { color: colors.white }, switchRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, save: { marginTop: spacing.xl } });
