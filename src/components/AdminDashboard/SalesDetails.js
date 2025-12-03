// src/components/AdminDashboard/SalesDetails.js
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useHotelSales } from '../../hooks/useHotelSales';
import { sendInvoiceAPI } from '../../api/api'; // ✅ API 함수 임포트
import LoadingSpinner from '../common/LoadingSpinner';
import {
  FaMoneyBillWave,
  FaFileInvoiceDollar,
  FaCalendarAlt,
  FaSync,
  FaCheckCircle,
  FaTimesCircle,
  FaList,
  FaPaperPlane // 아이콘 추가
} from 'react-icons/fa';
import '../../styles/SalesDetails.css';

const SalesDetails = ({ hotelId, hotelName }) => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [isSending, setIsSending] = useState(false); // ✅ 발송 중 상태

  const { salesData, isLoading, getSales } = useHotelSales(hotelId);

  useEffect(() => {
    getSales(year, month);
  }, [hotelId, year, month, getSales]);

  const handlePrevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); } 
    else { setMonth(m => m - 1); }
  };

  const handleNextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); } 
    else { setMonth(m => m + 1); }
  };

  const formatCurrency = (val) => 
    new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val || 0);

  // ✅ [수정] 실제 청구서 발송 로직 연결
  const handleInvoice = async () => {
    if (!salesData?.billing) return;
    
    if (!window.confirm(`${hotelName}님에게 ${year}년 ${month}월 청구서를 이메일로 발송하시겠습니까?`)) {
      return;
    }

    setIsSending(true);
    try {
      await sendInvoiceAPI(hotelId, year, month);
      alert('✅ 청구서가 이메일로 성공적으로 발송되었습니다.');
    } catch (error) {
      alert(`❌ 발송 실패: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) return <div className="spinner-container"><LoadingSpinner /></div>;

  return (
    <div className="sales-details-container">
      {/* 헤더 */}
      <div className="sales-details-header">
        <h4>📊 매출 및 청구 관리 ({hotelName})</h4>
        <div className="month-picker">
          <button onClick={handlePrevMonth} className="nav-btn">◀</button>
          <span className="current-date"><FaCalendarAlt /> {year}년 {month}월</span>
          <button onClick={handleNextMonth} className="nav-btn">▶</button>
          <button onClick={() => getSales(year, month)} className="refresh-btn"><FaSync /></button>
        </div>
      </div>

      {!salesData ? (
        <p className="no-data-message">데이터가 없습니다.</p>
      ) : (
        <div className="sales-dashboard-grid">
          
          {/* 1. 매출 요약 카드 */}
          <div className="card revenue-card">
            <div className="card-title"><FaMoneyBillWave /> 월 매출 현황 (PMS)</div>
            <div className="revenue-row">
              <span className="label">총 매출 (전체)</span>
              <span className="value main">{formatCurrency(salesData.revenue?.total)}</span>
            </div>
            <div className="revenue-row sub">
              <span className="label">↳ 단잠 매출 (플랫폼 기여)</span>
              <span className="value highlight">{formatCurrency(salesData.revenue?.danjamTotal)}</span>
            </div>
            <div className="revenue-info">
              * 단잠 예약: 총 {salesData.danjamStats?.totalCount}건 / {salesData.danjamStats?.totalNights}박
            </div>
          </div>

          {/* 2. 청구서 카드 */}
          <div className="card billing-card">
            <div className="card-title"><FaFileInvoiceDollar /> 이번 달 청구 내역</div>
            
            <div className="billing-breakdown">
              {/* 기본료 */}
              <div className="row">
                <span>기본 플랫폼 사용료</span>
                <span className={salesData.billing?.baseFeeDiscount > 0 ? 'strike-through' : ''}>
                  {formatCurrency(salesData.billing?.baseFee)}
                </span>
              </div>
              {salesData.billing?.baseFeeDiscount > 0 && (
                <div className="row discount">
                  <span>↳ 할인 (단잠 100박 초과 무료)</span>
                  <span>-{formatCurrency(salesData.billing.baseFeeDiscount)}</span>
                </div>
              )}

              {/* 단잠 이용료 */}
              <div className="row">
                <span>단잠 이용료 ({salesData.danjamStats?.totalNights}박 × 1,000원)</span>
                <span className={salesData.billing?.usageFeeDiscount > 0 ? 'strike-through' : ''}>
                  {formatCurrency(salesData.billing?.rawUsageFee)}
                </span>
              </div>
              {salesData.billing?.usageFeeDiscount > 0 && (
                <div className="row discount">
                  <span>↳ 상한제 할인 (최대 50만원)</span>
                  <span>-{formatCurrency(salesData.billing.usageFeeDiscount)}</span>
                </div>
              )}

              <hr className="divider" />

              <div className="row">
                <span>공급가액</span>
                <span>{formatCurrency(salesData.billing?.subTotal)}</span>
              </div>
              <div className="row vat">
                <span>부가세 (10%)</span>
                <span>{formatCurrency(salesData.billing?.vat)}</span>
              </div>
            </div>

            <div className="total-display">
              <span>청구 금액</span>
              <span className="amount">{formatCurrency(salesData.billing?.totalAmount)}</span>
            </div>

            <div className="billing-actions">
              <div className={`status-badge ${salesData.billing?.isPaid ? 'paid' : 'unpaid'}`}>
                {salesData.billing?.isPaid ? <FaCheckCircle /> : <FaTimesCircle />}
                {salesData.billing?.isPaid ? '결제 완료' : '미결제'}
              </div>
              <button 
                className="invoice-btn" 
                onClick={handleInvoice} 
                disabled={isSending} // 발송 중 클릭 방지
                style={{ opacity: isSending ? 0.7 : 1, cursor: isSending ? 'not-allowed' : 'pointer' }}
              >
                {isSending ? '발송 중...' : <><FaPaperPlane style={{marginRight: 6}}/> 청구서 발행</>}
              </button>
            </div>
          </div>

          {/* 3. 단잠 예약 상세 리스트 (테이블) */}
          <div className="card full-width">
            <div className="card-title"><FaList /> 단잠 예약 상세 내역</div>
            <div className="table-container">
              <table className="details-table">
                <thead>
                  <tr>
                    <th>체크인</th>
                    <th>객실호수</th>
                    <th>객실타입</th>
                    <th>고객명</th>
                    <th>숙박일수</th>
                    <th>결제금액</th>
                  </tr>
                </thead>
                <tbody>
                  {salesData.danjamStats?.breakdown?.length > 0 ? (
                    salesData.danjamStats.breakdown.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.checkIn}</td>
                        <td>{item.roomNumber}호</td>
                        <td>{item.roomType}</td>
                        <td>{item.customerName}</td>
                        <td className="center">{item.nights}박</td>
                        <td className="right">{formatCurrency(item.price)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="6" className="center">단잠 예약 내역이 없습니다.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

SalesDetails.propTypes = {
  hotelId: PropTypes.string.isRequired,
  hotelName: PropTypes.string.isRequired,
};

export default SalesDetails;