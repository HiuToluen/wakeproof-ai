import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StyleSheet, Text, View } from 'react-native';

import AlarmListScreen from '../screens/alarm/AlarmListScreen';
import ProgressScreen from '../screens/progress/ProgressScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import SleepScreen from '../screens/sleep/SleepScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Alarms: 'A',
  Sleep: 'S',
  Progress: 'P',
  Settings: 'G',
};

function TabIcon({ color, focused, routeName }) {
  return (
    <View style={[styles.icon, { borderColor: color }, focused && styles.focusedIcon]}>
      <Text style={[styles.iconText, { color }]}>{TAB_ICONS[routeName]}</Text>
    </View>
  );
}

export default function MainTabNavigator({ isGuest, onAuthRequested, onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarIcon: ({ color, focused }) => (
          <TabIcon color={color} focused={focused} routeName={route.name} />
        ),
        tabBarInactiveTintColor: colors.textSecondary,
      })}
    >
      <Tab.Screen name="Alarms" component={AlarmListScreen} />
      <Tab.Screen name="Sleep" component={SleepScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Settings">
        {() => <SettingsScreen isGuest={isGuest} onCreateAccount={() => onAuthRequested('Register')} onLogout={onLogout} onSignIn={() => onAuthRequested('Login')} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  icon: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  focusedIcon: {
    backgroundColor: colors.background,
    borderWidth: 2,
  },
  iconText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
