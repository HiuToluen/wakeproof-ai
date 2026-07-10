import { createNativeStackNavigator } from '@react-navigation/native-stack';

import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import WelcomeScreen from '../screens/onboarding/WelcomeScreen';
import { colors } from '../theme';

const Stack = createNativeStackNavigator();

export default function AuthNavigator({ onContinueAsGuest, onLoginSuccess }) {
  return (
    <Stack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="Welcome" options={{ headerShown: false }}>
        {(props) => <WelcomeScreen {...props} onContinueAsGuest={onContinueAsGuest} />}
      </Stack.Screen>
      <Stack.Screen name="Login" options={{ title: 'Sign In' }}>
        {(props) => <LoginScreen {...props} onLoginSuccess={onLoginSuccess} />}
      </Stack.Screen>
      <Stack.Screen name="Register" options={{ title: 'Create Account' }}>
        {(props) => <RegisterScreen {...props} onLoginSuccess={onLoginSuccess} />}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
