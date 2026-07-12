import { Image, StyleSheet, Text, TextInput, View } from 'react-native';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';

import PrimaryButton from '../../components/common/PrimaryButton';
import ScreenContainer from '../../components/common/ScreenContainer';
import SecondaryButton from '../../components/common/SecondaryButton';
import { useAuth } from '../../contexts/AuthContext';
import { colors, spacing, typography } from '../../theme';
import { mapFirebaseError } from '../../utils/firebaseErrorMapper';

export default function SettingsScreen({ isGuest, onCreateAccount, onLogout, onSignIn }) {
  const navigation = useNavigation();
  const { hasGoogleProvider, hasPasswordProvider, linkGoogleAccount, user, userProfile, logout, updateDisplayName } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState(userProfile?.displayName || user?.displayName || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);

  const profile = userProfile || {};
  const isAuthenticated = Boolean(user);

  const submitDisplayName = async () => {
    if (loading) return;
    const normalizedName = displayName.trim();
    if (!normalizedName) { setError('Display name is required.'); return; }
    if (normalizedName.length > 50) { setError('Display name must be 50 characters or fewer.'); return; }
    setError('');
    setLoading(true);
    try {
      await updateDisplayName(normalizedName);
      setIsEditing(false);
    } catch (profileError) {
      setError(mapFirebaseError(profileError));
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    if (loading) return;
    setLoading(true);
    try {
      await logout();
      onLogout();
    } catch (signOutError) {
      setError(mapFirebaseError(signOutError));
    } finally {
      setLoading(false);
    }
  };

  const linkGoogle = async () => {
    if (linkingGoogle) return;
    setLinkingGoogle(true);
    setError('');
    try {
      await linkGoogleAccount();
    } catch (linkError) {
      setError(mapFirebaseError(linkError));
    } finally {
      setLinkingGoogle(false);
    }
  };

  return (
    <ScreenContainer avoidKeyboard scroll>
      <Text style={styles.heading}>Settings</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {isAuthenticated ? (
        <View style={styles.card}>
          {profile.photoURL ? <Image source={{ uri: profile.photoURL }} style={styles.avatar} /> : null}
          <Text style={styles.name}>{profile.displayName || user.displayName || 'WakeProof User'}</Text>
          <Text style={styles.value}>{profile.email || user.email}</Text>
          <Text style={styles.value}>Provider: {profile.authProvider || 'password'}</Text>
          <Text style={styles.value}>Plan: {profile.plan || 'FREE'}</Text>
          <Text style={styles.value}>Subscription: {profile.subscriptionStatus || 'INACTIVE'}</Text>
          {profile.profileLoadError ? <Text style={styles.error}>Profile could not be loaded. Showing account fallback.</Text> : null}
          {isEditing ? (
            <View style={styles.editBox}>
              <TextInput maxLength={50} onChangeText={setDisplayName} placeholder="Display Name" placeholderTextColor={colors.textSecondary} style={styles.input} value={displayName} />
              <PrimaryButton title={loading ? 'Saving...' : 'Save Display Name'} onPress={submitDisplayName} disabled={loading} />
              <SecondaryButton title="Cancel" onPress={() => setIsEditing(false)} disabled={loading} />
            </View>
          ) : (
            <PrimaryButton title="Edit Display Name" onPress={() => setIsEditing(true)} style={styles.button} />
          )}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sign-in Methods</Text>
            <Text style={styles.value}>Google — {hasGoogleProvider ? 'Connected' : 'Not connected'}</Text>
            {!hasGoogleProvider ? <SecondaryButton title={linkingGoogle ? 'Linking Google...' : 'Link Google Account'} onPress={linkGoogle} disabled={linkingGoogle} style={styles.button} /> : null}
            <Text style={styles.value}>Email & Password — {hasPasswordProvider ? 'Connected' : 'Not connected'}</Text>
            {hasPasswordProvider ? <SecondaryButton title="Change Password" onPress={() => navigation.navigate('ChangePassword')} style={styles.button} /> : <SecondaryButton title="Set Password" onPress={() => navigation.navigate('SetPassword')} style={styles.button} />}
          </View>
          <SecondaryButton title={loading ? 'Signing Out...' : 'Sign Out'} onPress={signOut} disabled={loading} style={styles.button} />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.name}>Guest</Text>
          <Text style={styles.value}>Sign in to access account and premium features.</Text>
          <PrimaryButton title="Sign In" onPress={onSignIn} style={styles.button} />
          <SecondaryButton title="Create Account" onPress={onCreateAccount} style={styles.button} />
          <SecondaryButton title="Return to Welcome" onPress={onLogout} style={styles.button} />
        </View>
      )}
      <Text style={styles.notice}>WakeProof currently uses local notifications for alarm delivery. Device battery optimization or force-stopping the app may affect alarm timing.</Text>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  heading: { ...typography.heading, color: colors.textPrimary },
  card: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: 16, borderWidth: 1, marginTop: spacing.lg, padding: spacing.md },
  avatar: { borderRadius: 32, height: 64, marginBottom: spacing.md, width: 64 },
  name: { ...typography.heading, color: colors.textPrimary },
  section: { borderTopColor: colors.border, borderTopWidth: 1, marginTop: spacing.lg, paddingTop: spacing.md },
  sectionTitle: { ...typography.label, color: colors.textPrimary, marginBottom: spacing.sm },
  value: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  editBox: { gap: spacing.md, marginTop: spacing.md },
  input: { ...typography.body, backgroundColor: colors.background, borderColor: colors.border, borderRadius: 12, borderWidth: 1, color: colors.textPrimary, padding: spacing.md },
  error: { ...typography.body, color: colors.danger, marginTop: spacing.md },
  notice: { ...typography.body, color: colors.textSecondary, marginTop: spacing.lg },
  button: { marginTop: spacing.md },
});
