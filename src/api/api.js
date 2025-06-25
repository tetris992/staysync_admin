import axios from 'axios';
import ApiError from '../utils/ApiError';

// Constants
const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://staysync.org';
const DEFAULT_TIMEOUT = 10000; // 10초
const SENSITIVE_LOGGING = process.env.NODE_ENV !== 'production';

// 개발 환경에서 BASE_URL 로그 출력 및 경고
if (!process.env.REACT_APP_API_BASE_URL && SENSITIVE_LOGGING) {
  console.warn('[api.js] REACT_APP_API_BASE_URL is not set. Using default:', BASE_URL);
}
if (SENSITIVE_LOGGING) {
  console.log('[api.js] BASE_URL:', BASE_URL);
}

// Axios 인스턴스 생성
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // 쿠키 자동 전송
  timeout: DEFAULT_TIMEOUT,
});

// CSRF 토큰 fetch 중복 호출 방지를 위한 Promise 캐시
let csrfTokenPromise = null;

// 요청 인터셉터 (토큰, CSRF 헤더 세팅)
api.interceptors.request.use(
  async (config) => {
    config.skipCsrf = !!config.skipCsrf;

    // skipCsrf 옵션 있을 때 CSRF 토큰 처리 생략
    if (config.skipCsrf) {
      if (SENSITIVE_LOGGING) {
        console.log('[api.js] Skipping CSRF fetch for request:', config.url);
      }
      return config;
    }

    // 액세스 토큰 Authorization 헤더에 추가
    const token = localStorage.getItem('accessToken');
    if (SENSITIVE_LOGGING) {
      console.log('[api.js] Access token:', token ? 'present' : 'missing');
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // GET 요청이 아니고 CSRF 토큰 발급 API가 아니면 CSRF 헤더 추가
    if (
      config.method.toLowerCase() !== 'get' &&
      !config.url.includes('/api/csrf-token')
    ) {
      let csrfToken = localStorage.getItem('csrfToken');
      let csrfTokenId = localStorage.getItem('csrfTokenId');

      if (!csrfToken || !csrfTokenId) {
        if (SENSITIVE_LOGGING) {
          console.log('[api.js] Fetching new CSRF token');
        }

        if (!csrfTokenPromise) {
          csrfTokenPromise = api.get('/api/csrf-token', {
            skipCsrf: true,
            timeout: DEFAULT_TIMEOUT,
          });
        }

        try {
          const { data } = await csrfTokenPromise;
          csrfToken = data.csrfToken;
          csrfTokenId = data.tokenId;
          localStorage.setItem('csrfToken', csrfToken);
          localStorage.setItem('csrfTokenId', csrfTokenId);
          if (SENSITIVE_LOGGING) {
            console.log('[api.js] CSRF token fetched:', { csrfToken, csrfTokenId });
          }
        } finally {
          csrfTokenPromise = null;
        }
      }

      config.headers['X-CSRF-Token'] = csrfToken;
      config.headers['X-CSRF-Token-Id'] = csrfTokenId;
    }

    if (SENSITIVE_LOGGING) {
      console.log('[api.js] Request:', config.method.toUpperCase(), config.url, config.data);
    }

    return config;
  },
  (error) => {
    console.error('[api.js] Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// 응답 인터셉터 (토큰 만료 처리 및 재발급 자동화)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // 403: CSRF 토큰 문제 발생 시 재발급 후 재시도
    if (error.response?.status === 403 && !originalRequest._retryCsrf) {
      originalRequest._retryCsrf = true;
      try {
        if (SENSITIVE_LOGGING) {
          console.log('[api.js] Retrying with new CSRF token');
        }
        const { data } = await api.get('/api/csrf-token', {
          skipCsrf: true,
          timeout: DEFAULT_TIMEOUT,
        });
        localStorage.setItem('csrfToken', data.csrfToken);
        localStorage.setItem('csrfTokenId', data.tokenId);
        originalRequest.headers['X-CSRF-Token'] = data.csrfToken;
        originalRequest.headers['X-CSRF-Token-Id'] = data.tokenId;
        if (SENSITIVE_LOGGING) {
          console.log('[api.js] CSRF token updated, retrying request');
        }
        return api(originalRequest);
      } catch (csrfError) {
        console.error('[api.js] CSRF token refresh failed:', csrfError);
        throw new ApiError(403, 'CSRF token refresh failed');
      }
    }

    // 401: 액세스 토큰 만료 시 토큰 재발급 후 재시도
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        if (SENSITIVE_LOGGING) {
          console.log('[api.js] Refreshing access token');
        }
        const { data } = await api.post(
          '/api/auth/refresh-token',
          {},
          { timeout: DEFAULT_TIMEOUT }
        );
        localStorage.setItem('accessToken', data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        if (SENSITIVE_LOGGING) {
          console.log('[api.js] Access token refreshed, retrying request');
        }
        return api(originalRequest);
      } catch (refreshError) {
        console.error('[api.js] Access token refresh failed:', refreshError);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('csrfToken');
        localStorage.removeItem('csrfTokenId');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    console.error('[api.js] Response error:', error);
    return Promise.reject(error);
  }
);

// API 함수 모음

// 사용자 목록 조회
export const fetchUsers = async (status) => {
  try {
    const validStatuses = ['all', 'active', 'inactive', 'pending']; // 서버의 status 값과 일치시켜야 함
    if (status && !validStatuses.includes(status)) {
      throw new ApiError(400, 'Invalid status parameter');
    }
    if (SENSITIVE_LOGGING) {
      console.log('[api.js] Fetching users with status:', status);
    }
    const response = await api.get('/api/admin/users', {
      params: { status: status === 'all' ? undefined : status },
      timeout: DEFAULT_TIMEOUT,
    });
    if (!response.data?.data) {
      throw new ApiError(500, 'Server did not return user data');
    }
    if (SENSITIVE_LOGGING) {
      console.log('[api.js] Users response:', response.data);
    }
    return response.data.data;
  } catch (error) {
    console.error('[api.js] Fetch users error:', error);
    throw new ApiError(
      error.response?.status || 500,
      error.response?.data?.message || 'Failed to fetch users'
    );
  }
};

// 사용자 상태 업데이트 (승인/중지 등)
export const updateUserStatus = async (hotelId, status) => {
  try {
    if (!hotelId || typeof hotelId !== 'string') {
      throw new ApiError(400, 'Invalid hotelId');
    }

    // 서버가 허용하는 status 값과 정확히 맞춰야 합니다!
    const validStatuses = ['active', 'inactive', 'pending'];
    if (!validStatuses.includes(status)) {
      throw new ApiError(400, 'Invalid status');
    }

    if (SENSITIVE_LOGGING) {
      console.log('[api.js] Updating status for hotelId:', hotelId, 'to:', status);
    }

    const response = await api.patch(`/api/admin/users/${hotelId}/status`, {
      status,
    });

    if (!response.data?.data) {
      throw new ApiError(500, 'Server did not return status update data');
    }
    if (SENSITIVE_LOGGING) {
      console.log('[api.js] Update status response:', response.data);
    }
    return response.data.data;
  } catch (error) {
    console.error('[api.js] Update status error:', error);
    throw new ApiError(
      error.response?.status || 500,
      error.response?.data?.message || 'Failed to update status'
    );
  }
};

// 호텔 매출 데이터 조회
export const fetchHotelSales = async (hotelId, type, startDate, endDate) => {
  try {
    if (!hotelId || typeof hotelId !== 'string') {
      throw new ApiError(400, 'Invalid hotelId');
    }
    const validTypes = ['daily', 'weekly', 'monthly'];
    if (!validTypes.includes(type)) {
      throw new ApiError(400, 'Invalid type');
    }
    if (!startDate || !endDate || isNaN(Date.parse(startDate)) || isNaN(Date.parse(endDate))) {
      throw new ApiError(400, 'Invalid date range');
    }
    if (SENSITIVE_LOGGING) {
      console.log('[api.js] Fetching sales for hotelId:', hotelId, 'type:', type);
    }
    const response = await api.get(`/api/sales/${hotelId}/sales`, {
      params: { type, startDate, endDate },
      timeout: DEFAULT_TIMEOUT,
    });
    if (!response.data) {
      throw new ApiError(500, 'Server did not return sales data');
    }
    if (SENSITIVE_LOGGING) {
      console.log('[api.js] Sales response:', response.data);
    }
    return response.data;
  } catch (error) {
    console.error('[api.js] Fetch sales error:', error);
    throw new ApiError(
      error.response?.status || 500,
      error.response?.data?.message || 'Failed to fetch sales data'
    );
  }
};

export default api;
