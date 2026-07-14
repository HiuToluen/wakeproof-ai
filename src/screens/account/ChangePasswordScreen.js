import { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import PrimaryButton from '../../components/common/PrimaryButton';
import ScreenContainer from '../../components/common/ScreenContainer';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../hooks/useTheme';
import { mapFirebaseError } from '../../utils/firebaseErrorMapper';

export default function ChangePasswordScreen({ navigation }) {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const submit = async () => {
    if (submitting) return;
    if (!currentPassword) { setError('Enter your current password.'); return; }
    if (newPassword.length < 6) { setError('New password must be at least 6 characters.'); return; }
    if (newPassword !== confirmPassword) { setError('New passwords do not match.'); return; }
    if (newPassword === currentPassword) { setError('New password must be different from your current password.'); return; }
    setSubmitting(true);
    setError('');
    setMessage('');
    try {
      await changePassword({ currentPassword, newPassword });
      setMessage('Password changed successfully.');
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
        <Text style={styles.heading}>Change Password</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}
        <TextInput
          autoCapitalize="none"
          onChangeText={setCurrentPassword}
          placeholder="Current Password"
          placeholderTextColor={theme.colors.textSecondary}
          secureTextEntry
          style={styles.input}
          value={currentPassword}
        />
        <TextInput
          autoCapitalize="none"
          onChangeText={setNewPassword}
          placeholder="New Password"
          placeholderTextColor={theme.colors.textSecondary}
          secureTextEntry
          style={styles.input}
          value={newPassword}
        />
        <TextInput
          autoCapitalize="none"
          onChangeText={setConfirmPassword}
          placeholder="Confirm New Password"
          placeholderTextColor={theme.colors.textSecondary}
          secureTextEntry
          style={styles.input}
          value={confirmPassword}
        />
        <PrimaryButton title={submitting ? 'Saving...' : 'Change Password'} onPress={submit} disabled={submitting} />
      </View>
    </ScreenContainer>
  );
}

const createStyles = ({ colors, spacing, typography, radius }) => StyleSheet.create({
  content: { flex: 1, justifyContent: 'center' },
  heading: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.lg },
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
  error: { ...typography.body, color: colors.danger, marginBottom: spacing.md },
  success: { ...typography.body, color: colors.success, marginBottom: spacing.md },
});
