import React, { useState, useEffect } from 'react';
import { fetchUsers, updateUserStatus } from '../api/api';
import './AdminDashboard.css';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchUsersData();
  }, [filter]);

  const fetchUsersData = async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchUsers(filter);
      setUsers(data);
    } catch (err) {
      if (err.status === 403) {
        setError('관리자 권한이 없습니다.');
      } else if (err.status === 401) {
        setError('로그인이 필요합니다. 로그인 페이지로 이동합니다.');
        setTimeout(() => window.location.href = '/login', 2000);
      } else {
        setError('사용자 목록을 불러오지 못했습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateStatus = async (hotelId, status) => {
    if (!window.confirm(`사용자 ${hotelId}의 상태를 ${status}(으)로 변경하시겠습니까?`)) {
      return;
    }
    setError('');
    try {
      await updateUserStatus(hotelId, status);
      fetchUsersData();
    } catch (err) {
      if (err.status === 403) {
        setError('관리자 권한이 없습니다.');
      } else {
        setError('상태 업데이트에 실패했습니다.');
      }
    }
  };

  return (
    <div className="admin-dashboard">
      <h2>관리자 대시보드</h2>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="filter">
        <label htmlFor="status-filter">필터: </label>
        <select
          id="status-filter"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          aria-label="상태 필터"
        >
          <option value="all">모두</option>
          <option value="pending">대기</option>
          <option value="active">활성</option>
          <option value="disabled">중지</option>
        </select>
      </div>
      {isLoading ? (
        <p className="loading">로딩 중...</p>
      ) : users.length === 0 ? (
        <p className="no-data">사용자가 없습니다.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>호텔 ID</th>
              <th>호텔 이름</th>
              <th>이메일</th>
              <th>주소</th>
              <th>전화번호</th>
              <th>상태</th>
              <th>인증</th>
              <th>테스트 만료</th>
              <th>인증 만료</th>
              <th>생성일</th>
              <th>수정일</th>
              <th>작업</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.hotelId}>
                <td>{user.hotelId}</td>
                <td>{user.hotelName}</td>
                <td>{user.email}</td>
                <td>{user.address}</td>
                <td>{user.phoneNumber}</td>
                <td>{user.status}</td>
                <td>{user.isVerified ? '인증됨' : '미인증'}</td>
                <td>
                  {user.activationDeadline
                    ? new Date(user.activationDeadline).toLocaleDateString('ko-KR')
                    : '-'}
                </td>
                <td>
                  {user.verificationExpiresAt
                    ? new Date(user.verificationExpiresAt).toLocaleDateString('ko-KR')
                    : '-'}
                </td>
                <td>{new Date(user.createdAt).toLocaleDateString('ko-KR')}</td>
                <td>{new Date(user.updatedAt).toLocaleDateString('ko-KR')}</td>
                <td>
                  {user.status !== 'active' && (
                    <button
                      onClick={() => handleUpdateStatus(user.hotelId, 'active')}
                      className="action-button approve"
                      aria-label={`${user.hotelId} 승인`}
                    >
                      승인
                    </button>
                  )}
                  {user.status !== 'disabled' && (
                    <button
                      onClick={() => handleUpdateStatus(user.hotelId, 'disabled')}
                      className="action-button suspend"
                      aria-label={`${user.hotelId} 중지`}
                    >
                      중지
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AdminDashboard;