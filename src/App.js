import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import AdminLogin from './AdminLogin';
import AdminDashboard from './AdminDashboard';
import ProtectedRoute from './ProtectedRoute';

export default function App() {
  return (
    <BrowserRouter basename={process.env.PUBLIC_URL}>
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
    </BrowserRouter>
  );
}