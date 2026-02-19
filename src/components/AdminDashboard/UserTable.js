import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import '../../styles/UserTable.css';
import '../../styles/SubscriptionPanel.css';
import SalesDetails from './SalesDetails';
import SubscriptionPanel from './SubscriptionPanel';

const tierLabels = { basic: 'Basic', premium: 'Premium', platinum: 'Platinum' };
const tierColors = { basic: '#6b7280', premium: '#3b82f6', platinum: '#8b5cf6' };
const subStatusLabels = {
  pending: '승인대기',
  active: '활성',
  suspended: '정지',
  expired: '만료',
  cancelled: '취소',
};

const UserTable = ({ users, updateStatus }) => {
  // 상태별 정렬 순서
  const order = { active: 0, pending: 1, inactive: 2 };
  const sortedUsers = Array.isArray(users)
    ? [...users].sort((a, b) => (order[a.status] || 3) - (order[b.status] || 3))
    : [];

  // [변경] 확장 대신 선택된 유저 상태 관리
  const [selectedUser, setSelectedUser] = useState(null);
  // 오른쪽 패널 탭: 'sales' | 'subscription'
  const [rightTab, setRightTab] = useState('sales');

  // 로드 시 첫 번째 유저 자동 선택 (옵션)
  useEffect(() => {
    if (!selectedUser && sortedUsers.length > 0) {
      setSelectedUser(sortedUsers[0]);
    }
  }, [users]); // eslint-disable-line react-hooks/exhaustive-deps

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR');
  };

  if (!sortedUsers.length) {
    return <p className="no-data-message">표시할 사용자가 없습니다.</p>;
  }

  const rightTabStyle = (key) => ({
    flex: 1,
    padding: '10px 0',
    background: 'none',
    border: 'none',
    borderBottom: rightTab === key ? '3px solid #1a237e' : '3px solid transparent',
    color: rightTab === key ? '#1a237e' : '#999',
    fontWeight: rightTab === key ? 700 : 500,
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  return (
    <div className="split-layout-container">
      {/* [왼쪽 패널] : 호텔 목록 + 구독 칼럼 추가 */}
      <div className="panel left-panel">
        <div className="table-scroll-wrapper">
          <table className="full-info-table">
            <thead>
              <tr>
                <th className="sticky-col">호텔 ID</th>
                <th className="sticky-col-2">호텔 이름</th>
                <th>이메일</th>
                <th>상태</th>
                <th>구독</th>
                <th>인증</th>
                <th>생성일</th>
                <th>작업</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((user) => {
                const isSelected = selectedUser?.hotelId === user.hotelId;
                return (
                  <tr
                    key={user.hotelId}
                    onClick={() => setSelectedUser(user)}
                    className={isSelected ? 'selected-row' : ''}
                  >
                    <td className="sticky-col">
                      <span className={`status-lamp ${user.status === 'active' ? 'on' : 'off'}`} />
                      {user.hotelId}
                    </td>
                    <td className="sticky-col-2">{user.hotelName}</td>
                    <td>{user.email}</td>
                    <td className={`status-text ${user.status}`}>{user.status}</td>

                    {/* 구독 칼럼 */}
                    <td>
                      {user.subscriptionTier ? (
                        <div>
                          <span
                            className="sub-col-tier"
                            style={{ backgroundColor: tierColors[user.subscriptionTier] || '#6b7280' }}
                          >
                            {tierLabels[user.subscriptionTier] || user.subscriptionTier}
                          </span>
                          <span className={`sub-col-status ${user.subscriptionStatus || ''}`}>
                            {subStatusLabels[user.subscriptionStatus] || user.subscriptionStatus || ''}
                          </span>
                        </div>
                      ) : (
                        <span className="sub-col-none">미가입</span>
                      )}
                    </td>

                    <td className="center-align">{user.isVerified ? '✔️' : '❌'}</td>
                    <td>{formatDate(user.createdAt)}</td>

                    {/* 작업 버튼 */}
                    <td>
                      {user.status === 'pending' ? (
                        <button
                          className="action-button approve-button"
                          onClick={(e) => { e.stopPropagation(); updateStatus(user.hotelId, 'active'); }}
                        >
                          승인
                        </button>
                      ) : (
                        <button
                          className="action-button suspend-button"
                          onClick={(e) => { e.stopPropagation(); updateStatus(user.hotelId, user.status === 'active' ? 'inactive' : 'active'); }}
                        >
                          {user.status === 'active' ? '중지' : '활성화'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* [오른쪽 패널] : 탭 (매출/청구 | 구독관리) */}
      <div className="panel right-panel">
        {selectedUser ? (
          <>
            {/* 탭 헤더 */}
            <div style={{ display: 'flex', borderBottom: '1px solid #eee', flexShrink: 0 }}>
              <button onClick={() => setRightTab('sales')} style={rightTabStyle('sales')}>
                💰 매출 · 청구
              </button>
              <button onClick={() => setRightTab('subscription')} style={rightTabStyle('subscription')}>
                📦 구독 관리
              </button>
            </div>

            {/* 탭 내용 */}
            <div style={{ flex: 1, overflow: 'hidden' }}>
              {rightTab === 'sales' && (
                <SalesDetails
                  hotelId={selectedUser.hotelId}
                  hotelName={selectedUser.hotelName}
                  approvalDate={selectedUser.createdAt}
                />
              )}
              {rightTab === 'subscription' && (
                <SubscriptionPanel
                  hotelId={selectedUser.hotelId}
                  hotelName={selectedUser.hotelName}
                />
              )}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>호텔을 선택하여 상세 정보를 확인하세요.</p>
          </div>
        )}
      </div>
    </div>
  );
};

UserTable.propTypes = {
  users: PropTypes.array.isRequired,
  updateStatus: PropTypes.func.isRequired,
};

export default UserTable;
