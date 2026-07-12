import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { colors, spacing, typography } from '../theme';
import ActiveAlarmNavigator from './ActiveAlarmNavigator';
import AuthNavigator from './AuthNavigator';
import MainStackNavigator from './MainStackNavigator';

export const APP_MODES = {
  WELCOME: 'WELCOME',
  GUEST: 'GUEST',
  AUTHENTICATED: 'AUTHENTICATED',
};

export default function RootNavigator({ activeSession, appMode, authInitialRouteName, onAuthRequested, onContinueAsGuest, onLogout }) {
  const { isAuthenticated, isAuthLoading } = useAuth();

  if (activeSession) {
    return <ActiveAlarmNavigator key={`${activeSession.id}:${activeSession.status}`} session={activeSession} />;
  }

  if (isAuthLoading) {
    return <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.message}>Checking account...</Text></View>;
  }

  if (isAuthenticated || appMode === APP_MODES.GUEST) {
    return <MainStackNavigator isGuest={!isAuthenticated} onAuthRequested={onAuthRequested} onLogout={onLogout} />;
  }

  return <AuthNavigator key={authInitialRouteName} initialRouteName={authInitialRouteName} onContinueAsGuest={onContinueAsGuest} />;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: spacing.lg },
  message: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' },
});
