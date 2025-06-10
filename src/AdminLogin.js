import React, { useState, useEffect } from 'react';
import axios from './api/api';
import { useNavigate } from 'react-router-dom';
import socket from './socket';
import './AdminLogin.css';

const AdminLogin = () => {
  const [hotelId, setHotelId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [socketStatus, setSocketStatus] = useState('연결 중...');
  const navigate = useNavigate();

  useEffect(() => {
    const savedHotelId = localStorage.getItem('adminHotelId');
    const savedPassword = localStorage.getItem('adminPassword');
    if (savedHotelId) {
      setHotelId(savedHotelId);
    }
    if (savedPassword) {
      setPassword(savedPassword);
    }

    const handleConnect = () => {
      setSocketStatus('WebSocket 연결됨');
      console.log('Socket connected in AdminLogin');
    };

    const handleConnectError = (error) => {
      setSocketStatus('WebSocket 연결 실패');
      console.error('Socket connection error in AdminLogin:', error);
    };

    const handleDisconnect = (reason) => {
      setSocketStatus('WebSocket 연결 끊김');
      console.log('Socket disconnected in AdminLogin:', reason);
    };

    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on('disconnect', handleDisconnect);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
      socket.off('disconnect', handleDisconnect);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Clear previous session data
    localStorage.clear();
    document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';

    // Save credentials before proceeding
    localStorage.setItem('adminHotelId', hotelId);
    localStorage.setItem('adminPassword', password);

    try {
      console.log('[AdminLogin] Attempting login for hotelId:', hotelId);
      const { data } = await axios.post(
        '/api/admin/login',
        { username: hotelId, password },
        { skipCsrf: true, withCredentials: true }
      );
      console.log('[AdminLogin] Login response data:', data);
      const accessToken = data.accessToken;
      if (!accessToken || accessToken.split('.').length !== 3) {
        console.error('[AdminLogin] Invalid accessToken received:', accessToken);
        throw new Error('Invalid accessToken received from server');
      }
      localStorage.setItem('accessToken', accessToken);
      console.log('[AdminLogin] Login successful, accessToken:', accessToken);
      console.log('[AdminLogin] Cookies after login:', document.cookie);

      // Verify token immediately after setting
      const storedToken = localStorage.getItem('accessToken');
      console.log('[AdminLogin] Stored accessToken:', storedToken);
      if (storedToken !== accessToken) {
        console.error('[AdminLogin] Token mismatch after storage:', { storedToken, accessToken });
        throw new Error('Token mismatch after storage');
      }

      // WebSocket 연결 시작
      socket.connect();

      // Add a slight delay to ensure localStorage is updated
      setTimeout(() => {
        console.log('[AdminLogin] Navigating to dashboard, token:', localStorage.getItem('accessToken'));
        navigate('/', { replace: true });
      }, 100);
    } catch (err) {
      console.error('[AdminLogin] Login error:', err);
      const message = err.response?.data?.message || '로그인에 실패했습니다.';
      setError(message);
      if (message.includes('승인 대기')) {
        setError('계정이 승인 대기 중입니다. 관리자 승인을 기다려주세요.');
      } else if (message.includes('비활성화')) {
        setError('계정이 비활성화되었습니다. 관리자에게 문의하세요.');
      }
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword((prev) => !prev);
  };

  return (
    <div className="login-container">
      <h2>개발자 로그인</h2>
      <p>소켓 상태: {socketStatus}</p>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <div>
          <label>아이디</label>
          <input
            value={hotelId}
            onChange={(e) => setHotelId(e.target.value)}
            required
          />
        </div>
        <div>
          <label>비밀번호</label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              {showPassword ? '숨기기' : '보이기'}
            </button>
          </div>
        </div>
        <button type="submit">로그인</button>
      </form>
    </div>
  );
};

export default AdminLogin;