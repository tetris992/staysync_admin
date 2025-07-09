import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
// 경로 수정: 'components' 폴더를 제거하여 실제 위치를 정확히 가리키도록 합니다.
import ProtectedRoute from './Auth/ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter basename={process.env.PUBLIC_URL || '/staysync_admin'}>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route path="/login" element={<AdminLogin />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
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
