// src/hooks/useHotelSales.js
import { useState, useCallback } from 'react';
// fetchAdminHotelSales를 import 하는지 확인하세요.
import { fetchAdminHotelSales } from '../api/api'; 
import { toast } from 'react-toastify';

export const useHotelSales = (hotelId) => {
  const [salesData, setSalesData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const getSales = useCallback(async (year, month) => {
    if (!hotelId) return;
    
    setIsLoading(true);
    setError(null);
    try {
      // 여기서 fetchAdminHotelSales를 호출해야 합니다.
      const data = await fetchAdminHotelSales(hotelId, year, month);
      setSalesData(data);
    } catch (err) {
      console.error(err);
      setError(err);
      toast.error('매출 데이터를 불러오는데 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, [hotelId]);

  return { salesData, isLoading, error, getSales };
};