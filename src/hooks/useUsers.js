import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { fetchUsers as apiFetchUsers, updateUserStatus as apiUpdateUserStatus } from '../api/api';

export const useUsers = (initialFilter = 'all') => {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState(initialFilter);
  const [isLoading, setIsLoading] = useState(true);

  const getUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiFetchUsers(filter);
      setUsers(data);
    } catch (err) {
      toast.error(`사용자 목록 로딩 실패: ${err.message || '서버 오류'}`);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    getUsers();
  }, [getUsers]);

  const updateUserStatus = async (hotelId, status) => {
    const statusText = status === 'active' ? '승인' : '중지';
    if (!window.confirm(`사용자 ${hotelId} 계정을 '${statusText}' 상태로 변경하시겠습니까?`)) return false;
    
    try {
      await apiUpdateUserStatus(hotelId, status);
      toast.success(`사용자 ${hotelId}의 상태가 성공적으로 변경되었습니다.`);
      await getUsers();
      return true;
    } catch (err) {
      toast.error(`상태 변경 실패: ${err.message || '서버 오류'}`);
      return false;
    }
  };

  return { users, filter, setFilter, isLoading, refreshUsers: getUsers, updateUserStatus };
};
