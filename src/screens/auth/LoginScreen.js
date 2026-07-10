import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import PrimaryButton from '../../components/common/PrimaryButton';
import ScreenContainer from '../../components/common/ScreenContainer';
import SecondaryButton from '../../components/common/SecondaryButton';
import { colors, spacing, typography } from '../../theme';

export default function LoginScreen({ navigation, onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const showGooglePlaceholder = () => {
    Alert.alert('Google Sign-In', 'Google Sign-In will be connected in the Firebase authentication step.');
  };

  return (
    <ScreenContainer scroll>
      <View style={styles.content}>
        <Text style={styles.heading}>Sign In</Text>
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          value={email}
        />
        <TextInput
          autoCapitalize="none"
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
          style={styles.input}
          value={password}
        />
        <View style={styles.actions}>
          <PrimaryButton title="Sign In" onPress={onLoginSuccess} />
          <SecondaryButton title="Continue with Google" onPress={showGooglePlaceholder} />
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
  heading: {
    ...typography.heading,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  actions: {
    gap: spacing.md,
    marginTop: spacing.sm,
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
