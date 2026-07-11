import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AlarmRingingScreen from '../screens/alarm/AlarmRingingScreen';
import AlarmSnoozingScreen from '../screens/alarm/AlarmSnoozingScreen';
import CameraChallengeScreen from '../screens/challenge/CameraChallengeScreen';
import ChallengeInstructionScreen from '../screens/challenge/ChallengeInstructionScreen';
import ChallengePreviewScreen from '../screens/challenge/ChallengePreviewScreen';
import ChallengeVerificationScreen from '../screens/challenge/ChallengeVerificationScreen';

const Stack = createNativeStackNavigator();

function getInitialRouteName(status) {
  if (status === 'SNOOZING') return 'AlarmSnoozing';
  if (status === 'CHALLENGE_ACTIVE') return 'ChallengeInstruction';
  return 'AlarmRinging';
}

export default function ActiveAlarmNavigator({ session }) {
  const params = { alarmId: session.alarmId, sessionId: session.id };
  return (
    <Stack.Navigator initialRouteName={getInitialRouteName(session.status)} screenOptions={{ gestureEnabled: false, headerShown: false }}>
      <Stack.Screen name="AlarmRinging" component={AlarmRingingScreen} initialParams={params} />
      <Stack.Screen name="AlarmSnoozing" component={AlarmSnoozingScreen} initialParams={params} />
      <Stack.Screen name="ChallengeInstruction" component={ChallengeInstructionScreen} initialParams={params} />
      <Stack.Screen name="CameraChallenge" component={CameraChallengeScreen} initialParams={params} />
      <Stack.Screen name="ChallengePreview" component={ChallengePreviewScreen} initialParams={params} />
      <Stack.Screen name="ChallengeVerification" component={ChallengeVerificationScreen} initialParams={params} />
    </Stack.Navigator>
  );
}
