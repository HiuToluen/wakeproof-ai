import { createNativeStackNavigator } from '@react-navigation/native-stack';

import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();

export default function AuthNavigator({ initialRouteName = 'Welcome', onContinueAsGuest }) {
  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Welcome" options={{ headerShown: false }}>
        {(props) => <WelcomeScreen {...props} onContinueAsGuest={onContinueAsGuest} />}
      </Stack.Screen>
      <Stack.Screen name="Login" options={{ title: 'Sign In' }}>
        {(props) => <LoginScreen {...props} onContinueAsGuest={onContinueAsGuest} />}
      </Stack.Screen>
      <Stack.Screen name="Register" options={{ title: 'Create Account' }} component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" options={{ title: 'Reset Password' }} component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}
