import axios from 'axios';
import ApiError from '../utils/ApiError';

const BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://staysync.org';
const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 15000,
});

let csrfTokenPromise = null;

api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  const isCsrfNeeded = config.method.toLowerCase() !== 'get' && !config.skipCsrf;

  if (isCsrfNeeded) {
    let csrfToken = localStorage.getItem('csrfToken');
    let csrfTokenId = localStorage.getItem('csrfTokenId');

    if (!csrfToken || !csrfTokenId) {
      if (!csrfTokenPromise) {
        csrfTokenPromise = api.get('/api/csrf-token', { skipCsrf: true });
      }
      try {
        const { data } = await csrfTokenPromise;
        csrfToken = data.csrfToken;
        csrfTokenId = data.tokenId;
        localStorage.setItem('csrfToken', csrfToken);
        localStorage.setItem('csrfTokenId', csrfTokenId);
      } finally {
        csrfTokenPromise = null;
      }
    }
    config.headers['X-CSRF-Token'] = csrfToken;
    config.headers['X-CSRF-Token-Id'] = csrfTokenId;
  }
  return config;
}, (error) => Promise.reject(error));

api.interceptors.response.use((response) => response, async (error) => {
  const originalRequest = error.config;
  if (error.response?.status === 401 && !originalRequest._retry) {
    originalRequest._retry = true;
    try {
      const { data } = await api.post('/api/auth/refresh-token', {}, { skipCsrf: true });
      localStorage.setItem('accessToken', data.accessToken);
      originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      localStorage.clear();
      window.location.href = '/login?error=session_expired';
      return Promise.reject(refreshError);
    }
  }

  if (error.response?.status === 403 && !originalRequest._retryCsrf) {
    originalRequest._retryCsrf = true;
    localStorage.removeItem('csrfToken');
    localStorage.removeItem('csrfTokenId');
    return api(originalRequest);
  }

  return Promise.reject(error);
});

export const fetchUsers = async (status) => {
  try {
    const params = { status: status === 'all' ? undefined : status };
    const response = await api.get('/api/admin/users', { params });
    return response.data.data;
  } catch (error) {
    throw new ApiError(error.response?.status, error.response?.data?.message || 'Failed to fetch users');
  }
};

export const updateUserStatus = async (hotelId, status) => {
  try {
    const response = await api.patch(`/api/admin/users/${hotelId}/status`, { status });
    return response.data.data;
  } catch (error) {
    throw new ApiError(error.response?.status, error.response?.data?.message || 'Failed to update status');
  }
};

export const fetchHotelSales = async (hotelId, type, startDate, endDate) => {
  try {
    const params = { type, startDate, endDate };
    const response = await api.get(`/api/sales/${hotelId}/sales`, { params });
    return response.data;
  } catch (error) {
    throw new ApiError(error.response?.status, error.response?.data?.message || 'Failed to fetch sales data');
  }
};

export default api;
