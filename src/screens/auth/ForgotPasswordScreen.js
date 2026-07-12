import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import PrimaryButton from '../../components/common/PrimaryButton';
import ScreenContainer from '../../components/common/ScreenContainer';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, typography } from '../../theme';
import { mapFirebaseError } from '../../utils/firebaseErrorMapper';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) { setError('Enter your email address.'); return; }
    if (!emailPattern.test(normalizedEmail)) { setError('Enter a valid email address.'); return; }
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      await sendPasswordReset(normalizedEmail);
      setMessage('If an account with this email can use password sign-in, a reset email has been sent.');
    } catch (resetError) {
      if (resetError?.code === 'auth/user-not-found') setMessage('If an account with this email can use password sign-in, a reset email has been sent.');
      else setError(mapFirebaseError(resetError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer avoidKeyboard scroll>
      <View style={styles.content}>
        <Text style={styles.heading}>Reset Password</Text>
        <Text style={styles.body}>Enter your email address and we will send password reset instructions if available.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}
        <TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} placeholder="Email" placeholderTextColor={colors.textSecondary} style={styles.input} value={email} />
        <PrimaryButton title={submitting ? 'Sending...' : 'Send Reset Email'} onPress={submit} disabled={submitting} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center' },
  heading: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.md },
  body: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.lg },
  input: { ...typography.body, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.textPrimary, marginBottom: spacing.md, padding: spacing.md },
  error: { ...typography.body, color: colors.danger, marginBottom: spacing.md },
  success: { ...typography.body, color: colors.primary, marginBottom: spacing.md },
});
