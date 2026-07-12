import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import PrimaryButton from '../../components/common/PrimaryButton';
import ScreenContainer from '../../components/common/ScreenContainer';
import SecondaryButton from '../../components/common/SecondaryButton';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, typography } from '../../theme';
import { mapFirebaseError, isGoogleCancelError } from '../../utils/firebaseErrorMapper';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen({ navigation, onContinueAsGuest }) {
  const { login, loginWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loadingAction, setLoadingAction] = useState('');

  const validate = () => {
    if (!email.trim()) return 'Enter your email address.';
    if (!emailPattern.test(email.trim().toLowerCase())) return 'Enter a valid email address.';
    if (!password) return 'Enter your password.';
    return '';
  };

  const submitEmail = async () => {
    if (loadingAction) return;
    const validationError = validate();
    if (validationError) { setError(validationError); return; }
    setError('');
    setLoadingAction('email');
    try {
      await login({ email, password });
    } catch (authError) {
      setError(mapFirebaseError(authError));
    } finally {
      setLoadingAction('');
    }
  };

  const submitGoogle = async () => {
    if (loadingAction) return;
    setError('');
    setLoadingAction('google');
    try {
      await loginWithGoogle();
    } catch (authError) {
      if (!isGoogleCancelError(authError)) setError(mapFirebaseError(authError));
    } finally {
      setLoadingAction('');
    }
  };

  return (
    <ScreenContainer avoidKeyboard scroll>
      <View style={styles.content}>
        <Text style={styles.heading}>Sign In</Text>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <TextInput autoCapitalize="none" autoComplete="email" keyboardType="email-address" onChangeText={setEmail} placeholder="Email" placeholderTextColor={colors.textSecondary} style={styles.input} value={email} />
        <TextInput autoCapitalize="none" onChangeText={setPassword} placeholder="Password" placeholderTextColor={colors.textSecondary} secureTextEntry style={styles.input} value={password} />
        <View style={styles.actions}>
          <PrimaryButton title={loadingAction === 'email' ? 'Signing In...' : 'Sign In'} onPress={submitEmail} disabled={Boolean(loadingAction)} />
          <SecondaryButton title={loadingAction === 'google' ? 'Connecting...' : 'Continue with Google'} onPress={submitGoogle} disabled={Boolean(loadingAction)} />
          <SecondaryButton title="Continue as Guest" onPress={onContinueAsGuest} disabled={Boolean(loadingAction)} />
          <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={styles.textAction} disabled={Boolean(loadingAction)}>
            <Text style={styles.textActionLabel}>Forgot Password?</Text>
          </Pressable>
          <Pressable onPress={() => navigation.navigate('Register')} style={styles.textAction} disabled={Boolean(loadingAction)}>
            <Text style={styles.textActionLabel}>Create an account</Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, justifyContent: 'center' },
  heading: { ...typography.heading, color: colors.textPrimary, marginBottom: spacing.lg },
  error: { ...typography.body, color: colors.danger, marginBottom: spacing.md },
  input: { ...typography.body, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.textPrimary, marginBottom: spacing.md, padding: spacing.md },
  actions: { gap: spacing.md, marginTop: spacing.sm },
  textAction: { alignItems: 'center', padding: spacing.sm },
  textActionLabel: { ...typography.label, color: colors.primary },
});
