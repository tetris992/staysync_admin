import React, { useState, useEffect } from 'react';
import { useHotelSales } from '../../hooks/useHotelSales';
import SalesChart from './SalesChart';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const SalesDetails = ({ hotelId, hotelName }) => {
  const { salesData, isLoading, getSales } = useHotelSales(hotelId);
  const [salesType, setSalesType] = useState('monthly');
  
  useEffect(() => {
    const today = new Date();
    const startDate = new Date(today.getFullYear() - 1, today.getMonth(), 1).toISOString().split('T')[0];
    const endDate = today.toISOString().split('T')[0];
    getSales(salesType, startDate, endDate);
  }, [getSales, salesType]);

  return (
    <div className="sales-details">
      <h3>{hotelName} 매출 정보</h3>
      <div className="sales-filter">
        <label htmlFor={`sales-type-${hotelId}`}>매출 보기: </label>
        <select id={`sales-type-${hotelId}`} value={salesType} onChange={(e) => setSalesType(e.target.value)}>
          <option value="daily">일별</option>
          <option value="monthly">월별</option>
        </select>
      </div>

      {isLoading && <LoadingSpinner />}
      {!isLoading && salesData && <SalesChart salesData={salesData} type={salesType} />}
      {!isLoading && !salesData && <ErrorMessage message="매출 데이터를 불러올 수 없습니다." />}
    </div>
  );
};

export default SalesDetails;
