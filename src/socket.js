import { io } from 'socket.io-client';

import axios from './api/api';

const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || 'https://staysync.org';

const getAccessToken = () => {
  const token = localStorage.getItem('accessToken') || '';
  if (!token || token.split('.').length !== 3) {
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
    accessToken: getAccessToken(),
  },
  autoConnect: false,
});

let tokenRefreshAttempts = 0;
const MAX_TOKEN_REFRESH_ATTEMPTS = 3;

socket.on('connect', () => {
  tokenRefreshAttempts = 0;
  socket.io.opts.query.accessToken = getAccessToken();
});

socket.on('connect_error', (error) => {
  const token = localStorage.getItem('accessToken') || '';
  if (!token || token.split('.').length !== 3) {
    socket.disconnect();
    return;
  }

  if (
    error.message.includes('Invalid token') &&
    tokenRefreshAttempts < MAX_TOKEN_REFRESH_ATTEMPTS
  ) {
    tokenRefreshAttempts++;
    axios
      .post(
        '/api/auth/refresh-token',
        {},
        { withCredentials: true, timeout: 10000 }
      )
      .then((response) => {
        const newAccessToken = response.data.accessToken;
        localStorage.setItem('accessToken', newAccessToken);
        socket.io.opts.query.accessToken = newAccessToken;
        socket.disconnect();
        socket.connect();
      })
      .catch(() => {
        tokenRefreshAttempts = 0;
        socket.disconnect();
      });
  } else if (tokenRefreshAttempts >= MAX_TOKEN_REFRESH_ATTEMPTS) {
    tokenRefreshAttempts = 0;
    socket.disconnect();
  }
});

socket.on('disconnect', () => {
  tokenRefreshAttempts = 0;
});

export default socket;
