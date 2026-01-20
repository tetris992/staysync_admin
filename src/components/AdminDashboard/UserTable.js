import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import '../../styles/UserTable.css';
import SalesDetails from './SalesDetails';

const UserTable = ({ users, updateStatus }) => {
  // 상태별 정렬 순서
  const order = { active: 0, pending: 1, inactive: 2 };
  const sortedUsers = Array.isArray(users)
    ? [...users].sort((a, b) => (order[a.status] || 3) - (order[b.status] || 3))
    : [];

  // [변경] 확장 대신 선택된 유저 상태 관리
  const [selectedUser, setSelectedUser] = useState(null);

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

  return (
    <div className="split-layout-container">
      {/* [왼쪽 패널] : 기존 테이블 목록 전체 유지 
        - 내용이 많을 경우 패널 내부에서 가로 스크롤 발생
      */}
      <div className="panel left-panel">
        <div className="table-scroll-wrapper">
          <table className="full-info-table">
            <thead>
              <tr>
                {/* 원래 헤더 항목 모두 복구 */}
                <th className="sticky-col">호텔 ID</th>
                <th className="sticky-col-2">호텔 이름</th>
                <th>이메일</th>
                <th>상태</th>
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
                    {/* ID와 이름은 스크롤 시에도 왼쪽에 고정되도록 클래스 추가 */}
                    <td className="sticky-col">
                      <span className={`status-lamp ${user.status === 'active' ? 'on' : 'off'}`} />
                      {user.hotelId}
                    </td>
                    <td className="sticky-col-2">{user.hotelName}</td>
                    
                    {/* 나머지 상세 정보 */}
                    <td>{user.email}</td>
                    <td className={`status-text ${user.status}`}>{user.status}</td>
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

      {/* [오른쪽 패널] : 상세 매출/청구 정보 */}
      <div className="panel right-panel">
        {selectedUser ? (
          <SalesDetails
            hotelId={selectedUser.hotelId}
            hotelName={selectedUser.hotelName}
            approvalDate={selectedUser.createdAt} // ✅ 승인일 전달
          />
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