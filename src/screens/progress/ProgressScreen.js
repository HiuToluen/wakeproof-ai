import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import ScreenContainer from '../../components/common/ScreenContainer';
import { useTheme } from '../../hooks/useTheme';

const progressItems = [
  { label: 'Current streak', value: '0 days' },
  { label: 'Total points', value: '0' },
  { label: 'Badges', value: '0' },
];

export default function ProgressScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <ScreenContainer>
      <Text style={styles.heading}>Your Progress</Text>
      <View style={styles.list}>
        {progressItems.map((item) => (
          <View key={item.label} style={styles.card}>
            <Text style={styles.label}>{item.label}</Text>
            <Text style={styles.value}>{item.value}</Text>
          </View>
        ))}
      </View>
    </ScreenContainer>
  );
}

const createStyles = ({ colors, spacing, typography, radius }) =>
  StyleSheet.create({
    heading: {
      ...typography.heading,
      color: colors.textPrimary,
    },
    list: {
      gap: spacing.md,
      marginTop: spacing.xl,
    },
    card: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: radius.lg,
      borderWidth: 1,
      padding: spacing.lg,
    },
    label: {
      ...typography.body,
      color: colors.textSecondary,
    },
    value: {
      ...typography.heading,
      color: colors.textPrimary,
      marginTop: spacing.xs,
    },
  });
