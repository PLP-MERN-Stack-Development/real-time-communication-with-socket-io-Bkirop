
import { useState, useEffect } from 'react';

export const useNotification = () => {
  const [permission, setPermission] = useState(Notification.permission);

  useEffect(() => {
    if (permission === 'default') {
      Notification.requestPermission().then(setPermission);
    }
  }, []);

  const showNotification = (title, options = {}) => {
    if (permission === 'granted') {
      new Notification(title, {
        icon: '/logo.png',
        badge: '/badge.png',
        ...options
      });
    }
  };

  const playSound = () => {
    const audio = new Audio('/notification.mp3');
    audio.play().catch(err => console.log('Audio play failed:', err));
  };

  return { showNotification, playSound, permission };
};