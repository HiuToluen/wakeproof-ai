import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AlarmFormScreen from '../screens/alarm/AlarmFormScreen';
import AlarmPreviewScreen from '../screens/alarm/AlarmPreviewScreen';
import PlaceholderChallengeScreen from '../screens/challenge/PlaceholderChallengeScreen';
import { colors } from '../theme';
import MainTabNavigator from './MainTabNavigator';

const Stack = createNativeStackNavigator();

export default function MainStackNavigator({ isGuest, onLogout }) {
  return (
    <Stack.Navigator screenOptions={{ contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Screen name="MainTabs" options={{ headerShown: false }}>
        {() => <MainTabNavigator isGuest={isGuest} onLogout={onLogout} />}
      </Stack.Screen>
      <Stack.Screen name="AlarmForm" component={AlarmFormScreen} options={({ route }) => ({ title: route.params?.alarmId ? 'Edit Alarm' : 'Add Alarm' })} />
      <Stack.Screen name="AlarmPreview" component={AlarmPreviewScreen} options={{ gestureEnabled: false, headerShown: false }} />
      <Stack.Screen name="ChallengePreview" component={PlaceholderChallengeScreen} options={{ gestureEnabled: false, headerShown: false }} />
    </Stack.Navigator>
  );
}
