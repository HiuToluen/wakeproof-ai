import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import AlarmListScreen from '../screens/alarm/AlarmListScreen';
import ProgressScreen from '../screens/progress/ProgressScreen';
import SettingsScreen from '../screens/settings/SettingsScreen';
import SleepScreen from '../screens/sleep/SleepScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

export default function MainTabNavigator({ isGuest, onLogout }) {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
      }}
    >
      <Tab.Screen name="Alarms" component={AlarmListScreen} />
      <Tab.Screen name="Sleep" component={SleepScreen} />
      <Tab.Screen name="Progress" component={ProgressScreen} />
      <Tab.Screen name="Settings">
        {() => <SettingsScreen isGuest={isGuest} onLogout={onLogout} />}
      </Tab.Screen>
    </Tab.Navigator>
  );
}
