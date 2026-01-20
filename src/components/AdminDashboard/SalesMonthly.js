import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { subMonths, addMonths, format } from 'date-fns';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { useHotelSales } from '../../hooks/useHotelSales';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorMessage from '../common/ErrorMessage';
import './SalesMonthly.css';

const SalesMonthly = ({ hotelId, hotelName }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const { salesData, isLoading, error, getSales } = useHotelSales(hotelId);

  // ✅ [수정] year, month 파라미터로 변경
  useEffect(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth() + 1;
    getSales(year, month);
  }, [currentMonth, getSales]);

  const data = salesData?.byMonth || [];
  const hasData = Array.isArray(data) && data.length > 0;

  // 차트에 숨기지 않을 밴드(스택) 순서
  const bands = ['현장', '단잠', '대실', 'OTA', '야놀자', '여기어때'];
  const colors = ['#1a237e','#4caf50','#f44336','#ff9800','#3f51b5','#e91e63'];

  return (
    <div className="sales-monthly">
      <h3 className="sales-title">{hotelName} 월별 매출</h3>
      <div className="sales-header">
        <button onClick={() => setCurrentMonth(subMonths(currentMonth,1))}>
          <FaChevronLeft />
        </button>
        <span className="sales-month">
          {format(currentMonth, 'yyyy년 M월')}
        </span>
        <button onClick={() => setCurrentMonth(addMonths(currentMonth,1))}>
          <FaChevronRight />
        </button>
      </div>

      {isLoading && <LoadingSpinner />}

      {!isLoading && error && (
        <ErrorMessage message="월별 매출 데이터를 불러올 수 없습니다." />
      )}

      {!isLoading && !error && hasData && (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data} margin={{ top: 20, right: 30, bottom: 20, left: 0 }}>
            <CartesianGrid stroke="#eee" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value) => `₩ ${value.toLocaleString()}`} />
            <Legend />
            {bands.map((band, idx) => (
              <Bar
                key={band}
                dataKey={`bands.${band}`}
                name={band}
                stackId="a"
                fill={colors[idx]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}

      {!isLoading && !error && !hasData && (
        <p className="no-data">표시할 매출 데이터가 없습니다.</p>
      )}
    </div>
  );
};

SalesMonthly.propTypes = {
  hotelId:   PropTypes.string.isRequired,
  hotelName: PropTypes.string.isRequired,
};

export default SalesMonthly;