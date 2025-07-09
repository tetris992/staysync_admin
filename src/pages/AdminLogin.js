// src/pages/AdminLogin.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';
import '../styles/AdminLogin.css';

const AdminLogin = () => {
  // 1) 로컬스토리지에서 저장된 아이디/비밀번호(raw) 불러오기
  const storedUsername = localStorage.getItem('adminUsername') || '';
  const storedPassword = localStorage.getItem('adminPassword') || '';

  // 2) 폼 필드 상태
  const [username, setUsername] = useState(storedUsername);
  // password 필드에는 별표만 보여주고 rawPassword에 실제 값을 보관
  const [password, setPassword] = useState(storedPassword ? '*'.repeat(storedPassword.length) : '');
  const [rawPassword, setRawPassword] = useState(storedPassword);

  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAdmin } = useAuth();

  // 이미 로그인된 상태라면 홈으로 리다이렉트
  useEffect(() => {
    if (isAdmin) navigate('/', { replace: true });

    const params = new URLSearchParams(location.search);
    if (params.get('error') === 'session_expired') {
      toast.error('세션이 만료되었습니다. 다시 로그인해주세요.');
    }
  }, [isAdmin, navigate, location]);

  // 폼 제출 핸들러
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // rawPassword 사용
      await login(username, rawPassword);
      // 로그인 성공 시 로컬스토리지에 저장
      localStorage.setItem('adminUsername', username);
      localStorage.setItem('adminPassword', rawPassword);
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message
        || '로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.';
      toast.error(msg);
    }
  };

  // 비밀번호 입력 시 raw와 별표 상태 동기화
  const handlePasswordChange = (e) => {
    const val = e.target.value;
    setRawPassword(val);
    setPassword('*'.repeat(val.length));
  };

  return (
    <div className="login-container">
      <h2>개발자 로그인</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username">아이디</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={handlePasswordChange}
            required
          />
        </div>
        <button type="submit">로그인</button>
      </form>
    </div>
  );
};

export default AdminLogin;
