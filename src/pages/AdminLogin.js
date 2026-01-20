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

  // ✅ [수정] 컴포넌트 마운트 시 저장된 정보 불러오기
  useEffect(() => {
    // 이미 로그인 상태면 리다이렉트
    if (isAdmin) {
      navigate('/', { replace: true });
      return;
    }

    // URL 에러 파라미터 체크
    const params = new URLSearchParams(location.search);
    if (params.get('error') === 'session_expired') {
      toast.error('세션이 만료되었습니다. 다시 로그인해주세요.');
    }

    // 로컬 스토리지에서 저장된 정보 가져오기
    const savedUsername = localStorage.getItem('savedAdminId');
    const savedPassword = localStorage.getItem('savedAdminPw');

    if (savedUsername && savedPassword) {
      setUsername(savedUsername);
      setPassword(savedPassword);
      setRememberMe(true); // 정보가 있으면 체크박스도 체크
    }
  }, [isAdmin, navigate, location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // 로그인 시도
      await login(username, password);

      // ✅ [수정] 로그인 성공 시, 체크 여부에 따라 저장 또는 삭제
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
    <div className="login-container">
      <h2>개발사 로그인</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="username">아이디</label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            required
            placeholder="아이디를 입력하세요"
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
            placeholder="비밀번호를 입력하세요"
          />
        </div>
        
        {/* ✅ [추가] 아이디/비번 저장 체크박스 */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', gap: '8px' }}>
          <input
            id="rememberMe"
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            style={{ width: 'auto', margin: 0, cursor: 'pointer' }}
          />
          <label htmlFor="rememberMe" style={{ margin: 0, cursor: 'pointer', fontSize: '0.9rem', color: '#555' }}>
            로그인 정보 저장 (자동 입력)
          </label>
        </div>

        <button type="submit">로그인</button>
      </form>
    </div>
  );
};

export default AdminLogin;