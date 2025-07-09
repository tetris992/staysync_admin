import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../hooks/useAuth';
import '../styles/AdminLogin.css';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAdmin } = useAuth();

  useEffect(() => {
    if (isAdmin) {
      navigate('/', { replace: true });
    }
    const params = new URLSearchParams(location.search);
    if (params.get('error') === 'session_expired') {
      toast.error('세션이 만료되었습니다. 다시 로그인해주세요.');
    }
  }, [isAdmin, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate('/', { replace: true });
    } catch (err) {
      const message = err.response?.data?.message || '로그인에 실패했습니다. 아이디와 비밀번호를 확인해주세요.';
      toast.error(message);
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
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">로그인</button>
      </form>
    </div>
  );
};

export default AdminLogin;