// src/pages/AdminDashboard.js
import React, { useState } from 'react'; // ✅ useState 추가
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../context/SocketContext';
import { useUsers } from '../hooks/useUsers';
import UserTable from '../components/AdminDashboard/UserTable';
import NoticeManager from '../components/AdminDashboard/NoticeManager'; // ✅ import 추가
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
  const { logout } = useAuth();
  const { socketStatus } = useSocket();
  const { users, filter, setFilter, isLoading, loadUsers, updateStatus } = useUsers('all');
  
  // ✅ 탭 상태 관리 (users | notices)
  const [activeTab, setActiveTab] = useState('users');

  return (
    <div className="admin-dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          {/* ✅ 호텔 관리 탭일 때만 필터 표시 */}
          {activeTab === 'users' && (
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
          )}
          <span className={`socket-badge ${socketStatus}`}>
            {socketStatus === 'Connected' ? '🟢' : '🔴'} Socket
          </span>
        </div>

        <h2 className="dashboard-title">STAYSYNC DASHBOARD</h2>

        <div className="header-right">
          {activeTab === 'users' && (
            <button onClick={loadUsers} className="action-button">새로고침</button>
          )}
          <button onClick={logout} className="action-button suspend-button">로그아웃</button>
        </div>
      </header>

      {/* ✅ 탭 네비게이션 추가 */}
      <div className="dashboard-tabs" style={{ padding: '0 20px', background: '#fff', borderBottom: '1px solid #ddd' }}>
        <button 
          onClick={() => setActiveTab('users')}
          style={{
            padding: '15px 25px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'users' ? '3px solid #1a237e' : '3px solid transparent',
            color: activeTab === 'users' ? '#1a237e' : '#666',
            fontWeight: 'bold',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          🏨 호텔 및 매출 관리
        </button>
        <button 
          onClick={() => setActiveTab('notices')}
          style={{
            padding: '15px 25px',
            background: 'none',
            border: 'none',
            borderBottom: activeTab === 'notices' ? '3px solid #1a237e' : '3px solid transparent',
            color: activeTab === 'notices' ? '#1a237e' : '#666',
            fontWeight: 'bold',
            fontSize: '1rem',
            cursor: 'pointer'
          }}
        >
          📢 공지사항 관리
        </button>
      </div>

      <div className="dashboard-content">
        {/* ✅ 탭에 따른 컴포넌트 렌더링 */}
        {activeTab === 'users' ? (
          <>
            {isLoading && <LoadingSpinner />}
            {!isLoading && users && (
              <UserTable users={users} updateStatus={updateStatus} />
            )}
            {!isLoading && !users && (
              <ErrorMessage message="사용자 데이터를 불러오지 못했습니다." />
            )}
          </>
        ) : (
          <NoticeManager />
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;