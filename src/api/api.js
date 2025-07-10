// Frontend: src/api/api.js
// 개발자 대쉬보드 

import axios from 'axios';
import ApiError from '../utils/ApiError';

const BASE_URL =
  process.env.REACT_APP_API_BASE_URL?.trim() ||
  'https://staysync.org';

const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 15000,
});

let csrfTokenPromise = null;

api.interceptors.request.use(async (config) => {
  const token = window.localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  const method = config.method?.toLowerCase();
  if (method !== 'get' && !config.skipCsrf) {
    let csrfToken = window.localStorage.getItem('csrfToken');
    let csrfTokenId = window.localStorage.getItem('csrfTokenId');
    if (!csrfToken || !csrfTokenId) {
      if (!csrfTokenPromise) csrfTokenPromise = api.get('/api/csrf-token', { skipCsrf: true });
      try {
        const { data } = await csrfTokenPromise;
        csrfToken = data.csrfToken;
        csrfTokenId = data.tokenId;
        window.localStorage.setItem('csrfToken', csrfToken);
        window.localStorage.setItem('csrfTokenId', csrfTokenId);
      } finally {
        csrfTokenPromise = null;
      }
    }
    config.headers['X-CSRF-Token'] = csrfToken;
    config.headers['X-CSRF-Token-Id'] = csrfTokenId;
  }
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use(res => res, async (error) => {
  const original = error.config;
  if (error.response?.status === 401 && !original._retry) {
    original._retry = true;
    try {
      const { data } = await api.post('/api/auth/refresh-token', {}, { skipCsrf: true });
      window.localStorage.setItem('accessToken', data.accessToken);
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(original);
    } catch (e) {
      window.localStorage.clear();
      window.location.href = '/login?error=session_expired';
      return Promise.reject(e);
    }
  }
  if (error.response?.status === 403 && !original._retryCsrf) {
    original._retryCsrf = true;
    window.localStorage.removeItem('csrfToken');
    window.localStorage.removeItem('csrfTokenId');
    return api(original);
  }
  return Promise.reject(error);
});

export const fetchUsers = async (status) => {
  try {
    const params = status === 'all' ? {} : { status };
    const response = await api.get('/api/admin/users', { params });
    return response.data.data;
  } catch (err) {
    throw new ApiError(err.response?.status, err.response?.data?.message || '사용자 조회 실패');
  }
};

export const updateUserStatus = async (hotelId, status) => {
  try {
    const response = await api.patch(`/api/admin/users/${hotelId}/status`, { status });
    return response.data.data;
  } catch (err) {
    throw new ApiError(err.response?.status, err.response?.data?.message || '상태 변경 실패');
  }
};

export const fetchHotelSales = async (hotelId, type, startDate, endDate) => {
  try {
    const params = { type, startDate, endDate };
    const response = await api.get(`/api/admin/sales/${hotelId}`, { params });
    return response.data;
  } catch (err) {
    throw new ApiError(err.response?.status, err.response?.data?.message || '매출 조회 실패');
  }
};

export default api;
