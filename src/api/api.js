// src/api/api.js
// ✅ [완전판 v2] 프로모션 API 추가 + WS_BASE_URL 자동 파생(export)

import axios from 'axios';
import ApiError from '../utils/ApiError';

// ------------------------------------------------------------
// Base URL 정규화
// - trailing slash 제거
// - 비어있으면 운영 기본값
// ------------------------------------------------------------
const normalizeBaseUrl = (url) => {
  const u = String(url || '').trim();
  if (!u) return 'https://staysync.org';
  return u.endsWith('/') ? u.slice(0, -1) : u;
};

const BASE_URL = normalizeBaseUrl(process.env.REACT_APP_API_BASE_URL);

// ------------------------------------------------------------
// Socket URL 파생 (http -> ws, https -> wss)
// - SocketContext에서 그대로 사용 가능하도록 export
// ------------------------------------------------------------
const toWsBaseUrl = (httpBase) => {
  const b = normalizeBaseUrl(httpBase);
  if (b.startsWith('https://')) return `wss://${b.slice('https://'.length)}`;
  if (b.startsWith('http://')) return `ws://${b.slice('http://'.length)}`;
  // 혹시 프로토콜 없이 들어오면 보수적으로 https로 간주
  if (!b.includes('://')) return `wss://${b}`;
  return b; // 예상 밖이면 그대로
};

export const WS_BASE_URL = toWsBaseUrl(BASE_URL);

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 15000,
});

console.log('[api] BASE_URL:', BASE_URL);
console.log('[api] WS_BASE_URL:', WS_BASE_URL);

let csrfTokenPromise = null;

// ======================================================================
// Axios Interceptors
// ======================================================================
api.interceptors.request.use(
  async (config) => {
    const token = window.localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const method = config.method?.toLowerCase();

    // GET 이외 요청은 CSRF 필요 (skipCsrf면 제외)
    if (method !== 'get' && !config.skipCsrf) {
      let csrfToken = window.localStorage.getItem('csrfToken');
      let csrfTokenId = window.localStorage.getItem('csrfTokenId');

      if (!csrfToken || !csrfTokenId) {
        if (!csrfTokenPromise) {
          console.log('[api] Fetching CSRF token for:', config.url);
          csrfTokenPromise = api.get('/api/csrf-token', { skipCsrf: true });
        }

        try {
          const { data } = await csrfTokenPromise;
          csrfToken = data.csrfToken;
          csrfTokenId = data.tokenId;
          window.localStorage.setItem('csrfToken', csrfToken);
          window.localStorage.setItem('csrfTokenId', csrfTokenId);
        } catch (error) {
          console.error(
            '[api] Failed to fetch CSRF token:',
            error.response?.data || error.message
          );
          throw error;
        } finally {
          csrfTokenPromise = null;
        }
      }

      config.headers['X-CSRF-Token'] = csrfToken;
      config.headers['X-CSRF-Token-Id'] = csrfTokenId;
    }

    return config;
  },
  (error) => {
    console.error('[api] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config || {};

    // 401: 토큰 refresh (admin login은 예외)
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      if (String(original.url || '').includes('/api/admin/login')) {
        console.error(
          '[api] Admin login failed:',
          error.response?.data?.message || 'Unauthorized'
        );
        return Promise.reject(error);
      }

      try {
        console.log('[api] Attempting to refresh token');
        const { data } = await api.post(
          '/api/auth/refresh-token',
          {},
          { skipCsrf: true }
        );
        window.localStorage.setItem('accessToken', data.accessToken);
        original.headers = original.headers || {};
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (e) {
        console.error('[api] Refresh token failed:', e.response?.data || e.message);
        window.localStorage.clear();
        window.location.href = '/login?error=session_expired';
        return Promise.reject(e);
      }
    }

    // 403: CSRF 토큰 재발급 후 1회 재시도
    if (error.response?.status === 403 && !original._retryCsrf && !original.skipCsrf) {
      original._retryCsrf = true;
      console.log('[api] Retrying request due to CSRF error');
      window.localStorage.removeItem('csrfToken');
      window.localStorage.removeItem('csrfTokenId');
      return api(original);
    }

    console.error(
      '[api] API Error:',
      error.response?.status,
      error.response?.data || error.message
    );
    return Promise.reject(error);
  }
);

const clearAuthData = () => {
  console.log('[api] Clearing auth data');
  document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  window.localStorage.removeItem('accessToken');
  window.localStorage.removeItem('csrfToken');
  window.localStorage.removeItem('csrfTokenId');
};

// ======================================================================
// 📊 Invoice 시스템 관련 API
// ======================================================================

export const fetchAdminHotelSales = async (hotelId, year, month) => {
  try {
    const response = await api.get(`/api/admin/users/${hotelId}/sales`, {
      params: { year, month },
    });
    return response.data.data;
  } catch (err) {
    console.error('[api] Fetch admin hotel sales error:', err.response?.data?.message || err.message);
    throw new ApiError(
      err.response?.status || 500,
      err.response?.data?.message || '매출 및 청구 데이터 조회 실패'
    );
  }
};

export const sendInvoiceAPI = async (hotelId, year, month, discountRate = 0) => {
  try {
    const response = await api.post(`/api/admin/users/${hotelId}/invoice`, {
      year,
      month,
      discountRate,
    });
    return response.data;
  } catch (err) {
    throw new ApiError(
      err.response?.status || 500,
      err.response?.data?.message || '청구서 발송에 실패했습니다.'
    );
  }
};

export const markAsPaidAPI = async (hotelId, year, month, isPaid) => {
  try {
    const response = await api.post(`/api/admin/users/${hotelId}/pay`, {
      year,
      month,
      isPaid,
    });
    return response.data;
  } catch (err) {
    console.error('[api] Mark as paid error:', err.response?.data?.message || err.message);
    throw new ApiError(
      err.response?.status || 500,
      err.response?.data?.message || '입금 처리 실패'
    );
  }
};

export const updateInvoiceMemoAPI = async (hotelId, year, month, memo, internalNote) => {
  try {
    const response = await api.patch(`/api/admin/users/${hotelId}/invoice/memo`, {
      year,
      month,
      memo,
      internalNote,
    });
    return response.data;
  } catch (err) {
    console.error('[api] Update memo error:', err.response?.data?.message || err.message);
    throw new ApiError(
      err.response?.status || 500,
      err.response?.data?.message || '메모 수정 실패'
    );
  }
};

export const fetchInvoiceHistoryAPI = async (hotelId, year, month) => {
  try {
    const response = await api.get(`/api/admin/users/${hotelId}/invoice/history`, {
      params: { year, month },
    });
    return response.data.data;
  } catch (err) {
    console.error('[api] Fetch history error:', err.response?.data?.message || err.message);
    throw new ApiError(
      err.response?.status || 500,
      err.response?.data?.message || '히스토리 조회 실패'
    );
  }
};

// ======================================================================
// ✨ 프로모션 관리 API
// ======================================================================

export const getHotelPromotionAPI = async (hotelId) => {
  try {
    const response = await api.get(`/api/admin/users/${hotelId}/promotion`);
    return response.data.data;
  } catch (err) {
    console.error('[api] Get promotion error:', err.response?.data?.message || err.message);
    throw new ApiError(
      err.response?.status || 500,
      err.response?.data?.message || '프로모션 조회 실패'
    );
  }
};

export const addHotelPromotionAPI = async (
  hotelId,
  startYear,
  startMonth,
  endYear,
  endMonth,
  discountRate,
  reason
) => {
  try {
    const response = await api.post(`/api/admin/users/${hotelId}/promotion`, {
      startYear,
      startMonth,
      endYear,
      endMonth,
      discountRate,
      reason,
    });
    return response.data;
  } catch (err) {
    console.error('[api] Add promotion error:', err.response?.data || err.message);
    throw new ApiError(
      err.response?.status || 500,
      err.response?.data?.message || '프로모션 추가 실패'
    );
  }
};

export const setDefaultDiscountRateAPI = async (hotelId, defaultDiscountRate) => {
  try {
    const response = await api.patch(`/api/admin/users/${hotelId}/promotion/default`, {
      defaultDiscountRate,
    });
    return response.data;
  } catch (err) {
    console.error('[api] Set default discount error:', err.response?.data?.message || err.message);
    throw new ApiError(
      err.response?.status || 500,
      err.response?.data?.message || '기본 할인율 설정 실패'
    );
  }
};

// ======================================================================
// ✅ 예약 엑셀 전송 API
// ======================================================================

export const sendReservationsMonthlyExcelAPI = async (hotelId, year, month) => {
  try {
    const response = await api.post(
      `/api/admin/users/${hotelId}/reservations/excel/monthly`,
      { year, month }
    );
    return response.data;
  } catch (err) {
    throw new ApiError(
      err.response?.status || 500,
      err.response?.data?.message || '월별 예약 엑셀 전송 실패'
    );
  }
};

export const sendReservationsAllExcelAPI = async (hotelId) => {
  try {
    const response = await api.post(
      `/api/admin/users/${hotelId}/reservations/excel/all`,
      {}
    );
    return response.data;
  } catch (err) {
    throw new ApiError(
      err.response?.status || 500,
      err.response?.data?.message || '전체 예약 엑셀 전송 실패'
    );
  }
};

// ======================================================================
// 기타 API (기존 유지)
// ======================================================================

export const loginAdmin = async (username, password) => {
  try {
    console.log('[api] Admin login attempt:', { username });
    clearAuthData();

    const response = await api.post(
      '/api/admin/login',
      { username, password },
      { skipCsrf: true }
    );

    const { accessToken } = response.data;
    window.localStorage.setItem('accessToken', accessToken);
    console.log('[api] Admin login successful:', { username });
    return response.data;
  } catch (err) {
    console.error('[api] Admin login error:', err.response?.data?.message || err.message);
    throw new ApiError(
      err.response?.status || 500,
      err.response?.data?.message || '로그인 실패'
    );
  }
};

export const fetchUsers = async (status) => {
  try {
    const params = status === 'all' ? {} : { status };
    const response = await api.get('/api/admin/users', { params });
    return response.data.data;
  } catch (err) {
    console.error('[api] Fetch users error:', err.response?.data?.message || err.message);
    throw new ApiError(
      err.response?.status || 500,
      err.response?.data?.message || '사용자 조회 실패'
    );
  }
};

export const updateUserStatus = async (hotelId, status) => {
  try {
    const response = await api.patch(`/api/admin/users/${hotelId}/status`, { status });
    return response.data.data;
  } catch (err) {
    console.error('[api] Update user status error:', err.response?.data?.message || err.message);
    throw new ApiError(
      err.response?.status || 500,
      err.response?.data?.message || '상태 변경 실패'
    );
  }
};

export const fetchHotelSales = async (hotelId, type, startDate, endDate) => {
  try {
    const params = { type, startDate, endDate };
    const response = await api.get(`/api/admin/sales/${hotelId}`, { params });
    return response.data;
  } catch (err) {
    console.error('[api] Fetch hotel sales error:', err.response?.data?.message || err.message);
    throw new ApiError(
      err.response?.status || 500,
      err.response?.data?.message || '매출 조회 실패'
    );
  }
};

// ======================================================================
// 📢 공지사항 관리 API
// ======================================================================

export const fetchNoticesAPI = async () => {
  try {
    const response = await api.get('/api/notices');
    return response.data;
  } catch (err) {
    console.error('[api] Fetch notices error:', err);
    throw new ApiError(err.response?.status || 500, '공지 목록 조회 실패');
  }
};

export const createNoticeAPI = async (noticeData) => {
  try {
    const response = await api.post('/api/notices', noticeData);
    return response.data;
  } catch (err) {
    console.error('[api] Create notice error:', err);
    throw new ApiError(err.response?.status || 500, '공지 등록 실패');
  }
};

export const deleteNoticeAPI = async (id) => {
  try {
    const response = await api.delete(`/api/notices/${id}`);
    return response.data;
  } catch (err) {
    console.error('[api] Delete notice error:', err);
    throw new ApiError(err.response?.status || 500, '공지 삭제 실패');
  }
};

export const updateNoticeAPI = async (id, noticeData) => {
  try {
    const response = await api.put(`/api/notices/${id}`, noticeData);
    return response.data;
  } catch (err) {
    console.error('[api] Update notice error:', err);
    throw new ApiError(err.response?.status || 500, '공지 수정 실패');
  }
};

// FAQ
export const fetchFaqsAPI = async (page = 1, search = '', limit = 500, category = '') => {
  try {
    const response = await api.get('/api/faqs', { params: { page, search, limit, category } });
    return response.data;
  } catch (err) {
    console.error('[api] Fetch faqs error:', err);
    throw new ApiError(err.response?.status || 500, err.response?.data?.message || 'FAQ 목록 조회 실패');
  }
};

export const createFaqAPI = async (faqData) => {
  try {
    const response = await api.post('/api/faqs', faqData);
    return response.data;
  } catch (err) {
    console.error('[api] Create faq error:', err);
    throw new ApiError(err.response?.status || 500, err.response?.data?.message || 'FAQ 등록 실패');
  }
};

export const updateFaqAPI = async (id, faqData) => {
  try {
    const response = await api.patch(`/api/faqs/${id}`, faqData);
    return response.data;
  } catch (err) {
    console.error('[api] Update faq error:', err);
    throw new ApiError(err.response?.status || 500, err.response?.data?.message || 'FAQ 수정 실패');
  }
};

export const deleteFaqAPI = async (id) => {
  try {
    const response = await api.delete(`/api/faqs/${id}`);
    return response.data;
  } catch (err) {
    console.error('[api] Delete faq error:', err);
    throw new ApiError(err.response?.status || 500, err.response?.data?.message || 'FAQ 삭제 실패');
  }
};

// 서비스 안내
export const fetchServiceGuidesAPI = async (page = 1, search = '', limit = 500, category = '') => {
  try {
    const response = await api.get('/api/service-guides', { params: { page, search, limit, category } });
    return response.data;
  } catch (err) {
    console.error('[api] Fetch service guides error:', err);
    throw new ApiError(err.response?.status || 500, err.response?.data?.message || '서비스 안내 목록 조회 실패');
  }
};

export const createServiceGuideAPI = async (guideData) => {
  try {
    const response = await api.post('/api/service-guides', guideData);
    return response.data;
  } catch (err) {
    console.error('[api] Create service guide error:', err);
    throw new ApiError(err.response?.status || 500, err.response?.data?.message || '서비스 안내 등록 실패');
  }
};

export const updateServiceGuideAPI = async (id, guideData) => {
  try {
    const response = await api.patch(`/api/service-guides/${id}`, guideData);
    return response.data;
  } catch (err) {
    console.error('[api] Update service guide error:', err);
    throw new ApiError(err.response?.status || 500, err.response?.data?.message || '서비스 안내 수정 실패');
  }
};

export const deleteServiceGuideAPI = async (id) => {
  try {
    const response = await api.delete(`/api/service-guides/${id}`);
    return response.data;
  } catch (err) {
    console.error('[api] Delete service guide error:', err);
    throw new ApiError(err.response?.status || 500, err.response?.data?.message || '서비스 안내 삭제 실패');
  }
};

export default api;
