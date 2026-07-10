import AuthNavigator from './AuthNavigator';
import MainStackNavigator from './MainStackNavigator';

export const APP_MODES = {
  WELCOME: 'WELCOME',
  GUEST: 'GUEST',
  AUTHENTICATED: 'AUTHENTICATED',
};

export default function RootNavigator({ appMode, onContinueAsGuest, onLoginSuccess, onLogout }) {
  if (appMode === APP_MODES.WELCOME) {
    return (
      <AuthNavigator
        onContinueAsGuest={onContinueAsGuest}
        onLoginSuccess={onLoginSuccess}
      />
    );
  }

  return (
    <MainStackNavigator
      isGuest={appMode === APP_MODES.GUEST}
      onLogout={onLogout}
    />
  );
}
