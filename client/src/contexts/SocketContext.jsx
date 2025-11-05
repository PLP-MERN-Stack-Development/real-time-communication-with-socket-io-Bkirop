import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
    console.log('Initializing socket with URL:', socketUrl);

    const newSocket = io(socketUrl, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('✅ Socket connected successfully');
      setConnected(true);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      setConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setConnected(false);
    });

    newSocket.on('user:status', ({ userId, status }) => {
      setOnlineUsers(prev => {
        const updated = new Set(prev);
        if (status === 'online') {
          updated.add(userId);
        } else {
          updated.delete(userId);
        }
        return updated;
      });
    });

    setSocket(newSocket);

    return () => {
      console.log('Cleaning up socket connection');
      if (newSocket.connected) {
        newSocket.disconnect();
      }
    };
  }, []);

  const connect = (userId) => {
    if (socket && !connected) {
      console.log('Connecting socket for user:', userId);
      socket.connect();
      socket.emit('authenticate', { userId });
    }
  };

  const disconnect = () => {
    if (socket && connected) {
      console.log('Disconnecting socket');
      socket.disconnect();
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      connected,
      onlineUsers,
      connect,
      disconnect
    }}>
      {children}
    </SocketContext.Provider>
  );
};