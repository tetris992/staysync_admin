// src/pages/AdminDashboard.js
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../context/SocketContext';
import { useUsers } from '../hooks/useUsers';
import UserTable from '../components/AdminDashboard/UserTable';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
  const { logout } = useAuth();
  const { socketStatus } = useSocket();
  const { users, filter, setFilter, isLoading, loadUsers, updateStatus } = useUsers('all');

  return (
    <div className="admin-dashboard">
      {/* ✅ [수정] 헤더 레이아웃: 좌(필터/소켓) - 중(제목) - 우(버튼) */}
      <header className="dashboard-header">
        
        {/* 1. 좌측: 필터 및 상태 */}
        <div className="header-left">
          <select 
            className="status-filter-select"
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="all">전체 보기</option>
            <option value="pending">대기 중</option>
            <option value="active">활성</option>
            <option value="inactive">중지됨</option>
          </select>
          <span className={`socket-badge ${socketStatus}`}>
            {socketStatus === 'Connected' ? '🟢' : '🔴'} Socket
          </span>
        </div>

        {/* 2. 중앙: 제목 */}
        <h2 className="dashboard-title">STAYSYNC DASHBOARD</h2>

        {/* 3. 우측: 액션 버튼 */}
        <div className="header-right">
          <button onClick={loadUsers} className="action-button">새로고침</button>
          <button onClick={logout} className="action-button suspend-button">로그아웃</button>
        </div>
      </header>

      {/* 필터 컨테이너 제거 (헤더로 통합됨) */}

      <div className="dashboard-content">
        {isLoading && <LoadingSpinner />}
        {!isLoading && users && (
          <UserTable users={users} updateStatus={updateStatus} />
        )}
        {!isLoading && !users && (
          <ErrorMessage message="사용자 데이터를 불러오지 못했습니다." />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;