import { useState, useCallback } from 'react';
import { fetchHotelSales } from '../api/api';

export const useHotelSales = (hotelId) => {
  const [salesData, setSalesData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const getSales = useCallback(
    async (type, startDate, endDate) => {
      setIsLoading(true);
      try {
        const data = await fetchHotelSales(hotelId, type, startDate, endDate);
        setSalesData(data);
        setError(null);
      } catch (err) {
        setError(err.message || '매출 조회 실패');
        setSalesData(null);
      } finally {
        setIsLoading(false);
      }
    },
    [hotelId]
  );

  return { salesData, isLoading, error, getSales };
};
