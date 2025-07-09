// src/context/SocketContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../hooks/useAuth';

const SocketContext = createContext(null);
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { token, isAdmin } = useAuth();
  const [socketStatus, setSocketStatus] = useState('Disconnected');
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Only connect if the user is a logged-in admin
    if (isAdmin && token) {
      const adminSocket = io(
        // explicitly hit the /admin namespace
        `${process.env.REACT_APP_API_BASE_URL}/admin`,
        {
          path: '/socket.io',      // must match your server's socket.io path
          transports: ['websocket','polling'],
          withCredentials: true,   // send cookies if needed
          query: { accessToken: token },
        }
      );

      setSocket(adminSocket);
      setSocketStatus('Connecting');

      adminSocket.on('connect',    () => setSocketStatus('Connected'));
      adminSocket.on('disconnect', () => setSocketStatus('Disconnected'));
      adminSocket.on(
        'connect_error',
        (err) => setSocketStatus(`Failed: ${err.message}`)
      );

      return () => adminSocket.disconnect();
    }

    // If not admin (or token changed away), tear down any existing socket
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setSocketStatus('Disconnected');
    }
  }, [token, isAdmin]);

  return (
    <SocketContext.Provider value={{ socket, socketStatus }}>
      {children}
    </SocketContext.Provider>
  );
};

export default SocketContext;
