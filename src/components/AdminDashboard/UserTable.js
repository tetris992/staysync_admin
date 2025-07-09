import React, { useState } from 'react';
import UserTableRow from './UserTableRow';

const UserTable = ({ users, updateStatus }) => {
  const [expandedHotelId, setExpandedHotelId] = useState(null);

  if (!users || users.length === 0) {
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
          {users.map((user) => (
            <UserTableRow
              key={user.hotelId}
              user={user}
              isExpanded={expandedHotelId === user.hotelId}
              onToggleExpand={() =>
                setExpandedHotelId((prev) =>
                  prev === user.hotelId ? null : user.hotelId
                )
              }
              updateStatus={updateStatus}   // ← 여기서 꼭 전달
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default UserTable;
