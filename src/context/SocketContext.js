// src/contexts/SocketContext.js
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';
import { WS_BASE_URL } from '../api/api';

const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { token, isAdmin } = useAuth();

  const [socketStatus, setSocketStatus] = useState('Disconnected');
  const [socket, setSocket] = useState(null);

  const socketUrl = useMemo(() => WS_BASE_URL, []);

  useEffect(() => {
    if (!isAdmin || !token) return;

    setSocketStatus('Connecting');

    // ✅ 서버(server.js)가 기본 네임스페이스(`/`)만 받는 구조면 /admin 붙이면 안됨
    const s = io(socketUrl, {
      path: '/socket.io',
      withCredentials: true,
      transports: ['websocket', 'polling'], // ✅ socket.io가 알아서 fallback
      query: { accessToken: token },
      timeout: 10000,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 800,
    });

    setSocket(s);

    s.on('connect', () => {
      // socket.io v4: s.io.engine.transport.name => websocket|polling
      const t = s?.io?.engine?.transport?.name;
      setSocketStatus(t ? `Connected(${t})` : 'Connected');
    });

    s.on('disconnect', (reason) => {
      setSocketStatus(`Disconnected: ${reason || 'unknown'}`);
    });

    s.on('connect_error', (err) => {
      const msg = err?.message || 'connect_error';
      setSocketStatus(`Connect Error: ${msg}`);
      // 여기서 REST 폴링으로 넘어가지 않음 (원인 추적을 위해)
    });

    // transport 업그레이드/다운그레이드 추적 (유용)
    const onTransport = () => {
      const t = s?.io?.engine?.transport?.name;
      if (t) setSocketStatus(`Connected(${t})`);
    };
    s.io?.engine?.on?.('upgrade', onTransport);
    s.io?.engine?.on?.('close', onTransport);

    return () => {
      try { s.disconnect(); } catch (_) {}
      setSocket(null);
      setSocketStatus('Disconnected');
    };
  }, [isAdmin, token, socketUrl]);

  return (
    <SocketContext.Provider value={{ socket, socketStatus }}>
      {children}
    </SocketContext.Provider>
  );
};
