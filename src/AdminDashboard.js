import React, { useState, useEffect, useCallback } from 'react';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

import { fetchUsers, updateUserStatus, fetchHotelSales } from './api/api';
import socket from './socket';
import './AdminDashboard.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartDataLabels
);

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedHotelId, setExpandedHotelId] = useState(null);
  const [salesData, setSalesData] = useState({
    byDate: [],
    byMonth: [],
    byBand: {},
  });
  const [salesLoading, setSalesLoading] = useState(false);
  const [salesType, setSalesType] = useState('daily');
  const [socketStatus, setSocketStatus] = useState('연결 중...');

  const fetchUsersData = useCallback(async () => {
    setIsLoading(true);
    setError('');
    try {
      const data = await fetchUsers(filter);
      setUsers(data);
    } catch (err) {
      const message = err.status
        ? `오류 ${err.status}: ${err.message}`
        : `서버 연결 실패: ${err.message}`;
      setError(message);
      if (err.status === 401) {
        setTimeout(() => (window.location.href = '/login'), 2000);
      } else if (err.status === 403) {
        setError('관리자 권한이 없습니다.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token || token.split('.').length !== 3) {
      window.location.href = '/login';
      return;
    }

    fetchUsersData();

    const handleConnect = () => {
      setSocketStatus('WebSocket 연결됨');
    };

    const handleConnectError = () => {
      setSocketStatus('WebSocket 연결 실패');
    };

    const handleDisconnect = () => {
      setSocketStatus('WebSocket 연결 끊김');
    };

    socket.on('connect', handleConnect);
    socket.on('connect_error', handleConnectError);
    socket.on('disconnect', handleDisconnect);

    if (localStorage.getItem('accessToken')) {
      socket.connect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('connect_error', handleConnectError);
      socket.off('disconnect', handleDisconnect);
    };
  }, [fetchUsersData]);

  const handleToggleExpand = async (hotelId) => {
    if (expandedHotelId === hotelId) {
      setExpandedHotelId(null);
      setSalesData({ byDate: [], byMonth: [], byBand: {} });
      return;
    }

    setExpandedHotelId(hotelId);
    setSalesLoading(true);
    setError('');
    try {
      const startDate = '2025-01-01';
      const endDate = '2025-05-23';
      const [dailyData, monthlyData] = await Promise.all([
        fetchHotelSales(hotelId, 'daily', startDate, endDate),
        fetchHotelSales(hotelId, 'monthly', startDate, endDate),
      ]);
      setSalesData({
        byDate: dailyData.byDate || [],
        byMonth: monthlyData.byMonth || [],
        byBand: dailyData.byBand || {},
      });
    } catch (err) {
      setError(`매출 데이터 로드 실패: ${err.message || '알 수 없는 오류'}`);
    } finally {
      setSalesLoading(false);
    }
  };

  const handleUpdateStatus = async (hotelId, status) => {
    if (
      !window.confirm(
        `사용자 ${hotelId}의 상태를 ${status}(으)로 변경하시겠습니까?`
      )
    ) {
      return;
    }
    setError('');
    try {
      await updateUserStatus(hotelId, status);
      fetchUsersData();
      setExpandedHotelId(null);
    } catch (err) {
      const message = err.status
        ? `오류 ${err.status}: ${err.message}`
        : `상태 업데이트 실패: ${err.message}`;
      setError(message);
    }
  };

  const getChartData = (type) => {
    const data = type === 'daily' ? salesData.byDate : salesData.byMonth;
    const labels = data.map((item) =>
      type === 'daily' ? item.date : item.month
    );
    const bands = ['현장', '단잠', '대실', 'OTA', '야놀자', '여기어때'];
    const colors = [
      '#1a237e',
      '#4caf50',
      '#f44336',
      '#ff9800',
      '#3f51b5',
      '#e91e63',
    ];

    let datasets;

    if (type === 'daily') {
      datasets = bands.map((band, index) => ({
        label: band,
        data: data.map((item) => item.bands[band] || 0),
        backgroundColor: colors[index],
        borderColor: colors[index],
        borderWidth: 1,
        barThickness: 20,
      }));
    } else {
      datasets = bands.map((band, index) => ({
        label: band,
        data: data.map((item) => item.bands[band] || 0),
        backgroundColor: colors[index],
        borderColor: colors[index],
        borderWidth: 1,
        stack: 'Stack 0',
        barThickness: 30,
      }));
    }

    const totalRevenues = data.map((item) => {
      return Object.values(item.bands).reduce(
        (sum, value) => sum + (value || 0),
        0
      );
    });

    return {
      labels,
      datasets,
      totalRevenues,
    };
  };

  const chartOptions = (type, totalRevenues) => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            size: 12,
            family: "'Segoe UI', sans-serif",
          },
          color: '#333',
        },
      },
      title: {
        display: true,
        text: '밴드별 호텔 매출 추이',
        font: {
          size: 16,
          family: "'Segoe UI', sans-serif",
          weight: 'bold',
        },
        color: '#1a237e',
        padding: {
          top: 10,
          bottom: 20,
        },
      },
      datalabels: {
        display: true,
        color: '#333',
        anchor: 'end',
        align: 'top',
        formatter: (value, context) => {
          if (context.datasetIndex === 0) {
            return totalRevenues[context.dataIndex]?.toLocaleString() + '원';
          }
          return '';
        },
        font: {
          weight: 'bold',
          size: 12,
          family: "'Segoe UI', sans-serif",
        },
        offset: 5,
      },
    },
    scales: {
      x: {
        title: {
          display: true,
          text: type === 'daily' ? '날짜' : '월',
          font: {
            size: 14,
            family: "'Segoe UI', sans-serif",
          },
          color: '#333',
        },
        stacked: type === 'monthly',
        ticks: {
          font: {
            size: 12,
            family: "'Segoe UI', sans-serif",
          },
          color: '#555',
          maxRotation: 45,
          minRotation: 45,
          autoSkip: true,
          maxTicksLimit: 10,
        },
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: '매출 (원)',
          font: {
            size: 14,
            family: "'Segoe UI', sans-serif",
          },
          color: '#333',
        },
        stacked: type === 'monthly',
        ticks: {
          font: {
            size: 12,
            family: "'Segoe UI', sans-serif",
          },
          color: '#555',
          callback: (value) => value.toLocaleString() + '원',
        },
      },
    },
  });

  if (isLoading) {
    return (
      <div className="admin-dashboard">
        <h2>STAYSYNC DASHBOARD</h2>
        <p className="loading-text">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <h2>STAYSYNC DASHBOARD</h2>
      <p className="socket-status">소켓 상태: {socketStatus}</p>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <div className="filter-container">
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
      {users.length === 0 ? (
        <p className="no-data-message">사용자가 없습니다.</p>
      ) : (
        <div className="table-wrapper">
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
                <React.Fragment key={user.hotelId}>
                  <tr
                    onClick={() => handleToggleExpand(user.hotelId)}
                    className={
                      expandedHotelId === user.hotelId ? 'expanded' : ''
                    }
                  >
                    <td>{user.hotelId}</td>
                    <td>{user.hotelName}</td>
                    <td>{user.email}</td>
                    <td>{user.address}</td>
                    <td>{user.phoneNumber}</td>
                    <td>{user.status}</td>
                    <td>{user.isVerified ? '인증됨' : '미인증'}</td>
                    <td>
                      {user.activationDeadline
                        ? new Date(user.activationDeadline).toLocaleDateString(
                            'ko-KR'
                          )
                        : '-'}
                    </td>
                    <td>
                      {user.verificationExpiresAt
                        ? new Date(
                            user.verificationExpiresAt
                          ).toLocaleDateString('ko-KR')
                        : '-'}
                    </td>
                    <td>
                      {new Date(user.createdAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td>
                      {new Date(user.updatedAt).toLocaleDateString('ko-KR')}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {user.status !== 'active' && (
                        <button
                          onClick={() =>
                            handleUpdateStatus(user.hotelId, 'active')
                          }
                          className="action-button approve-button"
                          aria-label={`${user.hotelId} 승인`}
                        >
                          승인
                        </button>
                      )}
                      {user.status !== 'disabled' && (
                        <button
                          onClick={() =>
                            handleUpdateStatus(user.hotelId, 'disabled')
                          }
                          className="action-button suspend-button"
                          aria-label={`${user.hotelId} 중지`}
                        >
                          중지
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandedHotelId === user.hotelId && (
                    <tr className="expanded-details">
                      <td colSpan="12">
                        <div className="sales-details">
                          <h3>{user.hotelName} 매출 정보</h3>
                          <div className="sales-filter">
                            <label htmlFor="sales-type">매출 보기: </label>
                            <select
                              id="sales-type"
                              value={salesType}
                              onChange={(e) => setSalesType(e.target.value)}
                              aria-label="매출 타입"
                            >
                              <option value="daily">일별</option>
                              <option value="monthly">월별</option>
                            </select>
                          </div>
                          {salesLoading ? (
                            <p className="loading-text">
                              매출 데이터 로딩 중...
                            </p>
                          ) : salesData[
                              salesType === 'daily' ? 'byDate' : 'byMonth'
                            ].length === 0 ? (
                            <p className="no-data-message">
                              선택한 기간에 매출 데이터가 없습니다.
                            </p>
                          ) : (
                            <>
                              <div className="band-summary">
                                <h4>밴드별 총 매출</h4>
                                <ul>
                                  {Object.entries(salesData.byBand).map(
                                    ([band, revenue]) => (
                                      <li key={band}>
                                        {band}: {revenue.toLocaleString()}원
                                      </li>
                                    )
                                  )}
                                </ul>
                              </div>
                              <div className="chart-container">
                                <Bar
                                  data={getChartData(salesType)}
                                  options={chartOptions(
                                    salesType,
                                    getChartData(salesType).totalRevenues
                                  )}
                                />
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;