// src/components/AdminDashboard/SubscriptionPanel.js
// 어드민 대시보드 — 호텔 구독 관리 패널

import React, { useState, useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-toastify';
import {
  fetchHotelSubscriptionAPI,
  activateSubscriptionAPI,
  renewSubscriptionAPI,
  adminSuspendSubscriptionAPI,
  resumeSubscriptionAPI,
  cancelSubscriptionAPI,
  refundSubscriptionAPI,
  updateMonthlyCapAPI,
  setPromotionAPI,
  clearPromotionAPI,
} from '../../api/api';
import '../../styles/SubscriptionPanel.css';

const tierLabels = { basic: 'Basic', premium: 'Premium', platinum: 'Platinum' };
const tierColors = { basic: '#6b7280', premium: '#3b82f6', platinum: '#8b5cf6' };

const statusLabels = {
  pending: '승인 대기',
  active: '활성',
  suspended: '일시정지',
  expired: '만료',
  cancelled: '취소됨',
};
const statusColors = {
  pending: '#f59e0b',
  active: '#22c55e',
  suspended: '#f97316',
  expired: '#ef4444',
  cancelled: '#6b7280',
};

const formatMoney = (n) => (n || 0).toLocaleString('ko-KR') + '원';
const formatDate = (d) => (d ? new Date(d).toLocaleDateString('ko-KR') : '-');

const SubscriptionPanel = ({ hotelId, hotelName }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  // 환불 모달
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundNote, setRefundNote] = useState('');

  // 상한캡 변경
  const [showCapModal, setShowCapModal] = useState(false);
  const [newCap, setNewCap] = useState('');

  // 프로모션 설정 모달
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoRate, setPromoRate] = useState('20');
  const [promoStartYM, setPromoStartYM] = useState(''); // 'YYYY-MM' format
  const [promoEndYM, setPromoEndYM] = useState('');     // 'YYYY-MM' format
  const [promoReason, setPromoReason] = useState('');

  // 히스토리 토글
  const [showHistory, setShowHistory] = useState(false);

  const loadData = useCallback(async () => {
    if (!hotelId) return;
    try {
      setLoading(true);
      const result = await fetchHotelSubscriptionAPI(hotelId);
      setData(result);
    } catch (err) {
      console.error('[SubscriptionPanel] Load error:', err);
    } finally {
      setLoading(false);
    }
  }, [hotelId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const runAction = async (label, fn) => {
    try {
      setProcessing(true);
      await fn();
      toast.success(`${label} 완료`);
      await loadData();
    } catch (err) {
      toast.error(err.message || `${label} 실패`);
    } finally {
      setProcessing(false);
    }
  };

  const handleActivate = () => runAction('구독 활성화', () => activateSubscriptionAPI(hotelId));
  const handleRenew = () => runAction('구독 갱신', () => renewSubscriptionAPI(hotelId));
  const handleResume = () => runAction('구독 재개', () => resumeSubscriptionAPI(hotelId));

  const handleSuspend = () => {
    const note = window.prompt('일시정지 사유 (선택):');
    if (note === null) return;
    runAction('구독 일시정지', () => adminSuspendSubscriptionAPI(hotelId, note || '관리자 일시정지'));
  };

  const handleCancel = () => {
    if (!window.confirm('정말로 구독을 취소하시겠습니까?')) return;
    const note = window.prompt('취소 사유 (선택):');
    runAction('구독 취소', () => cancelSubscriptionAPI(hotelId, note || '관리자 취소'));
  };

  const handleRefundSubmit = () => {
    const amount = Number(refundAmount);
    if (!amount || amount <= 0) {
      toast.error('유효한 환불 금액을 입력하세요.');
      return;
    }
    runAction('환불 처리', () => refundSubscriptionAPI(hotelId, amount, refundNote));
    setShowRefundModal(false);
    setRefundAmount('');
    setRefundNote('');
  };

  const handleCapSubmit = () => {
    const cap = Number(newCap);
    if (!cap || cap < 200000 || cap > 2000000) {
      toast.error('상한캡은 200,000원 ~ 2,000,000원 사이여야 합니다.');
      return;
    }
    runAction('상한캡 변경', () => updateMonthlyCapAPI(hotelId, cap));
    setShowCapModal(false);
    setNewCap('');
  };

  const handlePromoSubmit = () => {
    const rate = Number(promoRate);
    if (!rate || rate < 1 || rate > 100) {
      toast.error('할인율은 1~100% 사이여야 합니다.');
      return;
    }
    if (!promoStartYM || !promoEndYM) {
      toast.error('시작월과 종료월을 선택해주세요.');
      return;
    }

    const [sY, sM] = promoStartYM.split('-').map(Number);
    const [eY, eM] = promoEndYM.split('-').map(Number);

    if (eY * 12 + eM < sY * 12 + sM) {
      toast.error('종료월은 시작월 이후여야 합니다.');
      return;
    }

    const duration = (eY * 12 + eM) - (sY * 12 + sM) + 1;
    if (duration > 36) {
      toast.error('프로모션 기간은 최대 36개월입니다.');
      return;
    }

    runAction('프로모션 설정', () => setPromotionAPI(hotelId, {
      discountRate: rate,
      startYear: sY,
      startMonth: sM,
      endYear: eY,
      endMonth: eM,
    reason: promoReason,
    }));
    setShowPromoModal(false);
    setPromoRate('20');
    setPromoStartYM('');
    setPromoEndYM('');
    setPromoReason('');
  };

  const handlePromoClear = () => {
    if (!window.confirm('계약 프로모션을 해제하시겠습니까?')) return;
    runAction('프로모션 해제', () => clearPromotionAPI(hotelId));
  };

  if (loading) {
    return (
      <div className="sub-panel-container">
        <div className="sub-panel-header">
          <h4>📦 구독 관리 ({hotelName})</h4>
        </div>
        <div className="sub-panel-loading">불러오는 중...</div>
      </div>
    );
  }

  const sub = data?.subscription;
  const cost = data?.costBreakdown;

  return (
    <div className="sub-panel-container">
      {/* 헤더 */}
      <div className="sub-panel-header">
        <h4>📦 구독 관리 ({hotelName})</h4>
      </div>

      <div className="sub-panel-scroll">
        {/* 구독 없음 */}
        {!sub && (
          <div className="card">
            <div className="sub-empty">
              <p>이 호텔은 아직 구독 신청 내역이 없습니다.</p>
            </div>
          </div>
        )}

        {/* 현재 구독 상태 */}
        {sub && (
          <>
            <div className="card">
              <div className="card-title">
                <span>현재 구독 상태</span>
              </div>

              <div className="sub-status-row">
                <span
                  className="sub-tier-badge"
                  style={{ backgroundColor: tierColors[sub.tier] || '#6b7280' }}
                >
                  {tierLabels[sub.tier] || sub.tier}
                </span>
                <span
                  className="sub-status-badge"
                  style={{
                    backgroundColor: `${statusColors[sub.status] || '#6b7280'}20`,
                    color: statusColors[sub.status] || '#6b7280',
                    border: `1px solid ${statusColors[sub.status] || '#6b7280'}40`,
                  }}
                >
                  {statusLabels[sub.status] || sub.status}
                </span>
                {sub.isFirstMonth && (
                  <span className="sub-promo-badge">첫달 무료</span>
                )}
              </div>

              <div className="sub-info-grid">
                <div className="sub-info-item">
                  <span className="sub-info-label">구독 OTA</span>
                  <span className="sub-info-value">
                    {sub.subscribedOTAs?.length > 0
                      ? sub.subscribedOTAs.join(', ')
                      : '없음'}
                  </span>
                </div>
                <div className="sub-info-item">
                  <span className="sub-info-label">상한캡</span>
                  <span className="sub-info-value">
                    {formatMoney(sub.monthlyCap)}
                    <button
                      className="sub-inline-btn"
                      onClick={() => { setNewCap(String(sub.monthlyCap || 500000)); setShowCapModal(true); }}
                      disabled={processing}
                    >
                      변경
                    </button>
                  </span>
                </div>
                {sub.cycleStart && (
                  <div className="sub-info-item">
                    <span className="sub-info-label">현재 주기</span>
                    <span className="sub-info-value">
                      {formatDate(sub.cycleStart)} ~ {formatDate(sub.cycleEnd)}
                      {sub.daysRemaining > 0 && ` (${sub.daysRemaining}일 남음)`}
                    </span>
                  </div>
                )}
                {sub.consentedAt && (
                  <div className="sub-info-item">
                    <span className="sub-info-label">이용동의</span>
                    <span className="sub-info-value">
                      {formatDate(sub.consentedAt)} ({sub.consentVersion || '-'})
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 요금 내역 */}
            {cost && (
              <div className="card">
                <div className="card-title">
                  <span>월 요금 내역 (당월 예상)</span>
                  <span className="sub-rooms-info">{data.totalRooms}실 / 도어락 {data.activeLockCount}개</span>
                </div>

                <div className="billing-breakdown">
                  {cost.isDanjamFreeApplied ? (
                    <>
                      <div className="row" style={{ color: '#999', textDecoration: 'line-through' }}>
                        <span>기본료</span>
                        <span>{formatMoney(cost.originalBaseFee || cost.baseFeeDiscount)}</span>
                      </div>
                      <div className="row" style={{ fontSize: '0.75rem', color: '#4caf50', paddingLeft: 8 }}>
                        <span>↳ 단잠 {cost.danjamNights}박 ≥ {cost.danjamFreeThreshold}건 기본료 면제</span>
                        <span>-{formatMoney(cost.baseFeeDiscount)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="row">
                      <span>기본료</span>
                      <span>{formatMoney(cost.baseFee)}</span>
                    </div>
                  )}
                  {cost.danjamUsageFee > 0 && (
                    <div className="row">
                      <span>단잠 이용료 ({cost.danjamNights || 0}박 x 1,000)</span>
                      <span>{formatMoney(cost.danjamUsageFee)}</span>
                    </div>
                  )}
                  {cost.danjamNights === 0 && (
                    <div className="row" style={{ color: '#999', fontSize: '0.8rem' }}>
                      <span>단잠 이용료 (0박)</span>
                      <span>0원</span>
                    </div>
                  )}
                  {cost.otaFee > 0 && (
                    <div className="row">
                      <span>OTA 연동 ({sub.subscribedOTAs?.length || 0}개)</span>
                      <span>{formatMoney(cost.otaFee)}</span>
                    </div>
                  )}
                  {cost.doorLockFee > 0 && (
                    <div className="row">
                      <span>도어락 ({data.activeLockCount}개)</span>
                      <span>{formatMoney(cost.doorLockFee)}</span>
                    </div>
                  )}
                  {cost.voiceBookingFee > 0 && (
                    <div className="row">
                      <span>AI 음성예약</span>
                      <span>{formatMoney(cost.voiceBookingFee)}</span>
                    </div>
                  )}
                  <div className="row" style={{ borderTop: '1px solid #eee', paddingTop: 6, marginTop: 4 }}>
                    <span>소계</span>
                    <span>{formatMoney(cost.subtotal)}</span>
                  </div>
                  {cost.isCapApplied && (
                    <div className="row discount">
                      <span>상한캡 적용 (최대 {formatMoney(cost.effectiveCap)})</span>
                      <span>{formatMoney(cost.cappedSubtotal)}</span>
                    </div>
                  )}
                  <div className="row">
                    <span>부가세 (10%)</span>
                    <span>{formatMoney(cost.vat)}</span>
                  </div>
                  {cost.contractPromotionRate > 0 && (
                    <>
                      <div className="row" style={{ borderTop: '1px solid #eee', paddingTop: 6, marginTop: 4, color: '#999' }}>
                        <span>할인 전</span>
                        <span style={{ textDecoration: 'line-through' }}>{formatMoney(cost.total)}</span>
                      </div>
                      <div className="row" style={{ color: '#8b5cf6' }}>
                        <span>계약 프로모션 (-{cost.contractPromotionRate}%)</span>
                        <span>-{formatMoney(cost.promotionDiscountAmount)}</span>
                      </div>
                    </>
                  )}
                  <div className="total-display">
                    <span>월 예상 요금</span>
                    <span style={{ fontWeight: 700, color: '#1a237e' }}>
                      {formatMoney(cost.contractPromotionRate > 0 ? cost.totalAfterPromotion : cost.total)}
                    </span>
                  </div>
                  {sub.isFirstMonth && (
                    <div className="sub-promo-note">첫달 무료 — 이번 주기 0원 청구</div>
                  )}
                </div>
              </div>
            )}

            {/* 계약 프로모션 상태 */}
            {sub.promotion?.discountRate > 0 && (
              <div className="card">
                <div className="card-title">
                  <span>계약 프로모션</span>
                  <span
                    className="sub-status-badge"
                    style={{
                      backgroundColor: sub.promotionStatus?.status === 'active' ? '#22c55e20' : sub.promotionStatus?.status === 'pending' ? '#f59e0b20' : '#6b728020',
                      color: sub.promotionStatus?.status === 'active' ? '#22c55e' : sub.promotionStatus?.status === 'pending' ? '#f59e0b' : '#6b7280',
                      border: `1px solid ${sub.promotionStatus?.status === 'active' ? '#22c55e40' : sub.promotionStatus?.status === 'pending' ? '#f59e0b40' : '#6b728040'}`,
                    }}
                  >
                    {sub.promotionStatus?.status === 'active' ? '적용 중'
                      : sub.promotionStatus?.status === 'pending' ? '예정'
                      : sub.promotionStatus?.status === 'expired' ? '만료' : '-'}
                  </span>
                </div>
                <div className="sub-info-grid">
                  <div className="sub-info-item">
                    <span className="sub-info-label">할인율</span>
                    <span className="sub-info-value" style={{ color: '#1a237e', fontWeight: 700 }}>{sub.promotion.discountRate}%</span>
                  </div>
                  <div className="sub-info-item">
                    <span className="sub-info-label">기간</span>
                    <span className="sub-info-value">
                      {sub.promotion.startYear}-{String(sub.promotion.startMonth).padStart(2, '0')} ~ {sub.promotion.endYear}-{String(sub.promotion.endMonth).padStart(2, '0')}
                      ({sub.promotion.durationMonths}개월)
                    </span>
                  </div>
                  {sub.promotionStatus?.remainingMonths > 0 && (
                    <div className="sub-info-item">
                      <span className="sub-info-label">남은 기간</span>
                      <span className="sub-info-value" style={{ color: '#3b82f6' }}>{sub.promotionStatus.remainingMonths}개월</span>
                    </div>
                  )}
                  {sub.promotion.reason && (
                    <div className="sub-info-item">
                      <span className="sub-info-label">사유</span>
                      <span className="sub-info-value">{sub.promotion.reason}</span>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                  <button
                    className="action-btn secondary"
                    onClick={() => {
                      // 기존 프로모션 값으로 pre-fill
                      setPromoRate(String(sub.promotion.discountRate || 20));
                      const sY = sub.promotion.startYear;
                      const sM = sub.promotion.startMonth;
                      const eY = sub.promotion.endYear;
                      const eM = sub.promotion.endMonth;
                      if (sY && sM) setPromoStartYM(`${sY}-${String(sM).padStart(2, '0')}`);
                      if (eY && eM) setPromoEndYM(`${eY}-${String(eM).padStart(2, '0')}`);
                      setPromoReason(sub.promotion.reason || '');
                      setShowPromoModal(true);
                    }}
                    disabled={processing}
                    style={{ fontSize: '0.8rem', padding: '4px 12px' }}
                  >
                    수정
                  </button>
                  <button
                    className="action-btn danger outline"
                    onClick={handlePromoClear}
                    disabled={processing}
                    style={{ fontSize: '0.8rem', padding: '4px 12px' }}
                  >
                    해제
                  </button>
                </div>
              </div>
            )}

            {/* 액션 버튼들 */}
            <div className="card">
              <div className="card-title">
                <span>관리 작업</span>
              </div>

              <div className="sub-actions">
                {/* 승인 대기 → 활성화 */}
                {sub.status === 'pending' && (
                  <button
                    className="action-btn primary"
                    onClick={handleActivate}
                    disabled={processing}
                  >
                    ✅ 구독 활성화 (결제 확인)
                  </button>
                )}

                {/* 활성 → 갱신/정지/취소 */}
                {sub.status === 'active' && (
                  <>
                    <button
                      className="action-btn success"
                      onClick={handleRenew}
                      disabled={processing}
                    >
                      🔄 구독 갱신
                    </button>
                    <button
                      className="action-btn secondary"
                      onClick={handleSuspend}
                      disabled={processing}
                    >
                      ⏸️ 일시정지
                    </button>
                    <button
                      className="action-btn danger outline"
                      onClick={handleCancel}
                      disabled={processing}
                    >
                      ❌ 구독 취소
                    </button>
                  </>
                )}

                {/* 일시정지 → 재개/취소 */}
                {sub.status === 'suspended' && (
                  <>
                    <button
                      className="action-btn primary"
                      onClick={handleResume}
                      disabled={processing}
                    >
                      ▶️ 구독 재개
                    </button>
                    <button
                      className="action-btn danger outline"
                      onClick={handleCancel}
                      disabled={processing}
                    >
                      ❌ 구독 취소
                    </button>
                  </>
                )}

                {/* 만료/취소 → 다시 활성화 */}
                {(sub.status === 'expired' || sub.status === 'cancelled') && (
                  <button
                    className="action-btn primary"
                    onClick={handleActivate}
                    disabled={processing}
                  >
                    ✅ 구독 재활성화
                  </button>
                )}

                {/* 프로모션 설정 */}
                <button
                  className="action-btn secondary"
                  onClick={() => setShowPromoModal(true)}
                  disabled={processing}
                >
                  🎁 프로모션 설정
                </button>

                {/* 환불 (모든 상태) */}
                <button
                  className="action-btn secondary"
                  onClick={() => setShowRefundModal(true)}
                  disabled={processing}
                >
                  💰 환불 처리
                </button>
              </div>
            </div>

            {/* 변경 이력 */}
            {sub.history?.length > 0 && (
              <div className="card">
                <div className="card-title">
                  <span>변경 이력</span>
                  <button
                    className="sub-inline-btn"
                    onClick={() => setShowHistory(!showHistory)}
                  >
                    {showHistory ? '접기' : `${sub.history.length}건 보기`}
                  </button>
                </div>

                {showHistory && (
                  <div className="sub-history-list">
                    {[...sub.history].reverse().map((h, i) => (
                      <div key={i} className="sub-history-item">
                        <div className="sub-history-meta">
                          <span className="sub-history-action">{h.action}</span>
                          <span className="sub-history-date">{formatDate(h.at)}</span>
                        </div>
                        {h.note && <div className="sub-history-note">{h.note}</div>}
                        <div className="sub-history-by">by {h.by || '-'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* 환불 모달 */}
      {showRefundModal && (
        <div className="modal-overlay" onClick={() => setShowRefundModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>💰 환불 처리</h3>
              <button className="close-btn" onClick={() => setShowRefundModal(false)}>✕</button>
            </div>
            <div className="sub-modal-body">
              <label>
                환불 금액 (원)
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder="예: 50000"
                  className="sub-input"
                />
              </label>
              <label>
                사유
                <input
                  type="text"
                  value={refundNote}
                  onChange={(e) => setRefundNote(e.target.value)}
                  placeholder="환불 사유 입력"
                  className="sub-input"
                />
              </label>
              <button
                className="action-btn primary"
                onClick={handleRefundSubmit}
                disabled={processing}
                style={{ marginTop: 12 }}
              >
                환불 실행
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 상한캡 변경 모달 */}
      {showCapModal && (
        <div className="modal-overlay" onClick={() => setShowCapModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>상한캡 변경</h3>
              <button className="close-btn" onClick={() => setShowCapModal(false)}>✕</button>
            </div>
            <div className="sub-modal-body">
              <label>
                월 상한캡 (원) — 200,000 ~ 2,000,000
                <input
                  type="number"
                  value={newCap}
                  onChange={(e) => setNewCap(e.target.value)}
                  placeholder="500000"
                  className="sub-input"
                  min={200000}
                  max={2000000}
                  step={50000}
                />
              </label>
              <button
                className="action-btn primary"
                onClick={handleCapSubmit}
                disabled={processing}
                style={{ marginTop: 12 }}
              >
                변경 적용
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 프로모션 설정 모달 */}
      {showPromoModal && (
        <div className="modal-overlay" onClick={() => setShowPromoModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🎁 계약 프로모션 설정</h3>
              <button className="close-btn" onClick={() => setShowPromoModal(false)}>✕</button>
            </div>
            <div className="sub-modal-body">
              <label>
                할인율 (1~100%)
                <input
                  type="number"
                  value={promoRate}
                  onChange={(e) => setPromoRate(e.target.value)}
                  placeholder="20"
                  className="sub-input"
                  min={1}
                  max={100}
                />
              </label>
              <div style={{ display: 'flex', gap: 12 }}>
                <label style={{ flex: 1 }}>
                  시작월
                  <input
                    type="month"
                    value={promoStartYM}
                    onChange={(e) => setPromoStartYM(e.target.value)}
                    className="sub-input"
                  />
                </label>
                <label style={{ flex: 1 }}>
                  종료월
                  <input
                    type="month"
                    value={promoEndYM}
                    onChange={(e) => setPromoEndYM(e.target.value)}
                    className="sub-input"
                    min={promoStartYM || undefined}
                  />
                </label>
              </div>
              {promoStartYM && promoEndYM && (() => {
                const [sY, sM] = promoStartYM.split('-').map(Number);
                const [eY, eM] = promoEndYM.split('-').map(Number);
                const dur = (eY * 12 + eM) - (sY * 12 + sM) + 1;
                return dur > 0 ? (
                  <div style={{ fontSize: '0.8rem', color: '#5b21b6', marginTop: 4 }}>
                    총 {dur}개월 적용
                  </div>
                ) : null;
              })()}
              <label>
                사유
                <input
                  type="text"
                  value={promoReason}
                  onChange={(e) => setPromoReason(e.target.value)}
                  placeholder="예: 신규가입 100% 할인, 레거시 전환 50% 할인"
                  className="sub-input"
                />
              </label>
              <button
                className="action-btn primary"
                onClick={handlePromoSubmit}
                disabled={processing}
                style={{ marginTop: 12 }}
              >
                프로모션 설정
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

SubscriptionPanel.propTypes = {
  hotelId: PropTypes.string.isRequired,
  hotelName: PropTypes.string.isRequired,
};

export default SubscriptionPanel;
