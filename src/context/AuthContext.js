// src/context/AuthContext.js
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
    try {
      // API 호출
      const { data } = await api.post('/api/admin/login', { username, password }, { skipCsrf: true });
      
      if (data.accessToken) {
        localStorage.setItem('accessToken', data.accessToken);
        setToken(data.accessToken);
        setIsAdmin(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Login failed:", error);
      throw error; // 에러를 AdminLogin.jsx로 전달하여 toast를 띄울 수 있게 함
    }
  };

  const logout = () => {
    // ❌ 기존: localStorage.clear(); -> 저장된 아이디/비번까지 다 지워버림 (삭제)
    
    // ✅ [수정] 로그인 토큰만 콕 집어서 삭제 (저장된 정보는 보호됨)
    localStorage.removeItem('accessToken'); 
    
    setToken(null);
    setIsAdmin(false);
    // ProtectedRoute에 의해 로그인 페이지로 이동됨
  };

  const value = { token, isAdmin, isLoading, login, logout };

  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

export default AuthContext;