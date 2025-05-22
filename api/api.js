import axios from 'axios';
import ApiError from '../utils/ApiError.js';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://staysync.org';
console.log('[api.js] BASE_URL:', BASE_URL);

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
});

api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.method.toLowerCase() !== 'get' && !config.url.includes('/api/csrf-token')) {
      let csrfToken = localStorage.getItem('csrfToken');
      let csrfTokenId = localStorage.getItem('csrfTokenId');
      if (!csrfToken || !csrfTokenId) {
        const { data } = await api.get('/api/csrf-token', { skipCsrf: true });
        csrfToken = data.csrfToken;
        csrfTokenId = data.tokenId;
        localStorage.setItem('csrfToken', csrfToken);
        localStorage.setItem('csrfTokenId', csrfTokenId);
      }
      config.headers['X-CSRF-Token'] = csrfToken;
      config.headers['X-CSRF-Token-Id'] = csrfTokenId;
    }

    if (process.env.NODE_ENV !== 'production') {
      console.log('[api.js] Request:', config.method.toUpperCase(), config.url, config.data);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (error.response?.status === 403 && !originalRequest._retryCsrf) {
      originalRequest._retryCsrf = true;
      try {
        const { data } = await api.get('/api/csrf-token', {
          skipCsrf: true,
          timeout: 10000,
        });
        localStorage.setItem('csrfToken', data.csrfToken);
        localStorage.setItem('csrfTokenId', data.tokenId);
        originalRequest.headers['X-CSRF-Token'] = data.csrfToken;
        originalRequest.headers['X-CSRF-Token-Id'] = data.tokenId;
        return api(originalRequest);
      } catch (csrfError) {
        throw new ApiError(403, 'CSRF 토큰 갱신 실패');
      }
    }
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const { data } = await api.post('/api/auth/refresh-token', {}, { timeout: 10000 });
        localStorage.setItem('accessToken', data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export const fetchUsers = async (status) => {
  try {
    const response = await api.get('/api/admin/users', {
      params: { status: status === 'all' ? undefined : status },
    });
    return response.data.data;
  } catch (error) {
    throw new ApiError(
      error.response?.status || 500,
      error.response?.data?.message || '사용자 목록 조회 실패'
    );
  }
};

export const updateUserStatus = async (hotelId, status) => {
  try {
    const response = await api.patch(`/api/admin/users/${hotelId}/status`, { status });
    return response.data.data;
  } catch (error) {
    throw new ApiError(
      error.response?.status || 500,
      error.response?.data?.message || '상태 업데이트 실패'
    );
  }
};

export default api;