import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { updateProfile } from 'firebase/auth';

import { auth } from '../config/firebase';
import { changePassword as changePasswordService, getLinkedProviders, linkGoogleToCurrentUser, registerWithEmail, sendPasswordReset as sendPasswordResetService, setPasswordForCurrentUser, signInWithEmail, signInWithGoogle, signOutUser, subscribeToAuthState } from '../services/authService';
import { createUserProfileIfMissing, getUserProfile, updateUserProfile } from '../services/userProfileService';

const AuthContext = createContext(null);

function fallbackProfileFromUser(user) {
  if (!user) return null;
  return {
    displayName: user.displayName || '',
    email: user.email || '',
    photoURL: user.photoURL || null,
    authProvider: user.providerData?.[0]?.providerId || 'password',
    plan: 'FREE',
    subscriptionStatus: 'INACTIVE',
    subscriptionStartedAt: null,
    subscriptionExpiresAt: null,
    subscriptionSource: null,
    profileLoadError: true,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [linkedProviders, setLinkedProviders] = useState(getLinkedProviders(null));
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  const refreshLinkedProviders = useCallback(async () => {
    if (auth.currentUser) await auth.currentUser.reload();
    const providers = getLinkedProviders(auth.currentUser);
    setLinkedProviders(providers);
    setUser(auth.currentUser);
    return providers;
  }, []);

  const loadProfile = useCallback(async (firebaseUser) => {
    if (!firebaseUser) {
      setUserProfile(null);
      setLinkedProviders(getLinkedProviders(null));
      return null;
    }
    setLinkedProviders(getLinkedProviders(firebaseUser));
    try {
      await createUserProfileIfMissing(firebaseUser);
      const profile = await getUserProfile(firebaseUser.uid);
      setUserProfile(profile || fallbackProfileFromUser(firebaseUser));
      return profile;
    } catch {
      const fallback = fallbackProfileFromUser(firebaseUser);
      setUserProfile(fallback);
      return fallback;
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAuthState(async (firebaseUser) => {
      setUser(firebaseUser);
      if (firebaseUser) await loadProfile(firebaseUser);
      else {
        setUserProfile(null);
        setLinkedProviders(getLinkedProviders(null));
      }
      setIsAuthLoading(false);
    });
    return unsubscribe;
  }, [loadProfile]);

  const register = useCallback(async (payload) => {
    const result = await registerWithEmail(payload);
    await refreshLinkedProviders();
    return result;
  }, [refreshLinkedProviders]);

  const login = useCallback(async (payload) => {
    const result = await signInWithEmail(payload);
    await refreshLinkedProviders();
    return result;
  }, [refreshLinkedProviders]);

  const loginWithGoogle = useCallback(async () => {
    const result = await signInWithGoogle();
    await refreshLinkedProviders();
    return result;
  }, [refreshLinkedProviders]);

  const logout = useCallback(async () => {
    await signOutUser();
    setUserProfile(null);
    setLinkedProviders(getLinkedProviders(null));
  }, []);

  const refreshUserProfile = useCallback(async () => loadProfile(auth.currentUser), [loadProfile]);

  const updateDisplayName = useCallback(async (displayName) => {
    const normalizedName = String(displayName || '').trim();
    if (!normalizedName) throw { code: 'auth/missing-display-name' };
    if (!auth.currentUser) throw new Error('Missing authenticated user.');
    await updateProfile(auth.currentUser, { displayName: normalizedName });
    await updateUserProfile(auth.currentUser.uid, { displayName: normalizedName });
    await refreshUserProfile();
  }, [refreshUserProfile]);

  const setPassword = useCallback(async (newPassword) => {
    const result = await setPasswordForCurrentUser(newPassword);
    await refreshLinkedProviders();
    return result;
  }, [refreshLinkedProviders]);

  const changePassword = useCallback(async (payload) => {
    const result = await changePasswordService(payload);
    await refreshLinkedProviders();
    return result;
  }, [refreshLinkedProviders]);

  const linkGoogleAccount = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    const result = await linkGoogleToCurrentUser();
    if (auth.currentUser?.uid !== uid) throw { code: 'auth/provider-link-uid-mismatch' };
    await refreshLinkedProviders();
    await refreshUserProfile();
    return result;
  }, [refreshLinkedProviders, refreshUserProfile]);

  const sendPasswordReset = useCallback((email) => sendPasswordResetService(email), []);

  const value = useMemo(() => ({
    user,
    userProfile,
    isAuthenticated: Boolean(user),
    isAuthLoading,
    hasPasswordProvider: linkedProviders.hasPasswordProvider,
    hasGoogleProvider: linkedProviders.hasGoogleProvider,
    linkedProviderIds: linkedProviders.providerIds,
    register,
    login,
    loginWithGoogle,
    logout,
    refreshUserProfile,
    updateDisplayName,
    refreshLinkedProviders,
    setPassword,
    changePassword,
    linkGoogleAccount,
    sendPasswordReset,
  }), [user, userProfile, isAuthLoading, linkedProviders, register, login, loginWithGoogle, logout, refreshUserProfile, updateDisplayName, refreshLinkedProviders, setPassword, changePassword, linkGoogleAccount, sendPasswordReset]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
