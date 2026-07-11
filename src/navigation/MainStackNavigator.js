import { createNativeStackNavigator } from '@react-navigation/native-stack';

import AlarmFormScreen from '../screens/alarm/AlarmFormScreen';
import AlarmPreviewScreen from '../screens/alarm/AlarmPreviewScreen';
import CameraChallengeScreen from '../screens/challenge/CameraChallengeScreen';
import ChallengeInstructionScreen from '../screens/challenge/ChallengeInstructionScreen';
import ChallengePreviewScreen from '../screens/challenge/ChallengePreviewScreen';
import ChallengeVerificationScreen from '../screens/challenge/ChallengeVerificationScreen';
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
      <Stack.Screen name="PreviewChallengeInstruction" component={ChallengeInstructionScreen} options={{ gestureEnabled: false, headerShown: false }} />
      <Stack.Screen name="PreviewCameraChallenge" component={CameraChallengeScreen} options={{ gestureEnabled: false, headerShown: false }} />
      <Stack.Screen name="PreviewChallengePhoto" component={ChallengePreviewScreen} options={{ gestureEnabled: false, headerShown: false }} />
      <Stack.Screen name="PreviewChallengeVerification" component={ChallengeVerificationScreen} options={{ gestureEnabled: false, headerShown: false }} />
    </Stack.Navigator>
  );
}
