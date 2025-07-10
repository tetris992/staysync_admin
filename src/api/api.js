import axios from 'axios';
import ApiError from '../utils/ApiError';

// Base URL: 포트 3003 명시, 환경 변수 우선
const BASE_URL = process.env.REACT_APP_API_BASE_URL?.trim() || 'https://staysync.org:3003';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 15000,
});

// 디버깅: Base URL 로그
console.log('API Base URL:', BASE_URL);

// CSRF 토큰 캐싱
let csrfTokenPromise = null;

// 요청 인터셉터
api.interceptors.request.use(async (config) => {
  // 디버깅: 요청 URL 및 메서드 로그
  console.log('API Request:', config.method.toUpperCase(), config.url);

  // Authorization 헤더 추가
  const token = window.localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // CSRF 토큰 처리
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
}, (error) => {
  console.error('Request interceptor error:', error);
  return Promise.reject(error);
});

// 응답 인터셉터
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // 401 에러 처리
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

    // 403 에러 처리
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

// 쿠키 정리 함수
const clearCookies = () => {
  console.log('Clearing cookies');
  document.cookie = 'refreshToken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
};

// 어드민 로그인 함수
export const loginAdmin = async (username, password) => {
  try {
    // 로그인 전 초기화
    console.log('Admin login attempt:', { username });
    clearCookies();
    window.localStorage.removeItem('accessToken');
    window.localStorage.removeItem('csrfToken');
    window.localStorage.removeItem('csrfTokenId');

    const response = await api.post(
      '/api/admin/login',
      { username, password },
      { skipCsrf: true }
    );
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

// 사용자 목록 조회
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

// 사용자 상태 변경
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

// 호텔 매출 조회
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