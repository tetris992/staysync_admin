import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../api/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('accessToken'));
  const [isAdmin, setIsAdmin] = useState(!!token);
  const [isLoading, setIsLoading] = useState(true);

  const verifyAuth = useCallback(() => {
    const currentToken = localStorage.getItem('accessToken');
    if (currentToken) {
      setToken(currentToken);
      setIsAdmin(true);
    } else {
      setToken(null);
      setIsAdmin(false);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    verifyAuth();
    window.addEventListener('storage', verifyAuth);
    return () => {
      window.removeEventListener('storage', verifyAuth);
    };
  }, [verifyAuth]);

  const login = async (username, password) => {
    const { data } = await api.post('/', { username, password }, { skipCsrf: true });
    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
      setToken(data.accessToken);
      setIsAdmin(true);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setIsAdmin(false);
    // The redirect will be handled by ProtectedRoute
  };

  const value = { token, isAdmin, isLoading, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;