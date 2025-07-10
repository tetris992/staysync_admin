// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import ProtectedRoute from './Auth/ProtectedRoute';

export default function App() {
  return (
    // 루트 호스팅이므로 basename은 생략합니다.
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            {/* 로그인 화면 */}
            <Route path="/login" element={<AdminLogin />} />

            {/* 보호된 대시보드 */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />

            {/* 그 외 모든 경로는 루트로 리다이렉트 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* 전역 Toast 알림 */}
          <ToastContainer
            position="top-center"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
