import { useMemo } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../hooks/useTheme';

export default function ScreenContainer({ children, avoidKeyboard = false, scroll = false }) {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const content = scroll ? (
    <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  ) : (
    <View style={styles.content}>{children}</View>
  );

  if (avoidKeyboard) {
    return <SafeAreaView style={styles.safeArea}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboard}>{content}</KeyboardAvoidingView></SafeAreaView>;
  }

  return <SafeAreaView style={styles.safeArea}>{content}</SafeAreaView>;
}

const createStyles = ({ colors, spacing }) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      padding: spacing.lg,
    },
    keyboard: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      padding: spacing.lg,
    },
  });
