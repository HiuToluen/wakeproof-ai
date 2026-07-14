import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import AlarmListScreen from '../screens/alarm/AlarmListScreen';
import ProgressScreen from '../screens/progress/ProgressScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import SleepScreen from '../screens/sleep/SleepScreen';
import { useTheme } from '../hooks/useTheme';

const Tab = createBottomTabNavigator();

// Vector icon per tab (filled when focused, outline otherwise).
const TAB_ICONS = {
  Alarms: { active: 'alarm', inactive: 'alarm-outline' },
  Sleep: { active: 'moon', inactive: 'moon-outline' },
  Progress: { active: 'stats-chart', inactive: 'stats-chart-outline' },
  Settings: { active: 'settings', inactive: 'settings-outline' },
};

export default function MainTabNavigator({ isGuest, onAuthRequested, onLogout }) {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textTertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarIcon: ({ color, focused, size }) => {
          const icon = TAB_ICONS[route.name];
          return <Ionicons color={color} name={focused ? icon.active : icon.inactive} size={size ?? 24} />;
        },
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
