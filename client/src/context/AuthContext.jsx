import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import authService from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('smartmart_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('smartmart_token') || null);
  const [isLoading, setIsLoading] = useState(true);

  // Validate session on app initialization if token exists
  useEffect(() => {
    async function verifySession() {
      const savedToken = localStorage.getItem('smartmart_token');
      if (!savedToken) {
        setIsLoading(false);
        return;
      }

      try {
        const currentUser = await authService.getMe();
        setUser(currentUser);
        localStorage.setItem('smartmart_user', JSON.stringify(currentUser));
      } catch {
        // Token expired or invalid
        localStorage.removeItem('smartmart_token');
        localStorage.removeItem('smartmart_user');
        setToken(null);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    verifySession();

    // Listen for 401 session expiry events dispatched by Axios interceptor
    const handleAuthExpired = () => {
      setToken(null);
      setUser(null);
    };

    window.addEventListener('auth:expired', handleAuthExpired);
    return () => window.removeEventListener('auth:expired', handleAuthExpired);
  }, []);

  const login = useCallback(async (email, password) => {
    const { user: loggedInUser, token: authToken } = await authService.login(email, password);
    localStorage.setItem('smartmart_token', authToken);
    localStorage.setItem('smartmart_user', JSON.stringify(loggedInUser));
    setToken(authToken);
    setUser(loggedInUser);
    return loggedInUser;
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setToken(null);
    setUser(null);
  }, []);

  const updateProfile = useCallback(async (profileData) => {
    const updated = await authService.updateProfile(profileData);
    setUser(updated);
    localStorage.setItem('smartmart_user', JSON.stringify(updated));
    return updated;
  }, []);

  const hasRole = useCallback(
    (allowedRoles) => {
      if (!user) return false;
      if (!allowedRoles || allowedRoles.length === 0) return true;
      const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
      return rolesArray.includes(user.role);
    },
    [user]
  );

  const value = {
    user,
    token,
    role: user?.role || null,
    isAuthenticated: Boolean(token && user),
    isLoading,
    login,
    logout,
    updateProfile,
    hasRole
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
