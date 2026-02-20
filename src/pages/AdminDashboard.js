// src/pages/AdminDashboard.js
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useSocket } from '../context/SocketContext';
import { useUsers } from '../hooks/useUsers';

import UserTable from '../components/AdminDashboard/UserTable';
import NoticeManager from '../components/AdminDashboard/NoticeManager';
import FaqManager from '../components/AdminDashboard/FaqManager';
import ServiceGuideManager from '../components/AdminDashboard/ServiceGuideManager';

import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorMessage from '../components/common/ErrorMessage';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
  const { logout } = useAuth();
  const { socketStatus } = useSocket();
  const { users, filter, setFilter, isLoading, loadUsers, updateStatus } =
    useUsers('active');

  // users | notices | faqs | serviceGuides
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
            <button onClick={loadUsers} className="action-button">
              새로고침
            </button>
          )}
          <button onClick={logout} className="action-button suspend-button">
            로그아웃
          </button>
        </div>
      </header>

      {/* 탭 네비게이션 */}
      <div className="dashboard-tabs">
        <button
          onClick={() => setActiveTab('users')}
          className={activeTab === 'users' ? 'active' : ''}
        >
          호텔 및 매출 관리
        </button>
        <button
          onClick={() => setActiveTab('notices')}
          className={activeTab === 'notices' ? 'active' : ''}
        >
          공지사항
        </button>
        <button
          onClick={() => setActiveTab('faqs')}
          className={activeTab === 'faqs' ? 'active' : ''}
        >
          자주 묻는 질문
        </button>
        <button
          onClick={() => setActiveTab('serviceGuides')}
          className={activeTab === 'serviceGuides' ? 'active' : ''}
        >
          서비스 안내
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'users' && (
          <>
            {isLoading && <LoadingSpinner />}
            {!isLoading && users && <UserTable users={users} updateStatus={updateStatus} />}
            {!isLoading && !users && (
              <ErrorMessage message="사용자 데이터를 불러오지 못했습니다." />
            )}
          </>
        )}

        {activeTab === 'notices' && <NoticeManager />}

        {activeTab === 'faqs' && <FaqManager />}

        {activeTab === 'serviceGuides' && <ServiceGuideManager />}
      </div>
    </div>
  );
};

export default AdminDashboard;
