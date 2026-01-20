// src/components/AdminDashboard/SalesDetails.js
// ✅ [완전판 v2.1] UI 깨짐 수정 (버튼 겹침 방지)

import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { useHotelSales } from '../../hooks/useHotelSales';
import { 
  sendInvoiceAPI, 
  markAsPaidAPI, 
  fetchInvoiceHistoryAPI 
} from '../../api/api';
import {
  FaMoneyBillWave,
  FaFileInvoiceDollar,
  FaCalendarAlt,
  // FaSync,
  FaCheckCircle,
  FaTimesCircle,
  FaList,
  FaPaperPlane,
  FaHistory,
  FaExclamationTriangle,
  FaRedo,
  FaPercentage
} from 'react-icons/fa';
import '../../styles/SalesDetails.css';

const SalesDetails = ({ hotelId, hotelName, approvalDate }) => { // ✅ approvalDate 추가
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // ✅ 프로모션 할인율 선택 상태
  const [selectedDiscountRate, setSelectedDiscountRate] = useState(0); // 초기값 0
  const [showDiscountSelector, setShowDiscountSelector] = useState(false);
  
  // 히스토리 모달
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState([]);

  const { salesData, isLoading, getSales } = useHotelSales(hotelId);

  useEffect(() => {
    getSales(year, month);
  }, [hotelId, year, month, getSales]);

  // ✅ 데이터 로드 시 현재 할인율 설정
  useEffect(() => {
    if (salesData?.promotion?.currentDiscountRate !== undefined) {
      setSelectedDiscountRate(salesData.promotion.currentDiscountRate);
    } else {
      setSelectedDiscountRate(0); // 기본값
    }
  }, [salesData]);

  // ✅ [신규] 승인일 체크 - 승인일 이전으로 이동 불가
  const approvalYear = approvalDate ? new Date(approvalDate).getFullYear() : null;
  const approvalMonth = approvalDate ? new Date(approvalDate).getMonth() + 1 : null;
  
  const isBeforeApproval = (y, m) => {
    if (!approvalYear || !approvalMonth) return false;
    return y < approvalYear || (y === approvalYear && m < approvalMonth);
  };
  
  const canGoPrevMonth = !isBeforeApproval(
    month === 1 ? year - 1 : year,
    month === 1 ? 12 : month - 1
  );

  const handlePrevMonth = () => {
    if (!canGoPrevMonth) return; // ✅ 승인일 이전으로 이동 방지
    if (month === 1) { setYear(y => y - 1); setMonth(12); } 
    else { setMonth(m => m - 1); }
  };

  const handleNextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); } 
    else { setMonth(m => m + 1); }
  };

  const formatCurrency = (val) => 
    new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val || 0);

  // ------------------------------------------------------------------
  // 🎯 할인율 선택 및 계산
  // ------------------------------------------------------------------
  
  const handleDiscountRateChange = (rate) => {
    setSelectedDiscountRate(rate);
  };

  const calculateWithDiscount = (originalAmount, discountRate) => {
    const discountAmount = Math.round((originalAmount || 0) * (discountRate / 100));
    return {
      discountAmount,
      finalAmount: (originalAmount || 0) - discountAmount
    };
  };

  // ------------------------------------------------------------------
  // 🚀 액션 핸들러
  // ------------------------------------------------------------------

  // 1. 청구서 발송 (할인율 적용)
  const handleSendInvoice = async () => {
    if (!salesData?.billing) return;
    
    const isResend = salesData.billing.isSent;
    const currentDiscount = salesData.promotion?.currentDiscountRate || 0;
    const hasDiscountChange = selectedDiscountRate !== currentDiscount;
    const originalAmount = salesData.billing.originalAmount || salesData.billing.totalAmount; // fallback
    
    let confirmMsg = '';
    
    if (isResend) {
      confirmMsg = hasDiscountChange
        ? `⚠️ 할인율이 ${currentDiscount}%에서 ${selectedDiscountRate}%로 변경됩니다.\n수정된 금액으로 재발송하시겠습니까?`
        : `⚠️ 청구서를 재발송하시겠습니까? (${salesData.billing.sentCount}회차)`;
    } else {
      const { finalAmount } = calculateWithDiscount(originalAmount, selectedDiscountRate);
      
      confirmMsg = selectedDiscountRate > 0
        ? `${hotelName}님에게 ${year}년 ${month}월 청구서를 발송합니다.\n\n` +
          `• 할인 전: ${formatCurrency(originalAmount)}\n` +
          `• 할인율: ${selectedDiscountRate}%\n` +
          `• 최종 금액: ${formatCurrency(finalAmount)}\n\n` +
          `발송하시겠습니까?`
        : `${hotelName}님에게 ${year}년 ${month}월 청구서를 발송하시겠습니까?\n\n` +
          `• 청구 금액: ${formatCurrency(originalAmount)}`;
    }

    if (!window.confirm(confirmMsg)) return;

    setIsProcessing(true);
    try {
      // API 호출 시 할인율 파라미터 전달 필요 (백엔드 API가 지원해야 함)
      await sendInvoiceAPI(hotelId, year, month, selectedDiscountRate);
      alert(isResend ? '✅ 청구서가 재발송되었습니다.' : '✅ 청구서가 발송되었습니다.');
      getSales(year, month);
      setShowDiscountSelector(false);
    } catch (error) {
      alert(`❌ 발송 실패: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. 입금 확인 / 취소
  const handleMarkPaid = async (isPaid) => {
    const actionName = isPaid ? '입금 확인' : '입금 취소';
    
    if (!window.confirm(`정말 ${actionName} 처리하시겠습니까?`)) return;

    setIsProcessing(true);
    try {
      await markAsPaidAPI(hotelId, year, month, isPaid);
      alert(`✅ ${actionName} 처리되었습니다.`);
      getSales(year, month);
    } catch (error) {
      alert(`❌ ${actionName} 실패: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. 히스토리 조회
  const handleViewHistory = async () => {
    setIsProcessing(true);
    try {
      const result = await fetchInvoiceHistoryAPI(hotelId, year, month);
      setHistoryData(result.history || []);
      setShowHistory(true);
    } catch (error) {
      alert(`❌ 히스토리 조회 실패: ${error.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // ------------------------------------------------------------------
  // 🎨 렌더링
  // ------------------------------------------------------------------
  
  // ✅ [개선] 로딩 시 기존 데이터 유지, opacity만 조절
  const showingData = salesData || {};
  const { revenue = {}, danjamStats = {}, billing = {}, promotion = {} } = showingData;
  const originalAmount = billing.originalAmount || billing.totalAmount || 0;
  
  // ✅ 승인일 이전 메시지 표시
  const isBeforeApprovalData = showingData.isBeforeApproval;
  
  // ✅ 베타 월 체크
  const isBetaMonth = showingData.isBetaMonth || billing.isBetaMonth || false;
  
  // ✅ 할인 적용 계산 미리보기
  const previewCalculation = calculateWithDiscount(originalAmount, selectedDiscountRate);

  // 할인율 옵션 (기본값)
  const discountOptions = promotion?.availableDiscountRates || [0, 10, 20, 30, 50, 100];

  return (
    <div className="sales-details-container" style={{ 
      opacity: isLoading ? 0.6 : 1,  // ✅ 로딩 시 투명도 조절
      transition: 'opacity 0.3s ease',
      pointerEvents: isLoading ? 'none' : 'auto' // ✅ 로딩 중 클릭 방지
    }}>
      {/* 헤더 영역 수정 */}
      <div className="sales-details-header">
        {/* ✅ [수정] 제목과 새로고침 버튼을 한 줄에 배치 */}
        <div className="header-top-row">
          <h4>📊 매출 및 청구 관리 ({hotelName})</h4>
          {/* <button 
            className="refresh-btn-top" 
            onClick={() => getSales(year, month)} 
            aria-label="새로고침"
            title="데이터 새로고침"
          > */}
            {/* <FaSync />
          </button> */}
        </div>
        
        {/* 월 선택기 (새로고침 버튼 제거됨) */}
        <div className="month-picker">
          <button 
            className="nav-btn" 
            onClick={handlePrevMonth} 
            disabled={!canGoPrevMonth}
            style={{ 
              cursor: !canGoPrevMonth ? 'not-allowed' : 'pointer',
              opacity: !canGoPrevMonth ? 0.5 : 1 
            }}
          >
            ◀
          </button>
          <span className="current-date">
            <FaCalendarAlt /> {year}년 {month}월
          </span>
          <button className="nav-btn" onClick={handleNextMonth}>▶</button>
          
          {/* ❌ 기존 위치의 refresh-btn 제거됨 */}
        </div>
      </div>

      {/* 메인 그리드 */}
      <div className="sales-dashboard-grid">
        
        {/* ✅ [신규] 승인일 이전 안내 */}
        {isBeforeApprovalData && (
          <div className="alert-box warning">
            <FaExclamationTriangle style={{ marginTop: '2px' }} />
            <div>
              <strong>⚠️ 서비스 승인 이전</strong>
              <p>
                {year}년 {month}월은 서비스 승인일 이전입니다. 청구가 발생하지 않습니다.
                <br />
                (승인일: {approvalDate ? new Date(approvalDate).toLocaleDateString('ko-KR') : '미확인'})
              </p>
            </div>
          </div>
        )}

        {/* ✅ [신규] 베타 월 안내 */}
        {!isBeforeApprovalData && isBetaMonth && (
          <div className="alert-box" style={{ 
            backgroundColor: '#f0f8ff', 
            borderColor: '#4caf50',
            borderLeft: '4px solid #4caf50',
            color: '#2e7d32' 
          }}>
            <div style={{ fontSize: '1.2rem' }}>✨</div>
            <div>
              <strong style={{ color: '#2e7d32' }}>베타 테스트 프로모션</strong>
              <p style={{ color: '#555' }}>
                서비스 최초 승인월로 베타 테스트 프로모션이 자동 적용됩니다. (100% 할인)
              </p>
            </div>
          </div>
        )}
        
        {/* 1. 월 매출 현황 카드 */}
        <div className="card">
          <div className="card-title">
            <div><FaMoneyBillWave /> 월 매출 현황 (PMS)</div>
          </div>
          
          <div className="revenue-row">
            <span className="label">총 매출 (전체)</span>
            <span className="value main">{formatCurrency(revenue?.total)}</span>
          </div>
          
          <div className="revenue-row sub">
            <span className="label">↳ 단잠 매출 (플랫폼 기여)</span>
            <span className="value highlight">{formatCurrency(revenue?.danjamTotal)}</span>
          </div>
          
          <div className="revenue-info">
            * 단잠 예약: 총 {danjamStats?.totalCount || 0}건 / {danjamStats?.totalNights || 0}박
          </div>
        </div>

        {/* 2. 청구 및 수납 카드 */}
        <div className="card">
          <div className="card-title">
            <div><FaFileInvoiceDollar /> 청구 및 수납</div>
            <div style={{ display: 'flex', gap: '5px' }}>
              {billing.status === 'Paid' && <span className="status-badge-sm paid">입금 완료</span>}
              {billing.status === 'Billed' && <span className="status-badge-sm sent">발송됨</span>}
              {billing.status === 'Pending' && <span className="status-badge-sm draft">미발송</span>}
              {billing.isCarriedForward && <span className="status-badge-sm sent">이월됨</span>}
            </div>
          </div>

          {/* ✅ 미결제 이월 경고 */}
          {billing.carriedForwardAmount > 0 && (
            <div className="alert-box warning">
              <FaExclamationTriangle className="shrink-0" style={{ marginTop: '2px' }} />
              <div>
                <strong>⚠️ 이전 달 미결제 금액 합산</strong>
                <p>이전 달 미결제 {formatCurrency(billing.carriedForwardAmount)}이(가) 이번 달 청구에 포함되었습니다.</p>
              </div>
            </div>
          )}

          {/* ✅ 금액 차이 경고 */}
          {billing.hasDifference && (
            <div className="alert-box error">
              <FaExclamationTriangle className="shrink-0" style={{ marginTop: '2px' }} />
              <div>
                <strong>⚠️ 금액 변동 감지</strong>
                <p>
                  청구 후 매출이 변경되었습니다. 
                  차이: {billing.amountDifference > 0 ? '+' : ''}{formatCurrency(billing.amountDifference)}
                </p>
              </div>
            </div>
          )}

          {/* 청구 내역 */}
          <div className="billing-breakdown">
            <div className="row">
              <span>기본 플랫폼 사용료{billing.isProrataApplied ? ' *' : ''}</span>
              <span className={billing.baseFeeDiscount > 0 ? 'strike-through' : ''}>
                {formatCurrency(billing.isProrataApplied ? billing.proratedBaseFee : billing.baseFee)}
              </span>
            </div>
            
            {/* ✅ 일할계산 안내 */}
            {billing.isProrataApplied && (
              <div className="row" style={{ fontSize: '0.75rem', color: '#1976d2', marginBottom: '8px', paddingLeft: '8px' }}>
                <span>* {billing.prorataNote}</span>
              </div>
            )}
            
            {billing.baseFeeDiscount > 0 && (
              <div className="row discount">
                <span>↳ 할인 적용</span>
                <span>-{formatCurrency(billing.baseFeeDiscount)}</span>
              </div>
            )}

            <div className="row">
              <span>단잠 이용료 ({billing.danjamNights}박)</span>
              <span className={billing.usageFeeDiscount > 0 ? 'strike-through' : ''}>
                {formatCurrency(billing.rawUsageFee)}
              </span>
            </div>
            {billing.usageFeeDiscount > 0 && (
              <div className="row discount">
                <span>↳ 상한제 할인</span>
                <span>-{formatCurrency(billing.usageFeeDiscount)}</span>
              </div>
            )}

            <hr className="divider" />

            {/* ✅ 프로모션 할인 표시 (이미 발송된 경우) */}
            {billing.promotionDiscountRate > 0 && billing.isSent && (
              <>
                <div className="row">
                  <span>할인 전 금액</span>
                  <span className="strike-through">{formatCurrency(billing.originalAmount)}</span>
                </div>
                <div className="row discount">
                  <span>✨ 프로모션 할인 ({billing.promotionDiscountRate}%)</span>
                  <span>-{formatCurrency(billing.promotionDiscountAmount)}</span>
                </div>
              </>
            )}

            {/* ✅ 이월 금액 표시 */}
            {billing.carriedForwardAmount > 0 && (
              <div className="row" style={{ color: '#ef6c00', fontWeight: 'bold' }}>
                <span>⚠️ 이전 달 미결제</span>
                <span>+{formatCurrency(billing.carriedForwardAmount)}</span>
              </div>
            )}

            <div className="total-display">
              <span>최종 청구 금액</span>
              <span className="amount">{formatCurrency(billing.totalAmount)}</span>
            </div>
          </div>

          {/* ✅ 프로모션 할인율 선택기 (발송 전에만 표시) */}
          {!billing.isPaid && !isBeforeApprovalData && (
            <div style={{ marginTop: '15px', padding: '15px', backgroundColor: isBetaMonth ? '#f0f8ff' : '#f0f2ff', borderRadius: '8px', border: isBetaMonth ? '2px solid #4caf50' : 'none' }}>
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: '10px',
                flexWrap: 'nowrap' // 🚨 줄바꿈 방지
              }}>
                <strong style={{ color: isBetaMonth ? '#2e7d32' : '#1a237e', display: 'flex', alignItems: 'center', gap: '5px', whiteSpace: 'nowrap' }}>
                  {isBetaMonth ? '✨' : <FaPercentage />} {isBetaMonth ? '베타 테스트 할인' : '프로모션 할인'}
                </strong>
                
                {/* 🚨 버튼 UI 깨짐 방지: flex-shrink-0, white-space-nowrap */}
                {/* ✅ 베타 월이 아니고 발송 전일 때만 변경 버튼 표시 */}
                {!billing.isSent && !isBetaMonth && (
                  <button 
                    className="action-btn secondary" 
                    style={{ 
                      padding: '4px 10px', 
                      fontSize: '0.75rem', 
                      height: '28px',
                      flexShrink: 0, 
                      whiteSpace: 'nowrap',
                      minWidth: '50px',
                      maxWidth: '80px'
                    }}
                    onClick={() => setShowDiscountSelector(!showDiscountSelector)}
                  >
                    {showDiscountSelector ? '접기' : '변경'}
                  </button>
                )}
              </div>

              {/* ✅ 베타 월 안내 */}
              {isBetaMonth && (
                <div style={{ 
                  fontSize: '0.8rem', 
                  color: '#555', 
                  backgroundColor: 'white', 
                  padding: '8px', 
                  borderRadius: '6px',
                  marginBottom: '10px',
                  border: '1px solid #e0e0e0'
                }}>
                  🎁 최초 승인월로 <strong style={{ color: '#2e7d32' }}>100% 할인</strong>이 자동 적용됩니다. 변경할 수 없습니다.
                </div>
              )}

              {showDiscountSelector && !isBetaMonth && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '10px' }}>
                  {discountOptions.map(rate => (
                    <button
                      key={rate}
                      onClick={() => handleDiscountRateChange(rate)}
                      style={{
                        padding: '6px 0',
                        border: selectedDiscountRate === rate ? '2px solid #1a237e' : '1px solid #ddd',
                        backgroundColor: selectedDiscountRate === rate ? '#e3f2fd' : 'white',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: selectedDiscountRate === rate ? 'bold' : 'normal',
                        color: selectedDiscountRate === rate ? '#1a237e' : '#333',
                        fontSize: '0.8rem',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              )}

              {/* 할인 미리보기 (변경 중일 때만 표시, 베타 월 제외) */}
              {!isBetaMonth && previewCalculation && selectedDiscountRate !== (billing.promotionDiscountRate || 0) && (
                <div style={{ fontSize: '0.8rem', color: '#666', marginTop: '10px', padding: '8px', backgroundColor: 'white', borderRadius: '6px', border: '1px solid #e0e0e0' }}>
                  <div style={{ marginBottom: '4px', fontWeight: 'bold', color: '#333' }}>
                    💡 적용 예상 금액:
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span>할인 전:</span>
                    <span>{formatCurrency(originalAmount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', color: '#d32f2f' }}>
                    <span>할인 ({selectedDiscountRate}%):</span>
                    <span>-{formatCurrency(previewCalculation.discountAmount)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: '#1a237e', paddingTop: '4px', borderTop: '1px dashed #eee' }}>
                    <span>최종 합계:</span>
                    <span>{formatCurrency(previewCalculation.finalAmount + (billing.carriedForwardAmount || 0))}</span>
                  </div>
                </div>
              )}

              {!showDiscountSelector && (
                <div style={{ fontSize: '0.8rem', color: '#666', display: 'flex', justifyContent: 'space-between' }}>
                  <span>현재 설정: <strong style={{ color: isBetaMonth ? '#2e7d32' : '#333' }}>{selectedDiscountRate}%</strong></span>
                  {selectedDiscountRate > 0 && <span style={{color: '#d32f2f'}}>-{formatCurrency(billing.promotionDiscountAmount || previewCalculation.discountAmount)}</span>}
                </div>
              )}
            </div>
          )}

          {/* 액션 버튼 그룹 */}
          <div className="billing-actions-vertical">
            {!billing.isPaid ? (
              <>
                {/* 발송 / 재발송 버튼 */}
                <button 
                  className={`action-btn primary ${billing.hasDifference ? 'alert' : ''}`}
                  onClick={handleSendInvoice}
                  disabled={isProcessing}
                >
                  {isProcessing ? '처리 중...' : (
                    <>
                      {billing.isSent ? <FaRedo /> : <FaPaperPlane />}
                      {billing.hasDifference 
                        ? ' 수정된 금액으로 재발송' 
                        : (billing.isSent 
                            ? ` 재발송 (${billing.sentCount}회)` 
                            : ' 청구서 발송')}
                    </>
                  )}
                </button>

                {/* 입금 확인 버튼 */}
                {billing.isSent && (
                  <button 
                    className="action-btn success"
                    onClick={() => handleMarkPaid(true)}
                    disabled={isProcessing}
                  >
                    <FaCheckCircle /> 입금 확인 처리
                  </button>
                )}
              </>
            ) : (
              // 입금 취소 버튼
              <button 
                className="action-btn danger outline"
                onClick={() => handleMarkPaid(false)}
                disabled={isProcessing}
              >
                <FaTimesCircle /> 입금 취소 (미수금 전환)
              </button>
            )}
          </div>

          {/* 히스토리 버튼 */}
          <div className="history-link" onClick={handleViewHistory}>
            <FaHistory /> 히스토리 보기 {billing.sentCount > 0 && `(${billing.sentCount}회 발송됨)`}
          </div>
        </div>

        {/* 3. 단잠 예약 상세 리스트 */}
        <div className="card full-width">
          <div className="card-title"><FaList /> 단잠 예약 상세 내역</div>
          <div className="table-container">
            <table className="details-table">
              <thead>
                <tr>
                  <th>체크인</th>
                  <th>객실</th>
                  <th>타입</th>
                  <th>고객명</th>
                  <th>박수</th>
                  <th>금액</th>
                </tr>
              </thead>
              <tbody>
                {danjamStats?.breakdown?.length > 0 ? (
                  danjamStats.breakdown.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.checkIn}</td>
                      <td>{item.roomNumber}</td>
                      <td>{item.roomType}</td>
                      <td>{item.customerName}</td>
                      <td className="center">{item.nights}</td>
                      <td className="right">{formatCurrency(item.price)}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="6" className="center">내역이 없습니다.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* 히스토리 모달 */}
      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📜 청구 및 수납 이력</h3>
              <button className="close-btn" onClick={() => setShowHistory(false)}>✕</button>
            </div>
            <div className="history-list">
              {historyData.length === 0 ? (
                <p className="no-history">이력이 없습니다.</p>
              ) : (
                historyData.map((item, idx) => (
                  <div key={idx} className={`history-item ${item.action}`}>
                    <div className="history-icon">
                      {item.action === 'paid' ? '💰' : 
                       item.action === 'sent' || item.action === 'resent' ? '📧' : 
                       item.action === 'promotion_applied' ? '✨' :
                       item.action === 'carried_forward' ? '⚠️' :
                       item.action === 'recalculated' ? '⚠️' : '📝'}
                    </div>
                    <div className="history-info">
                      <div className="history-title">
                        {item.action === 'created' && '청구서 생성'}
                        {item.action === 'sent' && '이메일 발송'}
                        {item.action === 'resent' && '청구서 재발송'}
                        {item.action === 'paid' && '입금 확인 완료'}
                        {item.action === 'manual_paid' && '수동 입금 처리'}
                        {item.action === 'unpaid' && '입금 취소'}
                        {item.action === 'promotion_applied' && '프로모션 할인 적용'}
                        {item.action === 'carried_forward' && '미결제 이월'}
                        {item.action === 'recalculated' && '금액 변동 감지'}
                        {item.action === 'updated' && '정보 수정'}
                      </div>
                      <div className="history-meta">
                        {new Date(item.timestamp).toLocaleString()} | {item.performedBy}
                      </div>
                      {item.note && <div className="history-note">{item.note}</div>}
                    </div>
                    {item.newAmount && (
                      <div className="history-amount">{formatCurrency(item.newAmount)}</div>
                    )}
                  </div>
                ))
              )}
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
  approvalDate: PropTypes.string, // ✅ 승인일 추가
};

export default SalesDetails;