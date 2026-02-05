// src/pages/AdminLogin.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';
import '../styles/AdminLogin.css';

const AdminLogin = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAdmin } = useAuth();

  // 상태 관리
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // 컴포넌트 마운트 시 저장된 정보 불러오기
  useEffect(() => {
    if (isAdmin) {
      navigate('/', { replace: true });
      return;
    }

    const params = new URLSearchParams(location.search);
    if (params.get('error') === 'session_expired') {
      toast.error('세션이 만료되었습니다. 다시 로그인해주세요.');
    }

    const savedUsername = localStorage.getItem('savedAdminId');
    const savedPassword = localStorage.getItem('savedAdminPw');

    if (savedUsername && savedPassword) {
      setUsername(savedUsername);
      setPassword(savedPassword);
      setRememberMe(true);
    }
  }, [isAdmin, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);

      if (rememberMe) {
        localStorage.setItem('savedAdminId', username);
        localStorage.setItem('savedAdminPw', password);
      } else {
        localStorage.removeItem('savedAdminId');
        localStorage.removeItem('savedAdminPw');
      }

      navigate('/', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message
        || '로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.';
      toast.error(msg);
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="login-card">
        {/* ✅ [디자인 개선] 브랜드 헤더 영역 */}
        <div className="login-header">
          <h3 className="company-name">ZERO TO ONE</h3>
          <h1 className="service-title">STAYSYNC <span className="highlight">PMS</span></h1>
          <p className="login-subtitle">통합 예약 관리 시스템 접속</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="username">아이디</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              placeholder="Admin ID"
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">비밀번호</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Password"
            />
          </div>
          
          <div className="checkbox-group">
            <input
              id="rememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label htmlFor="rememberMe">로그인 정보 저장</label>
          </div>

          <button type="submit" className="login-btn">
            관리자 로그인
          </button>
        </form>

        {/* ✅ [디자인 개선] 푸터 영역 */}
        <div className="login-footer">
          <p>© 2026 ZERO TO ONE Corp. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;