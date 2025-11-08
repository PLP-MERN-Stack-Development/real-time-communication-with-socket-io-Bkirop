import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL;

export function useSocket(userId) {
  const socketRef = useRef(null);
  const [socketInstance, setSocketInstance] = useState(null);

  useEffect(() => {
    if (!userId) return;

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      auth: { userId }
    });

    socketRef.current = socket;
    setSocketInstance(socket);

    return () => {
      const socket = socketRef.current;
      if (socket) {
        socket.removeAllListeners();
        socket.disconnect();
      }
      socketRef.current = null;
      setSocketInstance(null);
    };
  }, [userId]);

  return socketInstance;
}
