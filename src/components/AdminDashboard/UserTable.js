import React from 'react';
import PropTypes from 'prop-types';
import '../../styles/UserTable.css'; // CSS 경로 확인

const UserTable = ({ users, updateStatus }) => {
  // 상태별 정렬 순서: active > pending > inactive
  const order = { active: 0, pending: 1, inactive: 2 };
  const sortedUsers = [...users].sort((a, b) => {
    return (order[a.status] || 3) - (order[b.status] || 3);
  });

  return (
    <div className="table-wrapper">
      <table>
        <thead>
          <tr>
            <th>Hotel ID</th>
            <th>호텔 이름</th>
            <th>이메일</th>
            <th>상태</th>
            <th>액션</th>
          </tr>
        </thead>
        <tbody>
          {sortedUsers.map((user) => (
            <tr key={user.hotelId}>
              <td>
                <span
                  className={`status-lamp ${
                    user.status === 'active' ? 'on' : 'off'
                  }`}
                  title={user.status === 'active' ? 'Active' : 'Inactive'}
                />
                {user.hotelId}
              </td>
              <td>{user.hotelName}</td>
              <td>{user.email}</td>
              <td className={`status-text ${user.status}`}>{user.status}</td>
              <td>
                {user.status === 'pending' ? (
                  <button
                    className="action-button approve-button"
                    onClick={() => updateStatus(user.hotelId, 'active')}
                  >
                    승인
                  </button>
                ) : (
                  <button
                    className="action-button suspend-button"
                    onClick={() =>
                      updateStatus(
                        user.hotelId,
                        user.status === 'active' ? 'inactive' : 'active'
                      )
                    }
                  >
                    {user.status === 'active' ? '중지' : '활성화'}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

UserTable.propTypes = {
  users: PropTypes.arrayOf(
    PropTypes.shape({
      hotelId:   PropTypes.string.isRequired,
      hotelName: PropTypes.string.isRequired,
      email:     PropTypes.string,
      status:    PropTypes.oneOf(['pending', 'active', 'inactive']).isRequired,
    })
  ).isRequired,
  updateStatus: PropTypes.func.isRequired,
};

export default UserTable;
