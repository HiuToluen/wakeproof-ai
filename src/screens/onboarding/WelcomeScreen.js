import { Pressable, StyleSheet, Text, View } from 'react-native';

import PrimaryButton from '../../components/common/PrimaryButton';
import ScreenContainer from '../../components/common/ScreenContainer';
import SecondaryButton from '../../components/common/SecondaryButton';
import { colors, spacing, typography } from '../../theme';

export default function WelcomeScreen({ navigation, onContinueAsGuest }) {
  return (
    <ScreenContainer>
      <View style={styles.content}>
        <Text style={styles.title}>WakeProof AI</Text>
        <Text style={styles.subtitle}>Wake up. Prove it. Start your day.</Text>
        <Text style={styles.description}>
          Use the basic alarm features without an account, or sign in to prepare for future synced features.
        </Text>
        <View style={styles.actions}>
          <PrimaryButton title="Continue as Guest" onPress={onContinueAsGuest} />
          <SecondaryButton title="Sign In" onPress={() => navigation.navigate('Login')} />
          <Pressable onPress={() => navigation.navigate('Register')} style={styles.textAction}>
            <Text style={styles.textActionLabel}>Create an account</Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    ...typography.title,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.primary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  description: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  textAction: {
    alignItems: 'center',
    padding: spacing.sm,
  },
  textActionLabel: {
    ...typography.label,
    color: colors.primary,
  },
});
