import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import PrimaryButton from '../../components/common/PrimaryButton';
import ScreenContainer from '../../components/common/ScreenContainer';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { mapFirebaseError } from '../../utils/firebaseErrorMapper';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const validate = () => {
    if (!displayName.trim()) return 'Display name is required.';
    if (displayName.trim().length > 50) return 'Display name must be 50 characters or fewer.';
    if (!emailPattern.test(email.trim().toLowerCase())) return 'Enter a valid email address.';
    if (password.length < 6) return 'Password must be at least 6 characters.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return '';
  };

  const submit = async () => {
    if (submitting) return;
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await register({ displayName, email, password });
    } catch (authError) {
      setError(mapFirebaseError(authError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer avoidKeyboard scroll>
      <View style={styles.content}>
        <Text style={styles.heading}>Create Account</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TextInput
          autoCapitalize="words"
          maxLength={50}
          onChangeText={setDisplayName}
          placeholder="Display Name"
          placeholderTextColor={theme.colors.textSecondary}
          style={styles.input}
          value={displayName}
        />
        <TextInput
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={theme.colors.textSecondary}
          style={styles.input}
          value={email}
        />
        <TextInput
          autoCapitalize="none"
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={theme.colors.textSecondary}
          secureTextEntry
          style={styles.input}
          value={password}
        />
        <TextInput
          autoCapitalize="none"
          onChangeText={setConfirmPassword}
          placeholder="Confirm Password"
          placeholderTextColor={theme.colors.textSecondary}
          secureTextEntry
          style={styles.input}
          value={confirmPassword}
        />
        <View style={styles.actions}>
          <PrimaryButton title={submitting ? 'Creating Account...' : 'Create Account'} onPress={submit} disabled={submitting} />
          <Pressable onPress={() => navigation.navigate('Login')} style={styles.textAction} disabled={submitting}>
            <Text style={styles.textActionLabel}>Already have an account? Sign In</Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

const createStyles = ({ colors, spacing, typography, radius }) => StyleSheet.create({
  content: { flex: 1, justifyContent: 'center' },
  heading: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.lg },
  error: { ...typography.body, color: colors.danger, marginBottom: spacing.md },
  input: {
    ...typography.body,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderWidth: 1,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  actions: { gap: spacing.md, marginTop: spacing.sm },
  textAction: { alignItems: 'center', padding: spacing.sm },
  textActionLabel: { ...typography.label, color: colors.primary, textAlign: 'center' },
});
