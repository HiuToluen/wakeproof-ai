import { StyleSheet, Text, View } from 'react-native';

import ScreenContainer from '../../components/common/ScreenContainer';
import { colors, spacing, typography } from '../../theme';

export default function SleepScreen() {
  return (
    <ScreenContainer>
      <Text style={styles.heading}>Sleep Cycle</Text>
      <Text style={styles.description}>
        Personalized sleep-time recommendations will appear here as you build your routine.
      </Text>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Recommended bedtime</Text>
        <Text style={styles.cardValue}>Not available yet</Text>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heading: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: spacing.xl,
    padding: spacing.lg,
  },
  cardLabel: {
    ...typography.label,
    color: colors.textPrimary,
  },
  cardValue: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
});
