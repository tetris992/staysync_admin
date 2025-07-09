import React, { useState } from 'react';
import PropTypes from 'prop-types';
import '../../styles/UserTable.css';
import SalesDetails from './SalesDetails'; // 일/월별 매출 토글 가능 컴포넌트

const UserTable = ({ users, updateStatus }) => {
  // 상태별 정렬 순서: active > pending > inactive
  const order = { active: 0, pending: 1, inactive: 2 };
  const sortedUsers = Array.isArray(users)
    ? [...users].sort((a, b) => (order[a.status] || 3) - (order[b.status] || 3))
    : [];

  const [expandedHotelId, setExpandedHotelId] = useState(null);
  const toggleExpand = (hotelId) =>
    setExpandedHotelId((prev) => (prev === hotelId ? null : hotelId));

  if (!sortedUsers.length) {
    return <p className="no-data-message">표시할 사용자가 없습니다.</p>;
  }

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>호텔 ID</th>
            <th>호텔 이름</th>
            <th>이메일</th>
            <th>상태</th>
            <th>인증</th>
            <th>생성일</th>
            <th>작업</th>
          </tr>
        </thead>
        <tbody>
          {sortedUsers.map((user) => (
            <React.Fragment key={user.hotelId}>
              <tr
                onClick={() => toggleExpand(user.hotelId)}
                className={expandedHotelId === user.hotelId ? 'expanded' : ''}
              >
                <td>
                  <span
                    className={`status-lamp ${user.status === 'active' ? 'on' : 'off'}`}
                    title={user.status === 'active' ? 'Active' : 'Inactive'}
                  />
                  {user.hotelId}
                </td>
                <td>{user.hotelName}</td>
                <td>{user.email}</td>
                <td className={`status-text ${user.status}`}>{user.status}</td>
                <td>{user.isVerified ? '✔️' : '❌'}</td>
                <td>{new Date(user.createdAt).toLocaleDateString()}</td>
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

              {expandedHotelId === user.hotelId && (
                <tr className="expanded-details">
                  <td colSpan={7} className="sales-row-cell">
                    <SalesDetails
                      hotelId={user.hotelId}
                      hotelName={user.hotelName}
                    />
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

UserTable.propTypes = {
  users: PropTypes.arrayOf(
    PropTypes.shape({
      hotelId: PropTypes.string.isRequired,
      hotelName: PropTypes.string.isRequired,
      email: PropTypes.string,
      status: PropTypes.oneOf(['pending', 'active', 'inactive']).isRequired,
      createdAt: PropTypes.string,
      isVerified: PropTypes.bool,
    })
  ).isRequired,
  updateStatus: PropTypes.func.isRequired,
};

export default UserTable;
