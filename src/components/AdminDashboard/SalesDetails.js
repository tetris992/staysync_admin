// src/components/AdminDashboard/SalesDetails.js
// ✅ [완전판 v2.2] 청구서 + 예약 엑셀 전송(월별/전월/전체ZIP) 추가

import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useHotelSales } from '../../hooks/useHotelSales';
import {
  sendInvoiceAPI,
  markAsPaidAPI,
  fetchInvoiceHistoryAPI,
  // ✅ NEW
  sendReservationsMonthlyExcelAPI,
  sendReservationsAllExcelAPI,
} from '../../api/api';

import {
  FaMoneyBillWave,
  FaFileInvoiceDollar,
  FaCalendarAlt,
  FaCheckCircle,
  FaTimesCircle,
  FaList,
  FaPaperPlane,
  FaHistory,
  FaExclamationTriangle,
  FaRedo,
  FaPercentage,
  FaFileExcel,
  FaFileArchive,
  FaCopy,
  FaLink,
} from 'react-icons/fa';

import '../../styles/SalesDetails.css';

const SalesDetails = ({ hotelId, hotelName, approvalDate }) => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);

  const [isProcessing, setIsProcessing] = useState(false);

  // 할인율
  const [selectedDiscountRate, setSelectedDiscountRate] = useState(0);
  const [showDiscountSelector, setShowDiscountSelector] = useState(false);

  // 히스토리 모달
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState([]);

  // ✅ 엑셀 전송 결과
  const [excelSending, setExcelSending] = useState(false);
  const [lastExcelUrl, setLastExcelUrl] = useState('');
  const [lastExcelLabel, setLastExcelLabel] = useState('');

  const { salesData, isLoading, getSales } = useHotelSales(hotelId);

  useEffect(() => {
    getSales(year, month);
  }, [hotelId, year, month, getSales]);

  useEffect(() => {
    if (salesData?.promotion?.currentDiscountRate !== undefined) {
      setSelectedDiscountRate(salesData.promotion.currentDiscountRate);
    } else {
      setSelectedDiscountRate(0);
    }
  }, [salesData]);

  // 승인일 이전 이동 제한
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
    if (!canGoPrevMonth) return;
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const formatCurrency = (val) =>
    new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(val || 0);

  // 할인 계산
  const calculateWithDiscount = (originalAmount, discountRate) => {
    const discountAmount = Math.round((originalAmount || 0) * (discountRate / 100));
    return { discountAmount, finalAmount: (originalAmount || 0) - discountAmount };
  };

  // 청구서 발송
  const handleSendInvoice = async () => {
    if (!salesData?.billing) return;

    const isResend = salesData.billing.isSent;
    const currentDiscount = salesData.promotion?.currentDiscountRate || 0;
    const hasDiscountChange = selectedDiscountRate !== currentDiscount;
    const originalAmount = salesData.billing.originalAmount || salesData.billing.totalAmount || 0;

    let confirmMsg = '';

    if (isResend) {
      confirmMsg = hasDiscountChange
        ? `⚠️ 할인율이 ${currentDiscount}% → ${selectedDiscountRate}%로 변경됩니다.\n수정된 금액으로 재발송할까요?`
        : `⚠️ 청구서를 재발송할까요? (${salesData.billing.sentCount}회차)`;
    } else {
      const { finalAmount } = calculateWithDiscount(originalAmount, selectedDiscountRate);
      confirmMsg =
        selectedDiscountRate > 0
          ? `${hotelName}님에게 ${year}년 ${month}월 청구서를 발송합니다.\n\n` +
            `• 할인 전: ${formatCurrency(originalAmount)}\n` +
            `• 할인율: ${selectedDiscountRate}%\n` +
            `• 최종 금액: ${formatCurrency(finalAmount)}\n\n발송할까요?`
          : `${hotelName}님에게 ${year}년 ${month}월 청구서를 발송할까요?\n\n• 청구 금액: ${formatCurrency(
              originalAmount
            )}`;
    }

    if (!window.confirm(confirmMsg)) return;

    setIsProcessing(true);
    try {
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

  // 입금 확인/취소
  const handleMarkPaid = async (isPaid) => {
    const actionName = isPaid ? '입금 확인' : '입금 취소';
    if (!window.confirm(`정말 ${actionName} 처리할까요?`)) return;

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

  // 히스토리 조회
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

  // ✅ 엑셀: 선택월 전송(체크인 기준)
  const handleSendMonthlyExcel = async (targetYear, targetMonth, label) => {
    if (!window.confirm(`📎 ${label} 예약 엑셀(체크인 기준)을 전송할까요?`)) return;

    setExcelSending(true);
    setLastExcelUrl('');
    setLastExcelLabel(label);

    try {
      const resp = await sendReservationsMonthlyExcelAPI(hotelId, targetYear, targetMonth);
      const url = resp?.data?.url || resp?.url || resp?.data?.data?.url || '';
      setLastExcelUrl(url);

      alert(url ? `✅ 전송 완료!\n(링크도 생성됨)` : '✅ 전송 완료!');
    } catch (e) {
      alert(`❌ 엑셀 전송 실패: ${e.message}`);
    } finally {
      setExcelSending(false);
    }
  };

  // ✅ 엑셀: 전체 전송(월별 분리 ZIP)
  const handleSendAllExcelZip = async () => {
    if (!window.confirm(`📦 전체 예약 엑셀을 월별 분리 ZIP으로 전송할까요?\n(미래 예약 포함)`)) return;

    setExcelSending(true);
    setLastExcelUrl('');
    setLastExcelLabel('전체(월별분리 ZIP)');

    try {
      const resp = await sendReservationsAllExcelAPI(hotelId);
      const url = resp?.data?.url || resp?.url || resp?.data?.data?.url || '';
      setLastExcelUrl(url);
      alert(url ? `✅ 전송 완료!\n(링크도 생성됨)` : '✅ 전송 완료!');
    } catch (e) {
      alert(`❌ 전체 ZIP 전송 실패: ${e.message}`);
    } finally {
      setExcelSending(false);
    }
  };

  const copyUrl = async () => {
    if (!lastExcelUrl) return;
    try {
      await navigator.clipboard.writeText(lastExcelUrl);
      alert('✅ 링크가 클립보드에 복사되었습니다.');
    } catch (e) {
      alert('❌ 클립보드 복사 실패(브라우저 권한 확인)');
    }
  };

  // 화면 데이터
  const showingData = salesData || {};
  const { revenue = {}, danjamStats = {}, billing = {}, promotion = {} } = showingData;

  const originalAmount = billing.originalAmount || billing.totalAmount || 0;
  const isBeforeApprovalData = showingData.isBeforeApproval;
  const isBetaMonth = showingData.isBetaMonth || billing.isBetaMonth || false;

  const previewCalculation = useMemo(
    () => calculateWithDiscount(originalAmount, selectedDiscountRate),
    [originalAmount, selectedDiscountRate]
  );

  const discountOptions = promotion?.availableDiscountRates || [0, 10, 20, 30, 50, 100];

  // 전월 계산
  const prevYm = useMemo(() => {
    let y = year;
    let m = month - 1;
    if (m <= 0) {
      y -= 1;
      m = 12;
    }
    return { y, m, label: `${y}년 ${m}월(전월)` };
  }, [year, month]);

  return (
    <div
      className="sales-details-container"
      style={{
        opacity: isLoading ? 0.6 : 1,
        transition: 'opacity 0.3s ease',
        pointerEvents: isLoading ? 'none' : 'auto',
      }}
    >
      <div className="sales-details-header">
        <div className="header-top-row">
          <h4>📊 매출 및 청구 관리 ({hotelName})</h4>
        </div>

        <div className="month-picker">
          <button
            className="nav-btn"
            onClick={handlePrevMonth}
            disabled={!canGoPrevMonth}
            style={{
              cursor: !canGoPrevMonth ? 'not-allowed' : 'pointer',
              opacity: !canGoPrevMonth ? 0.5 : 1,
            }}
          >
            ◀
          </button>
          <span className="current-date">
            <FaCalendarAlt /> {year}년 {month}월
          </span>
          <button className="nav-btn" onClick={handleNextMonth}>
            ▶
          </button>
        </div>
      </div>

      <div className="sales-dashboard-grid">
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

        {!isBeforeApprovalData && isBetaMonth && (
          <div
            className="alert-box"
            style={{
              backgroundColor: '#f0f8ff',
              borderColor: '#4caf50',
              borderLeft: '4px solid #4caf50',
              color: '#2e7d32',
            }}
          >
            <div style={{ fontSize: '1.2rem' }}>✨</div>
            <div>
              <strong style={{ color: '#2e7d32' }}>베타 테스트 프로모션</strong>
              <p style={{ color: '#555' }}>서비스 최초 승인월로 베타 테스트 프로모션이 자동 적용됩니다. (100% 할인)</p>
            </div>
          </div>
        )}

        {/* 1) 월 매출 */}
        <div className="card">
          <div className="card-title">
            <div>
              <FaMoneyBillWave /> 월 매출 현황 (PMS)
            </div>
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

        {/* 2) 청구/수납 + 엑셀 전송 */}
        <div className="card">
          <div className="card-title">
            <div>
              <FaFileInvoiceDollar /> 청구 및 수납
            </div>
            <div style={{ display: 'flex', gap: '5px' }}>
              {billing.status === 'Paid' && <span className="status-badge-sm paid">입금 완료</span>}
              {billing.status === 'Billed' && <span className="status-badge-sm sent">발송됨</span>}
              {billing.status === 'Pending' && <span className="status-badge-sm draft">미발송</span>}
              {billing.isCarriedForward && <span className="status-badge-sm sent">이월됨</span>}
            </div>
          </div>

          {billing.carriedForwardAmount > 0 && (
            <div className="alert-box warning">
              <FaExclamationTriangle className="shrink-0" style={{ marginTop: '2px' }} />
              <div>
                <strong>⚠️ 이전 달 미결제 금액 합산</strong>
                <p>이전 달 미결제 {formatCurrency(billing.carriedForwardAmount)}이(가) 이번 달 청구에 포함되었습니다.</p>
              </div>
            </div>
          )}

          {billing.hasDifference && (
            <div className="alert-box error">
              <FaExclamationTriangle className="shrink-0" style={{ marginTop: '2px' }} />
              <div>
                <strong>⚠️ 금액 변동 감지</strong>
                <p>
                  청구 후 매출이 변경되었습니다. 차이:{' '}
                  {billing.amountDifference > 0 ? '+' : ''}
                  {formatCurrency(billing.amountDifference)}
                </p>
              </div>
            </div>
          )}

          <div className="billing-breakdown">
            <div className="row">
              <span>기본 플랫폼 사용료{billing.isProrataApplied ? ' *' : ''}</span>
              <span className={billing.baseFeeDiscount > 0 ? 'strike-through' : ''}>
                {formatCurrency(billing.isProrataApplied ? billing.proratedBaseFee : billing.baseFee)}
              </span>
            </div>

            {billing.isProrataApplied && (
              <div
                className="row"
                style={{ fontSize: '0.75rem', color: '#1976d2', marginBottom: '8px', paddingLeft: '8px' }}
              >
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

          {/* 할인율 선택 */}
          {!billing.isPaid && !isBeforeApprovalData && (
            <div
              style={{
                marginTop: '15px',
                padding: '15px',
                backgroundColor: isBetaMonth ? '#f0f8ff' : '#f0f2ff',
                borderRadius: '8px',
                border: isBetaMonth ? '2px solid #4caf50' : 'none',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '10px',
                  flexWrap: 'nowrap',
                }}
              >
                <strong
                  style={{
                    color: isBetaMonth ? '#2e7d32' : '#1a237e',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {isBetaMonth ? '✨' : <FaPercentage />} {isBetaMonth ? '베타 테스트 할인' : '프로모션 할인'}
                </strong>

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
                      maxWidth: '80px',
                    }}
                    onClick={() => setShowDiscountSelector(!showDiscountSelector)}
                  >
                    {showDiscountSelector ? '접기' : '변경'}
                  </button>
                )}
              </div>

              {isBetaMonth && (
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: '#555',
                    backgroundColor: 'white',
                    padding: '8px',
                    borderRadius: '6px',
                    marginBottom: '10px',
                    border: '1px solid #e0e0e0',
                  }}
                >
                  🎁 최초 승인월로 <strong style={{ color: '#2e7d32' }}>100% 할인</strong>이 자동 적용됩니다. 변경할 수 없습니다.
                </div>
              )}

              {showDiscountSelector && !isBetaMonth && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginBottom: '10px' }}>
                  {discountOptions.map((rate) => (
                    <button
                      key={rate}
                      onClick={() => setSelectedDiscountRate(rate)}
                      style={{
                        padding: '6px 0',
                        border: selectedDiscountRate === rate ? '2px solid #1a237e' : '1px solid #ddd',
                        backgroundColor: selectedDiscountRate === rate ? '#e3f2fd' : 'white',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: selectedDiscountRate === rate ? 'bold' : 'normal',
                        color: selectedDiscountRate === rate ? '#1a237e' : '#333',
                        fontSize: '0.8rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>
              )}

              {!isBetaMonth &&
                previewCalculation &&
                selectedDiscountRate !== (billing.promotionDiscountRate || 0) && (
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: '#666',
                      marginTop: '10px',
                      padding: '8px',
                      backgroundColor: 'white',
                      borderRadius: '6px',
                      border: '1px solid #e0e0e0',
                    }}
                  >
                    <div style={{ marginBottom: '4px', fontWeight: 'bold', color: '#333' }}>💡 적용 예상 금액:</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span>할인 전:</span>
                      <span>{formatCurrency(originalAmount)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px', color: '#d32f2f' }}>
                      <span>할인 ({selectedDiscountRate}%):</span>
                      <span>-{formatCurrency(previewCalculation.discountAmount)}</span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontWeight: 'bold',
                        color: '#1a237e',
                        paddingTop: '4px',
                        borderTop: '1px dashed #eee',
                      }}
                    >
                      <span>최종 합계:</span>
                      <span>{formatCurrency(previewCalculation.finalAmount + (billing.carriedForwardAmount || 0))}</span>
                    </div>
                  </div>
                )}

              {!showDiscountSelector && (
                <div style={{ fontSize: '0.8rem', color: '#666', display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    현재 설정: <strong style={{ color: isBetaMonth ? '#2e7d32' : '#333' }}>{selectedDiscountRate}%</strong>
                  </span>
                  {selectedDiscountRate > 0 && (
                    <span style={{ color: '#d32f2f' }}>
                      -{formatCurrency(billing.promotionDiscountAmount || previewCalculation.discountAmount)}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 청구 액션 */}
          <div className="billing-actions-vertical">
            {!billing.isPaid ? (
              <>
                <button
                  className={`action-btn primary ${billing.hasDifference ? 'alert' : ''}`}
                  onClick={handleSendInvoice}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    '처리 중...'
                  ) : (
                    <>
                      {billing.isSent ? <FaRedo /> : <FaPaperPlane />}
                      {billing.hasDifference
                        ? ' 수정된 금액으로 재발송'
                        : billing.isSent
                          ? ` 재발송 (${billing.sentCount}회)`
                          : ' 청구서 발송'}
                    </>
                  )}
                </button>

                {billing.isSent && (
                  <button className="action-btn success" onClick={() => handleMarkPaid(true)} disabled={isProcessing}>
                    <FaCheckCircle /> 입금 확인 처리
                  </button>
                )}
              </>
            ) : (
              <button className="action-btn danger outline" onClick={() => handleMarkPaid(false)} disabled={isProcessing}>
                <FaTimesCircle /> 입금 취소 (미수금 전환)
              </button>
            )}
          </div>

          <div className="history-link" onClick={handleViewHistory}>
            <FaHistory /> 히스토리 보기 {billing.sentCount > 0 && `(${billing.sentCount}회 발송됨)`}
          </div>

          {/* ✅ NEW: 예약 엑셀 전송 */}
          <div
            style={{
              marginTop: '14px',
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid #e5e5e5',
              background: '#fff',
            }}
          >
            <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <FaFileExcel /> 예약 엑셀 전송 (체크인 기준)
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              <button
                className="action-btn secondary"
                disabled={excelSending}
                onClick={() => handleSendMonthlyExcel(year, month, `${year}년 ${month}월`)}
                style={{ minWidth: 160 }}
              >
                <FaFileExcel /> 선택월 엑셀 전송
              </button>

              <button
                className="action-btn secondary"
                disabled={excelSending}
                onClick={() => handleSendMonthlyExcel(prevYm.y, prevYm.m, prevYm.label)}
                style={{ minWidth: 160 }}
              >
                <FaFileExcel /> 전월 엑셀 전송
              </button>

              <button
                className="action-btn secondary"
                disabled={excelSending}
                onClick={handleSendAllExcelZip}
                style={{ minWidth: 220 }}
              >
                <FaFileArchive /> 전체 예약 ZIP 전송(월별분리)
              </button>
            </div>

            {excelSending && <div style={{ marginTop: 8, fontSize: 12, color: '#666' }}>전송 중...</div>}

            {lastExcelUrl && (
              <div
                style={{
                  marginTop: 10,
                  padding: 10,
                  borderRadius: 8,
                  background: '#f7f8ff',
                  border: '1px solid #dde0ff',
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FaLink /> 링크 생성됨 ({lastExcelLabel})
                </div>
                <div style={{ wordBreak: 'break-all', color: '#1a237e' }}>{lastExcelUrl}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="action-btn secondary" style={{ height: 30, fontSize: 12 }} onClick={copyUrl}>
                    <FaCopy /> 링크 복사
                  </button>
                  <a
                    className="action-btn secondary"
                    style={{ height: 30, fontSize: 12, display: 'inline-flex', alignItems: 'center' }}
                    href={lastExcelUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FaLink /> 열기
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 3) 단잠 예약 상세 */}
        <div className="card full-width">
          <div className="card-title">
            <FaList /> 단잠 예약 상세 내역
          </div>
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
                  <tr>
                    <td colSpan="6" className="center">
                      내역이 없습니다.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 히스토리 모달 */}
      {showHistory && (
        <div className="modal-overlay" onClick={() => setShowHistory(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>📜 청구 및 수납 이력</h3>
              <button className="close-btn" onClick={() => setShowHistory(false)}>
                ✕
              </button>
            </div>
            <div className="history-list">
              {historyData.length === 0 ? (
                <p className="no-history">이력이 없습니다.</p>
              ) : (
                historyData.map((item, idx) => (
                  <div key={idx} className={`history-item ${item.action}`}>
                    <div className="history-icon">
                      {item.action === 'paid'
                        ? '💰'
                        : item.action === 'sent' || item.action === 'resent'
                          ? '📧'
                          : item.action === 'promotion_applied'
                            ? '✨'
                            : item.action === 'carried_forward'
                              ? '⚠️'
                              : item.action === 'recalculated'
                                ? '⚠️'
                                : '📝'}
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
                    {item.newAmount && <div className="history-amount">{formatCurrency(item.newAmount)}</div>}
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
  approvalDate: PropTypes.string,
};

export default SalesDetails;
