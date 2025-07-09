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
  const {
    users,
    filter,
    setFilter,
    isLoading,
    refreshUsers,
    updateStatus,     // ✅ 여기서 updateStatus까지 꺼내오기
  } = useUsers('all');

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <h2>STAYSYNC DASHBOARD</h2>
        <div className="header-controls">
          <span className="socket-status">Socket: {socketStatus}</span>
          <button onClick={refreshUsers} className="action-button">
            새로고침
          </button>
          <button onClick={logout} className="action-button suspend-button">
            로그아웃
          </button>
        </div>
      </header>

      <div className="filter-container">
        <label htmlFor="status-filter">상태 필터: </label>
        <select
          id="status-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        >
          <option value="all">모두</option>
          <option value="pending">대기</option>
          <option value="active">활성</option>
          <option value="inactive">중지</option>
        </select>
      </div>

      {isLoading && <LoadingSpinner />}
      {!isLoading && users && (
        // ✅ updateStatus를 props로 넘겨줍니다
        <UserTable users={users} updateStatus={updateStatus} />
      )}
      {!isLoading && !users && (
        <ErrorMessage message="사용자 데이터를 불러오지 못했습니다." />
      )}
    </div>
  );
};

export default AdminDashboard;
