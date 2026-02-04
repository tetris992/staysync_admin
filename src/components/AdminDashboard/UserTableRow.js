// src/components/AdminDashboard/UserTableRow.jsx
import React, { useState } from 'react';
import SalesDetails from './SalesDetails';
import '../../styles/UserTableRow.css';

const UserTableRow = ({ user, isExpanded, onToggleExpand, updateStatus }) => {
  const [blinking, setBlinking] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleClick = async (e, status) => {
    e.stopPropagation();
    if (updating) return;
    setUpdating(true);
    const ok = await updateStatus(user.hotelId, status);
    if (ok) {
      setBlinking(true);
      setTimeout(() => setBlinking(false), 2500);
    }
    setUpdating(false);
  };

  const formatDate = (dt) => (dt ? new Date(dt).toLocaleDateString('ko-KR') : '-');

  return (
    <>
      <tr
        onClick={onToggleExpand}
        className={`${isExpanded ? 'expanded' : ''} ${blinking ? 'blink' : ''}`}
        style={{ transition: 'background-color 0.3s ease' }}
      >
        <td>{user.hotelId}</td>
        <td>{user.hotelName}</td>
        <td>{user.email}</td>
        <td>{user.status}</td>
        <td>{user.isVerified ? '✓' : 'X'}</td>
        <td>{formatDate(user.createdAt)}</td>
        <td>
          {user.status !== 'active' && (
            <button
              disabled={updating}
              onClick={(e) => handleClick(e, 'active')}
              className="action-button approve-button"
            >
              {updating ? '처리 중…' : '승인'}
            </button>
          )}
          {user.status !== 'inactive' && (
            <button
              disabled={updating}
              onClick={(e) => handleClick(e, 'inactive')}
              className="action-button suspend-button"
            >
              {updating ? '처리 중…' : '중단'}
            </button>
          )}
        </td>
      </tr>

      {isExpanded && (
        <tr className="expanded-details">
          <td colSpan="7">
            <SalesDetails
              hotelId={user.hotelId}
              hotelName={user.hotelName}
              approvalDate={user.approvalDate} // ✅ NEW
            />
          </td>
        </tr>
      )}
    </>
  );
};

export default UserTableRow;
