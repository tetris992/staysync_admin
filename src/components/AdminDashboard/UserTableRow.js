import React from 'react';
import { useUsers } from '../../hooks/useUsers';
import SalesDetails from './SalesDetails';

const UserTableRow = ({ user, isExpanded, onToggleExpand }) => {
  // useUsers 훅을 여기서 직접 호출하지 않고, props로 함수를 받아오는 것이 좋습니다.
  // 하지만 현재 구조상 편의를 위해 여기서 호출합니다.
  const { updateUserStatus } = useUsers();
  
  const handleUpdateStatus = (e, status) => {
    e.stopPropagation();
    updateUserStatus(user.hotelId, status);
  };
  
  const formatDate = (dateString) => dateString ? new Date(dateString).toLocaleDateString('ko-KR') : '-';

  return (
    <>
      <tr onClick={onToggleExpand} className={isExpanded ? 'expanded' : ''} style={{ cursor: 'pointer' }}>
        <td>{user.hotelId}</td>
        <td>{user.hotelName}</td>
        <td>{user.email}</td>
        <td>{user.status}</td>
        <td>{user.isVerified ? '✓' : 'X'}</td>
        <td>{formatDate(user.createdAt)}</td>
        <td>
          {user.status !== 'active' && (
            <button onClick={(e) => handleUpdateStatus(e, 'active')} className="action-button approve-button">승인</button>
          )}
          {user.status !== 'inactive' && (
            <button onClick={(e) => handleUpdateStatus(e, 'inactive')} className="action-button suspend-button">중지</button>
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr className="expanded-details">
          <td colSpan="7">
            <SalesDetails hotelId={user.hotelId} hotelName={user.hotelName} />
          </td>
        </tr>
      )}
    </>
  );
};

export default UserTableRow;