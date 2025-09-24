// src/pages/AdminLogin.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';
import '../styles/AdminLogin.css';

const AdminLogin = () => {
  const storedUsername = localStorage.getItem('adminUsername') || '';
  const storedPassword = localStorage.getItem('adminPassword') || '';

  const [username, setUsername] = useState(storedUsername);
  const [password, setPassword] = useState(storedPassword);

  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAdmin } = useAuth();

  useEffect(() => {
    if (isAdmin) navigate('/', { replace: true });

    const params = new URLSearchParams(location.search);
    if (params.get('error') === 'session_expired') {
      toast.error('세션이 만료되었습니다. 다시 로그인해주세요.');
    }
  }, [isAdmin, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // password 변수를 직접 사용
      await login(username, password);
      localStorage.setItem('adminUsername', username);
      localStorage.setItem('adminPassword', password);
      navigate('/', { replace: true });
    } catch (err) {
      const msg = err.response?.data?.message
        || '로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.';
      toast.error(msg);
    }
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
            onChange={e => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">로그인</button>
      </form>
    </div>
  );
};

export default AdminLogin;