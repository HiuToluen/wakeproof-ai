import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DefaultTheme, DarkTheme, NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import PrimaryButton from './src/components/common/PrimaryButton';
import { AuthProvider } from './src/contexts/AuthContext';
import { ThemeProvider } from './src/contexts/ThemeContext';
import { useTheme } from './src/hooks/useTheme';
import { runMigrations } from './src/database/migrations';
import { getActiveAlarmSession } from './src/database/alarmSessionRepository';
import RootNavigator, { APP_MODES } from './src/navigation/RootNavigator';
import { navigationRef } from './src/navigation/navigationRef';
import { reconcileAlarmSchedules } from './src/services/alarmSchedulerService';
import { processAlarmNotificationResponse, restoreAlarmQueue } from './src/services/alarmSessionService';
import { addNotificationReceivedListener, addNotificationResponseListener, clearLastNotificationResponse, configureNotificationHandler, createAndroidAlarmChannel, getLastNotificationResponse, getNotificationPermissionStatus } from './src/services/notificationService';
import { spacing, typography } from './src/theme';

configureNotificationHandler();

function AppContent() {
  const { colors, resolvedScheme } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navTheme = useMemo(() => {
    const base = resolvedScheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.surface,
        text: colors.textPrimary,
        border: colors.border,
        primary: colors.primary,
      },
    };
  }, [resolvedScheme, colors]);

  const [appMode, setAppMode] = useState(APP_MODES.WELCOME); const [authInitialRouteName, setAuthInitialRouteName] = useState('Welcome'); const [databaseState, setDatabaseState] = useState('INITIALIZING'); const [initializationError, setInitializationError] = useState(''); const [pendingResponses, setPendingResponses] = useState([]); const [processingResponse, setProcessingResponse] = useState(false); const [activeSession, setActiveSession] = useState(null); const processedResponses = useRef(new Set()); const activeRefreshRunning = useRef(false);

  const queueResponse = useCallback((response) => {
    const identifier = response?.notification?.request?.identifier;
    if (!identifier || processedResponses.current.has(identifier)) return;
    setAppMode(APP_MODES.GUEST); setPendingResponses((current) => current.some((item) => item.notification.request.identifier === identifier) ? current : [...current, response]);
  }, []);

  const initializeDatabase = useCallback(async () => {
    setDatabaseState('INITIALIZING'); setInitializationError('');
    try {
      await runMigrations();
    } catch (error) {
      setInitializationError(error.message); setDatabaseState('ERROR'); return;
    }
    try {
      await createAndroidAlarmChannel();
      const permission = await getNotificationPermissionStatus();
      if (permission.granted) await reconcileAlarmSchedules();
      const restored = await restoreAlarmQueue();
      if (restored) { setAppMode(APP_MODES.GUEST); setActiveSession(restored); }
    } catch (error) {
      console.error('Alarm scheduling initialization failed:', error);
    }
    setDatabaseState('READY');
  }, []);

  useEffect(() => { initializeDatabase(); }, [initializeDatabase]);
  useEffect(() => {
    if (databaseState !== 'READY') return undefined;
    const receivedSubscription = addNotificationReceivedListener((notification) => queueResponse({ notification }));
    const responseSubscription = addNotificationResponseListener(queueResponse);
    getLastNotificationResponse().then((response) => { if (response) queueResponse(response); }).catch(() => {});
    return () => { receivedSubscription.remove(); responseSubscription.remove(); };
  }, [databaseState, queueResponse]);

  useEffect(() => {
    if (databaseState !== 'READY') return undefined;
    let mounted = true;
    const refreshActiveSession = async () => { if (activeRefreshRunning.current) return; activeRefreshRunning.current = true; try { const session = await getActiveAlarmSession(); if (mounted) { setActiveSession(session); if (session) setAppMode(APP_MODES.GUEST); } } catch {} finally { activeRefreshRunning.current = false; } };
    refreshActiveSession();
    const timer = setInterval(refreshActiveSession, 500);
    return () => { mounted = false; clearInterval(timer); };
  }, [databaseState]);

  useEffect(() => {
    if (pendingResponses.length === 0 || processingResponse || !navigationRef.isReady() || appMode === APP_MODES.WELCOME) return;
    const response = pendingResponses[0];
    const identifier = response.notification.request.identifier;
    setProcessingResponse(true);
    processAlarmNotificationResponse(response).then(() => { processedResponses.current.add(identifier); return clearLastNotificationResponse(); }).catch((error) => console.error('Unable to process alarm notification:', error)).finally(() => { setPendingResponses((current) => current.slice(1)); setProcessingResponse(false); });
  }, [appMode, pendingResponses, processingResponse]);

  let content;
  if (databaseState === 'INITIALIZING') content = <View style={styles.center}><ActivityIndicator color={colors.primary} /><Text style={styles.message}>Preparing WakeProof AI...</Text></View>;
  else if (databaseState === 'ERROR') content = <View style={styles.center}><Text style={styles.error}>Unable to initialize local alarm storage.</Text><Text style={styles.message}>{initializationError}</Text><PrimaryButton title="Retry" onPress={initializeDatabase} style={styles.button} /></View>;
  else content = <AuthProvider><NavigationContainer ref={navigationRef} theme={navTheme} onReady={() => setPendingResponses((responses) => [...responses])}><RootNavigator activeSession={activeSession} appMode={appMode} authInitialRouteName={authInitialRouteName} onAuthRequested={(routeName) => { setAuthInitialRouteName(routeName); setAppMode(APP_MODES.WELCOME); }} onContinueAsGuest={() => setAppMode(APP_MODES.GUEST)} onLogout={() => { setAuthInitialRouteName('Welcome'); setAppMode(APP_MODES.WELCOME); }} /></NavigationContainer></AuthProvider>;

  return <>{content}<StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} /></>;
}

export default function App() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

const createStyles = (colors) => StyleSheet.create({ center: { alignItems: 'center', backgroundColor: colors.background, flex: 1, justifyContent: 'center', padding: spacing.lg }, message: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md, textAlign: 'center' }, error: { ...typography.heading, color: colors.danger, textAlign: 'center' }, button: { marginTop: spacing.lg, minWidth: 160 } });
