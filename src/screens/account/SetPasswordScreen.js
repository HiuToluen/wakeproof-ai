import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import PrimaryButton from '../../components/common/PrimaryButton';
import ScreenContainer from '../../components/common/ScreenContainer';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, typography } from '../../theme';
import { mapFirebaseError } from '../../utils/firebaseErrorMapper';

export default function SetPasswordScreen({ navigation }) {
  const { setPassword } = useAuth();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;
    if (newPassword.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return; }
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      await setPassword(newPassword);
      setMessage('Password sign-in is now connected to this account.');
      setTimeout(() => navigation.goBack(), 700);
    } catch (passwordError) {
      setError(mapFirebaseError(passwordError));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer avoidKeyboard scroll>
      <View style={styles.content}>
        <Text style={styles.heading}>Set Password</Text>
        <Text style={styles.body}>Add Email & Password sign-in to this account without changing your WakeProof AI user ID.</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}
        <TextInput autoCapitalize="none" onChangeText={setNewPassword} placeholder="New Password" placeholderTextColor={colors.textSecondary} secureTextEntry style={styles.input} value={newPassword} />
        <TextInput autoCapitalize="none" onChangeText={setConfirmPassword} placeholder="Confirm Password" placeholderTextColor={colors.textSecondary} secureTextEntry style={styles.input} value={confirmPassword} />
        <PrimaryButton title={submitting ? 'Saving...' : 'Set Password'} onPress={submit} disabled={submitting} />
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
