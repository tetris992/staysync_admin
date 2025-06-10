import { io } from 'socket.io-client';

import axios from './api/api';

// 환경 변수에서 API URL 가져오기
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://staysync.org';

// Function to get the access token
const getAccessToken = () => {
  const token = localStorage.getItem('accessToken') || '';
  console.log('WebSocket query accessToken:', token);
  // Validate token format (basic check for JWT format: header.payload.signature)
  if (!token || token.split('.').length !== 3) {
    console.warn('Invalid JWT format, skipping WebSocket connection');
    return '';
  }
  return token;
};

const socket = io(API_BASE_URL, {
  path: '/socket.io',
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  secure: API_BASE_URL.startsWith('https'),
  query: {
    accessToken: getAccessToken(), // Evaluate the function immediately
  },
  autoConnect: false,
});

let tokenRefreshAttempts = 0;
const MAX_TOKEN_REFRESH_ATTEMPTS = 3;

// Update the query dynamically on reconnect
socket.on('connect', () => {
  console.log('WebSocket connected to', API_BASE_URL);
  tokenRefreshAttempts = 0; // Reset attempts on successful connection
  // Update query for future connections
  socket.io.opts.query.accessToken = getAccessToken();
});

socket.on('connect_error', (error) => {
  console.error('WebSocket connection error:', error);
  const token = localStorage.getItem('accessToken') || '';
  if (!token || token.split('.').length !== 3) {
    console.warn('No valid accessToken, skipping reconnection attempt...');
    // Instead of redirecting, simply stop trying to reconnect
    socket.disconnect();
    return;
  }

  if (error.message.includes('Invalid token') && tokenRefreshAttempts < MAX_TOKEN_REFRESH_ATTEMPTS) {
    console.log('Invalid token detected, attempting to refresh token...');
    tokenRefreshAttempts++;
    axios
      .post('/api/auth/refresh-token', {}, { withCredentials: true, timeout: 10000 })
      .then((response) => {
        const newAccessToken = response.data.accessToken;
        localStorage.setItem('accessToken', newAccessToken);
        console.log('Access token refreshed:', newAccessToken);
        console.log('Reconnecting WebSocket...');
        socket.io.opts.query.accessToken = newAccessToken; // Update query with new token
        socket.disconnect();
        socket.connect();
      })
      .catch((refreshError) => {
        console.error('Failed to refresh token:', refreshError);
        tokenRefreshAttempts = 0;
        console.warn('Stopping WebSocket reconnection attempts...');
        socket.disconnect();
      });
  } else if (tokenRefreshAttempts >= MAX_TOKEN_REFRESH_ATTEMPTS) {
    console.error('Max token refresh attempts reached, stopping reconnection attempts...');
    tokenRefreshAttempts = 0;
    socket.disconnect();
  }
});

socket.on('disconnect', (reason) => {
  console.log('WebSocket disconnected:', reason);
  tokenRefreshAttempts = 0;
});

export default socket;