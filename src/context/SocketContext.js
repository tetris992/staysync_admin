import React, { createContext, useEffect, useState, useContext } from 'react';
import { io } from 'socket.io-client';
import AuthContext from './AuthContext';

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { token, isAdmin } = useContext(AuthContext);
  const [socket, setSocket] = useState(null);
  const [socketStatus, setSocketStatus] = useState('Disconnected');

  useEffect(() => {
    if (isAdmin && token) {
      const newSocket = io(process.env.REACT_APP_API_BASE_URL || 'https://staysync.org', {
        path: '/socket.io',
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 5,
        query: { accessToken: token },
      });

      setSocket(newSocket);
      setSocketStatus('Connecting');

      newSocket.on('connect', () => setSocketStatus('Connected'));
      newSocket.on('disconnect', () => setSocketStatus('Disconnected'));
      newSocket.on('connect_error', (err) => setSocketStatus(`Connection Failed: ${err.message}`));

      return () => newSocket.disconnect();
    } else if (socket) {
      socket.disconnect();
    }
  }, [token, isAdmin, socket]);

  return (
    <SocketContext.Provider value={{ socket, socketStatus }}>
      {children}
    </SocketContext.Provider>
  );
};