import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AlarmRingingScreen from '../screens/alarm/AlarmRingingScreen';
import AlarmSnoozingScreen from '../screens/alarm/AlarmSnoozingScreen';
import PlaceholderChallengeScreen from '../screens/challenge/PlaceholderChallengeScreen';

const Stack = createNativeStackNavigator();

function getInitialRouteName(status) {
  if (status === 'SNOOZING') return 'AlarmSnoozing';
  if (status === 'CHALLENGE_ACTIVE') return 'PlaceholderChallenge';
  return 'AlarmRinging';
}

export default function ActiveAlarmNavigator({ session }) {
  const params = { alarmId: session.alarmId, sessionId: session.id };
  return (
    <Stack.Navigator initialRouteName={getInitialRouteName(session.status)} screenOptions={{ gestureEnabled: false, headerShown: false }}>
      <Stack.Screen name="AlarmRinging" component={AlarmRingingScreen} initialParams={params} />
      <Stack.Screen name="AlarmSnoozing" component={AlarmSnoozingScreen} initialParams={params} />
      <Stack.Screen name="PlaceholderChallenge" component={PlaceholderChallengeScreen} initialParams={params} />
    </Stack.Navigator>
  );
}
