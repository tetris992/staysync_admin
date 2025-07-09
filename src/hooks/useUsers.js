import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { fetchUsers as apiFetchUsers, updateUserStatus as apiUpdateUserStatus } from '../api/api';

export const useUsers = (initialFilter = 'all') => {
  const [filter, setFilter]     = useState(initialFilter);
  const [users, setUsers]       = useState([]);
  const [isLoading, setLoading] = useState(false);

  // 1) 사용자 목록 로드
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetchUsers(filter);
      setUsers(data);
    } catch (err) {
      toast.error(`사용자 목록 로딩 실패: ${err.message || '서버 오류'}`);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // 2) 상태 변경: 즉시 로컬 상태 업데이트 + 토스트 메시지 분기
  const updateStatus = async (hotelId, status) => {
    try {
      await apiUpdateUserStatus(hotelId, status);
      // 로컬 상태 바로 변경
      setUsers(prev =>
        prev.map(u =>
          u.hotelId === hotelId
            ? { ...u, status }
            : u
        )
      );
      // 액션별 메시지
      if (status === 'active') {
        toast.success(`호텔 ${hotelId} 승인 완료`);
      } else {
        toast.success(`호텔 ${hotelId} 중단 완료`);
      }
      return true;
    } catch (err) {
      if (status === 'active') {
        toast.error(`호텔 ${hotelId} 승인 실패: ${err.message}`);
      } else {
        toast.error(`호텔 ${hotelId} 중단 실패: ${err.message}`);
      }
      return false;
    }
  };

  return {
    users,
    filter,
    setFilter,
    isLoading,
    loadUsers,
    updateStatus,
  };
};
