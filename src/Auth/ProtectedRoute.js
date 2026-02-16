import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
// 경로 수정: 현재 파일(src/Auth)에서 상위 폴더(src)로 이동 후 hooks 폴더로 접근합니다.
import { useAuth } from '../hooks/useAuth';
// 경로 수정: 현재 파일(src/Auth)에서 상위 폴더(src)로 이동 후 components/common 폴더로 접근합니다. !!
import LoadingSpinner from '../components/common/LoadingSpinner';

export default function ProtectedRoute({ children }) {
  const { isAdmin, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <LoadingSpinner isFullScreen={true} />;
  }

  if (!isAdmin) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
