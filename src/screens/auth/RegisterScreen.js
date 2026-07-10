import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import PrimaryButton from '../../components/common/PrimaryButton';
import ScreenContainer from '../../components/common/ScreenContainer';
import { colors, spacing, typography } from '../../theme';

export default function RegisterScreen({ navigation, onLoginSuccess }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  return (
    <ScreenContainer scroll>
      <View style={styles.content}>
        <Text style={styles.heading}>Create Account</Text>
        <TextInput
          autoCapitalize="words"
          onChangeText={setFullName}
          placeholder="Full name"
          placeholderTextColor={colors.textSecondary}
          style={styles.input}
          value={fullName}
        />
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
        <TextInput
          autoCapitalize="none"
          onChangeText={setConfirmPassword}
          placeholder="Confirm password"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
          style={styles.input}
          value={confirmPassword}
        />
        <View style={styles.actions}>
          <PrimaryButton title="Create Account" onPress={onLoginSuccess} />
          <Pressable onPress={() => navigation.navigate('Login')} style={styles.textAction}>
            <Text style={styles.textActionLabel}>Already have an account? Sign In</Text>
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
    textAlign: 'center',
  },
});
