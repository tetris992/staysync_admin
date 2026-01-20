// src/api/api.js
// ✅ [완전판 v2] 프로모션 API 추가

import axios from 'axios';
import ApiError from '../utils/ApiError';

// Base URL 설정
const BASE_URL = process.env.REACT_APP_API_BASE_URL?.trim() || 'https://staysync.org';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 15000,
});

console.log('API Base URL:', BASE_URL);

let csrfTokenPromise = null;

// [기존 인터셉터 코드 유지...]
api.interceptors.request.use(
  async (config) => {
    const token = window.localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const method = config.method?.toLowerCase();
    if (method !== 'get' && !config.skipCsrf) {
      let csrfToken = window.localStorage.getItem('csrfToken');
      let csrfTokenId = window.localStorage.getItem('csrfTokenId');

      if (!csrfToken || !csrfTokenId) {
        if (!csrfTokenPromise) {
          console.log('Fetching CSRF token for:', config.url);
          csrfTokenPromise = api.get('/api/csrf-token', { skipCsrf: true });
        }
        try {
          const { data } = await csrfTokenPromise;
          csrfToken = data.csrfToken;
          csrfTokenId = data.tokenId;
          window.localStorage.setItem('csrfToken', csrfToken);
          window.localStorage.setItem('csrfTokenId', csrfTokenId);
        } catch (error) {
          console.error('Failed to fetch CSRF token:', error.response?.data || error.message);
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
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      if (original.url.includes('/api/admin/login')) {
        console.error('Admin login failed:', error.response?.data?.message || 'Unauthorized');
        return Promise.reject(error);
      }
      try {
        console.log('Attempting to refresh token');
        const { data } = await api.post('/api/auth/refresh-token', {}, { skipCsrf: true });
        window.localStorage.setItem('accessToken', data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (e) {
        console.error('Refresh token failed:', e.response?.data || e.message);
        window.localStorage.clear();
        window.location.href = '/login?error=session_expired';
        return Promise.reject(e);
      }
    }

    if (error.response?.status === 403 && !original._retryCsrf) {
      original._retryCsrf = true;
      console.log('Retrying request due to CSRF error');
      window.localStorage.removeItem('csrfToken');
      window.localStorage.removeItem('csrfTokenId');
      return api(original);
    }

    console.error('API Error:', error.response?.status, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

const clearAuthData = () => {
  console.log('Clearing auth data');
  document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  window.localStorage.removeItem('accessToken');
  window.localStorage.removeItem('csrfToken');
  window.localStorage.removeItem('csrfTokenId');
};

// ======================================================================
// 📊 Invoice 시스템 관련 API
// ======================================================================

/**
 * 1. 월별 매출 및 청구 상태 조회
 */
export const fetchAdminHotelSales = async (hotelId, year, month) => {
  try {
    const response = await api.get(`/api/admin/users/${hotelId}/sales`, {
      params: { year, month },
    });
    return response.data.data;
  } catch (err) {
    console.error('Fetch admin hotel sales error:', err.response?.data?.message || err.message);
    throw new ApiError(
      err.response?.status || 500,
      err.response?.data?.message || '매출 및 청구 데이터 조회 실패'
    );
  }
};

/**
 * 2. 청구서 발송 (프로모션 할인율 포함)
 */
export const sendInvoiceAPI = async (hotelId, year, month, discountRate = 0) => {
  try {
    const response = await api.post(`/api/admin/users/${hotelId}/invoice`, {
      year,
      month,
      discountRate, // ✅ 백엔드와 키 일치
    });
    return response.data;
  } catch (err) {
    throw new ApiError(
      err.response?.status || 500,
      err.response?.data?.message || '청구서 발송에 실패했습니다.'
    );
  }
};

/**
 * 3. 입금 확인 / 취소
 */
export const markAsPaidAPI = async (hotelId, year, month, isPaid) => {
  try {
    const response = await api.post(`/api/admin/users/${hotelId}/pay`, {
      year,
      month,
      isPaid
    });
    return response.data;
  } catch (err) {
    console.error('Mark as paid error:', err.response?.data?.message || err.message);
    throw new ApiError(
      err.response?.status || 500,
      err.response?.data?.message || '입금 처리 실패'
    );
  }
};

/**
 * 4. 청구서 메모 수정
 */
export const updateInvoiceMemoAPI = async (hotelId, year, month, memo, internalNote) => {
  try {
    const response = await api.patch(`/api/admin/users/${hotelId}/invoice/memo`, {
      year,
      month,
      memo,
      internalNote
    });
    return response.data;
  } catch (err) {
    console.error('Update memo error:', err.response?.data?.message || err.message);
    throw new ApiError(
      err.response?.status || 500,
      err.response?.data?.message || '메모 수정 실패'
    );
  }
};

/**
 * 5. 청구서 히스토리 조회
 */
export const fetchInvoiceHistoryAPI = async (hotelId, year, month) => {
  try {
    const response = await api.get(`/api/admin/users/${hotelId}/invoice/history`, {
      params: { year, month }
    });
    return response.data.data;
  } catch (err) {
    console.error('Fetch history error:', err.response?.data?.message || err.message);
    throw new ApiError(
      err.response?.status || 500,
      err.response?.data?.message || '히스토리 조회 실패'
    );
  }
};

// ======================================================================
// ✨ [신규] 프로모션 관리 API
// ======================================================================

/**
 * 호텔 프로모션 설정 조회
 */
export const getHotelPromotionAPI = async (hotelId) => {
  try {
    const response = await api.get(`/api/admin/users/${hotelId}/promotion`);
    return response.data.data;
  } catch (err) {
    console.error('Get promotion error:', err.response?.data?.message || err.message);
    throw new ApiError(
      err.response?.status || 500,
      err.response?.data?.message || '프로모션 조회 실패'
    );
  }
};

/**
 * 호텔 프로모션 추가
 */
export const addHotelPromotionAPI = async (hotelId, startYear, startMonth, endYear, endMonth, discountRate, reason) => {
  try {
    const response = await api.post(`/api/admin/users/${hotelId}/promotion`, {
      startYear,
      startMonth,
      endYear,
      endMonth,
      discountRate,
      reason
    });
    return response.data;
  } catch (err) {
    console.error('Add promotion error:', err.response?.data||err.message);
    throw new ApiError(
      err.response?.status || 500,
      err.response?.data?.message || '프로모션 추가 실패'
    );
  }
};

/**
 * 호텔 기본 할인율 설정
 */
export const setDefaultDiscountRateAPI = async (hotelId, defaultDiscountRate) => {
  try {
    const response = await api.patch(`/api/admin/users/${hotelId}/promotion/default`, {
      defaultDiscountRate
    });
    return response.data;
  } catch (err) {
    console.error('Set default discount error:', err.response?.data?.message || err.message);
    throw new ApiError(
      err.response?.status || 500,
      err.response?.data?.message || '기본 할인율 설정 실패'
    );
  }
};

// ======================================================================
// 기타 API (기존 유지)
// ======================================================================

export const loginAdmin = async (username, password) => {
  try {
    console.log('Admin login attempt:', { username });
    clearAuthData();
    const response = await api.post('/api/admin/login', { username, password }, { skipCsrf: true });
    const { accessToken } = response.data;
    window.localStorage.setItem('accessToken', accessToken);
    console.log('Admin login successful:', { username });
    return response.data;
  } catch (err) {
    console.error('Admin login error:', err.response?.data?.message || err.message);
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
    console.error('Fetch users error:', err.response?.data?.message || err.message);
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
    console.error('Update user status error:', err.response?.data?.message || err.message);
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
    console.error('Fetch hotel sales error:', err.response?.data?.message || err.message);
    throw new ApiError(
      err.response?.status || 500,
      err.response?.data?.message || '매출 조회 실패'
    );
  }
};

export default api;