import { useState, useCallback } from 'react';
import { toast } from 'react-toastify';
import { fetchHotelSales as apiFetchSales } from '../api/api';

export const useHotelSales = (hotelId) => {
  const [salesData, setSalesData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const getSales = useCallback(async (type, startDate, endDate) => {
    if (!hotelId) return;
    setIsLoading(true);
    setSalesData(null);
    try {
      const data = await apiFetchSales(hotelId, type, startDate, endDate);
      setSalesData(data);
    } catch (err) {
      toast.error(`매출 데이터 로딩 실패: ${err.message || '서버 오류'}`);
      setSalesData(null); // Clear data on error
    } finally {
      setIsLoading(false);
    }
  }, [hotelId]);

  return { salesData, isLoading, getSales };
};