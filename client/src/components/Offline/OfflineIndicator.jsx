import React from 'react';
import { useSocket } from '../../contexts/SocketContext';

const OfflineIndicator = () => {
  const { isConnected } = useSocket();

  if (isConnected) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-red-500 text-white px-4 py-2 rounded-md shadow-lg">
      <div className="flex items-center space-x-2">
        <svg 
          className="w-5 h-5 animate-pulse" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
          />
        </svg>
        <span>You are offline. Reconnecting...</span>
      </div>
    </div>
  );
};

export default OfflineIndicator;