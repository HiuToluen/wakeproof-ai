import { StyleSheet, Text, View } from 'react-native';

import PrimaryButton from '../../components/common/PrimaryButton';
import ScreenContainer from '../../components/common/ScreenContainer';
import { colors, spacing, typography } from '../../theme';

const settingEntries = ['Account', 'Subscription', 'Alarm preferences', 'Notification settings'];

export default function SettingsScreen({ isGuest, onLogout }) {
  return (
    <ScreenContainer>
      <Text style={styles.heading}>Settings</Text>
      <Text style={styles.mode}>{isGuest ? 'Guest mode' : 'Signed in'}</Text>
      <View style={styles.list}>
        {settingEntries.map((entry) => (
          <View key={entry} style={styles.row}>
            <Text style={styles.rowText}>{entry}</Text>
          </View>
        ))}
      </View>
      <Text style={styles.notice}>WakeProof currently uses local notifications for alarm delivery. Device battery optimization or force-stopping the app may affect alarm timing.</Text>
      <PrimaryButton
        title={isGuest ? 'Return to Welcome' : 'Sign Out'}
        onPress={onLogout}
        style={styles.button}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heading: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  mode: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  list: {
    marginTop: spacing.xl,
  },
  row: {
    backgroundColor: colors.surface,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    padding: spacing.md,
  },
  rowText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  notice: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.lg,
  },
  button: {
    marginTop: spacing.xl,
  },
});
