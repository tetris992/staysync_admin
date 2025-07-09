// src/components/AdminDashboard/SalesDetails.jsx
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useHotelSales } from '../../hooks/useHotelSales';
import SalesChart from './SalesChart';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';

const SalesDetails = ({ hotelId, hotelName }) => {
  const { salesData, isLoading, getSales } = useHotelSales(hotelId);
  const [salesType, setSalesType] = useState('monthly');
  const [dateRange, setDateRange] = useState({ startDate: '', endDate: '' });

  // 1) 마운트 시 기본 날짜 범위(지난 1년치) 세팅
  useEffect(() => {
    const today = new Date();
    const lastYear = new Date(today.getFullYear() - 1, today.getMonth(), 1);
    setDateRange({
      startDate: lastYear.toISOString().split('T')[0],
      endDate: today.toISOString().split('T')[0],
    });
  }, [hotelId]);

  // 2) salesType 또는 dateRange 바뀔 때마다 새로 조회
  useEffect(() => {
    const { startDate, endDate } = dateRange;
    if (startDate && endDate) {
      getSales(salesType, startDate, endDate);
    }
  }, [getSales, salesType, dateRange]);

  return (
    <div className="sales-details">
      <h3>{hotelName} 매출 정보</h3>

      <div className="sales-filter">
        <label htmlFor={`sales-type-${hotelId}`}>매출 보기: </label>
        <select
          id={`sales-type-${hotelId}`}
          value={salesType}
          onChange={(e) => setSalesType(e.target.value)}
        >
          <option value="daily">일별</option>
          <option value="monthly">월별</option>
        </select>

        <label style={{ marginLeft: 10 }}>
          시작:
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, startDate: e.target.value }))
            }
          />
        </label>
        <label style={{ marginLeft: 10 }}>
          끝:
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) =>
              setDateRange((prev) => ({ ...prev, endDate: e.target.value }))
            }
          />
        </label>
      </div>

      {isLoading && <LoadingSpinner />}

      {!isLoading && salesData && (
        <SalesChart salesData={salesData} type={salesType} />
      )}

      {!isLoading && !salesData && (
        <ErrorMessage message="매출 데이터를 불러올 수 없습니다." />
      )}
    </div>
  );
};

SalesDetails.propTypes = {
  hotelId: PropTypes.string.isRequired,
  hotelName: PropTypes.string.isRequired,
};

export default SalesDetails;
