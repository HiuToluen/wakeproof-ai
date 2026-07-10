import { useCallback, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import PrimaryButton from './src/components/common/PrimaryButton';
import { runMigrations } from './src/database/migrations';
import RootNavigator, { APP_MODES } from './src/navigation/RootNavigator';
import { colors, spacing, typography } from './src/theme';

export default function App() {
  const [appMode, setAppMode] = useState(APP_MODES.WELCOME);
  const [databaseState, setDatabaseState] = useState('INITIALIZING');
  const [initializationError, setInitializationError] = useState('');

  const initializeDatabase = useCallback(async () => {
    setDatabaseState('INITIALIZING');
    setInitializationError('');
    try {
      await runMigrations();
      setDatabaseState('READY');
    } catch (error) {
      setInitializationError(error.message);
      setDatabaseState('ERROR');
    }
  }, []);

  useEffect(() => {
    initializeDatabase();
  }, [initializeDatabase]);

  let content;
  if (databaseState === 'INITIALIZING') {
    content = <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.message}>Preparing WakeProof AI...</Text></View>;
  } else if (databaseState === 'ERROR') {
    content = <View style={styles.center}><Text style={styles.error}>Unable to initialize local alarm storage.</Text><Text style={styles.message}>{initializationError}</Text><PrimaryButton title="Retry" onPress={initializeDatabase} style={styles.button} /></View>;
  } else {
    content = (
      <NavigationContainer>
        <RootNavigator appMode={appMode} onContinueAsGuest={() => setAppMode(APP_MODES.GUEST)} onLoginSuccess={() => setAppMode(APP_MODES.AUTHENTICATED)} onLogout={() => setAppMode(APP_MODES.WELCOME)} />
      </NavigationContainer>
    );
  }

  return <SafeAreaProvider>{content}<StatusBar style="dark" /></SafeAreaProvider>;
}

const styles = StyleSheet.create({ center: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: spacing.lg }, message: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' }, error: { ...typography.heading, color: colors.danger, textAlign: 'center' }, button: { marginTop: spacing.lg, minWidth: 160 } });
