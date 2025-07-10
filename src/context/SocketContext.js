import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import api from '../api/api';

const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { token, isAdmin } = useAuth();
  const [socketStatus, setSocketStatus] = useState('Disconnected');
  const [socket, setSocket] = useState(null);
  const [usePolling, setUsePolling] = useState(false);

  // 1) WebSocket 연결 이펙트
  useEffect(() => {
    if (!isAdmin || !token) return;

    const adminSocket = io(`${process.env.REACT_APP_API_BASE_URL}/admin`, {
      transports: ['websocket', 'polling'],
      path: '/socket.io',
      withCredentials: true,
      query: { accessToken: token },
    });
    setSocket(adminSocket);
    setSocketStatus('Connecting');

    adminSocket.on('connect',    () => setSocketStatus('Connected'));
    adminSocket.on('disconnect', () => setSocketStatus('Disconnected'));

    adminSocket.on('connect_error', (err) => {
      setSocketStatus(`WS Error: ${err.message}`);
      setUsePolling(true);       // 실패 시 폴링 모드 전환
      adminSocket.disconnect();  // 소켓 닫기
      setSocket(null);
    });

    return () => {
      adminSocket.disconnect();
      setSocket(null);
      setSocketStatus('Disconnected');
    };
  }, [isAdmin, token]);

  // 2) 폴링 모드 이펙트
  useEffect(() => {
    if (!usePolling || !isAdmin || !token) return;

    setSocketStatus('Polling');
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get('/api/admin/events');
        // 예: data.events 배열을 순회하며 이벤트 처리
        data.events.forEach(evt => {
          // 예시: evt.type에 따른 상태 업데이트
          console.log('폴링 이벤트:', evt);
        });
      } catch (e) {
        console.warn('폴링 실패:', e);
      }
    }, 5000); // 5초마다 폴링

    return () => clearInterval(interval);
  }, [usePolling, isAdmin, token]);

  return (
    <SocketContext.Provider value={{ socket, socketStatus }}>
      {children}
    </SocketContext.Provider>
  );
};
