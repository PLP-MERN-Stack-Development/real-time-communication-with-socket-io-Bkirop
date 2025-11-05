import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../contexts/SocketContext';
import { useAuth } from '../../contexts/AuthContext';
import { useNotification } from '../../hooks/useNotification';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import UserList from './UserList';
import TypingIndicator from './TypingIndicator';
import ErrorBoundary from '../ErrorBoundary';
import LoadingSpinner from './LoadingSpinner';

const ChatRoom = () => {
  const { roomId: paramRoomId } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const { user } = useAuth();
  const { showNotification, playSound } = useNotification();
  
  const [messages, setMessages] = useState([]);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [room, setRoom] = useState(null);
  const [roomId, setRoomId] = useState(paramRoomId);
  
  const typingTimeoutRef = useRef(null);
  const loadingTimeoutRef = useRef(null);

  // Fetch default room if no roomId is provided
  useEffect(() => {
    const fetchDefaultRoom = async () => {
      try {
        if (!paramRoomId) {
          setLoading(true);
          const response = await fetch('http://localhost:5001/api/rooms/default-room');
          if (!response.ok) throw new Error('Failed to fetch default room');
          const data = await response.json();
          console.log('✅ Default room fetched:', data.data);
          setRoomId(data.data._id);
          setRoom(data.data);
        }
      } catch (error) {
        console.error('❌ Error fetching default room:', error);
        setError('Failed to fetch default room');
        setLoading(false);
      }
    };

    fetchDefaultRoom();
  }, [paramRoomId]);

  // Track if the component is mounted
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch room data when roomId changes
  useEffect(() => {
    if (!user || !roomId) {
      console.log('Waiting for user and roomId:', { user: !!user, roomId: !!roomId });
      return;
    }

    let isSubscribed = true;
    setLoading(true);
    setError(null);

    const fetchRoom = async () => {
      if (!isMountedRef.current) return;
      
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const endpoint = roomId === 'default' ? '/api/rooms/default' : `/api/rooms/${roomId}`;
        const response = await fetch(`${import.meta.env.VITE_API_URL}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success && isSubscribed && isMountedRef.current) {
          console.log('Room fetched successfully:', data.room);
          setRoom(data.room);
          setError(null);
        } else if (isSubscribed) {
          throw new Error(data.message || 'Failed to fetch room');
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          console.log('Fetch aborted');
          return;
        }
        
        if (isSubscribed && isMountedRef.current) {
          console.error('Error fetching room:', err);
          setError(err.message);
          showNotification('error', `Failed to load chat room: ${err.message}`);
          // Redirect to default room if there's an error
          if (roomId !== 'default') {
            navigate('/chat/default');
          }
        }
      } finally {
        if (isSubscribed && isMountedRef.current) {
          setLoading(false);
        }
      }
    };

    fetchRoom();

    return () => {
      isSubscribed = false;
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    };
  }, [user, roomId, navigate, showNotification]);

  // Connect to socket and join room once we have all required data
  useEffect(() => {
    console.log('Socket connection effect:', { socket, room, user, roomId });
    
    if (!socket || !room || !user || !roomId) {
      console.debug('Missing required data:', { 
        socket: !!socket, 
        room: !!room,
        user: !!user,
        roomId
      });
      return;
    }

    // Ensure socket is connected
    if (!socket.connected) {
      console.log('Connecting socket...');
      try {
        socket.connect();
      } catch (error) {
        console.error('Failed to connect socket:', error);
        setError('Failed to connect to chat server');
        showNotification('error', 'Failed to connect to chat server');
        return;
      }
    }

    // First authenticate the socket connection
    socket.emit('authenticate', { userId: user.id }, (response) => {
      if (response?.error) {
        console.error('Authentication failed:', response.error);
        setError('Failed to authenticate socket connection');
        showNotification('error', 'Failed to connect to chat server');
        setLoading(false);
        return;
      }
      
      console.log('Socket authenticated successfully');
      
      // Only join room after successful authentication
      console.log('Joining room:', roomId, 'with user:', user.id);
      socket.emit('room:join', { roomId, userId: user.id }, (response) => {
        if (response?.error) {
          console.error('Failed to join room:', response.error);
          setError(`Failed to join room: ${response.error}`);
          showNotification('error', 'Failed to join chat room');
          setLoading(false);
        } else {
          console.log('Successfully joined room:', response);
          showNotification('success', `Joined ${room.name}`);
          setLoading(false);
        }
      });
    });

    // Set a timeout to stop loading after 5 seconds even if no messages received
    loadingTimeoutRef.current = setTimeout(() => {
      console.log('Loading timeout - setting loading to false');
      setLoading(false);
      // If no messages received, start with empty array
      if (messages.length === 0) {
        console.log('No initial messages received, starting with empty array');
      }
    }, 5000);

    // Join room with acknowledgment callback
    console.log('Joining room:', room._id, 'with user:', user.id);
    socket.emit('room:join', { roomId: room._id, userId: user.id }, (response) => {
      if (response?.error) {
        console.error('Failed to join room:', response);
        setError(`Failed to join room: ${response.error}`);
        setLoading(false);
      } else {
        console.log('Successfully joined room:', response);
      }
    });

    // Listen for previous messages
    socket.on('room:messages', (data) => {
      console.log('Received previous messages:', data);
      // Handle both array and object responses
      const msgs = Array.isArray(data) ? data : (data?.messages || []);
      console.log('Parsed messages:', msgs.length);
      setMessages(msgs);
      setLoading(false);
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }
    });

    // Listen for new messages
    socket.on('message:new', (message) => {
      console.log('New message received:', message);
      setMessages(prev => {
        // Prevent duplicate messages
        if (prev.some(msg => msg._id === message._id || msg.tempId === message.tempId)) {
          return prev;
        }
        return [...prev, message];
      });
      
      // Stop loading when first message arrives
      if (loading) {
        setLoading(false);
      }
      
      // Notification if not sender
      if (message.sender._id !== user.id) {
        showNotification('New message', {
          body: `${message.sender.username}: ${message.content}`,
          tag: message._id
        });
        playSound();
      }
    });

    // Listen for typing events
    socket.on('typing:user', ({ userId, username, isTyping }) => {
      console.log('Typing event:', { userId, username, isTyping });
      setTypingUsers(prev => {
        const updated = new Set(prev);
        if (isTyping && userId !== user.id) {
          updated.add(username);
        } else {
          updated.delete(username);
        }
        return updated;
      });
    });

    // Listen for user joined events
    socket.on('user:joined', ({ userId, username }) => {
      console.log('User joined:', { userId, username });
      setOnlineUsers(prev => {
        if (prev.some(u => u.userId === userId)) return prev;
        return [...prev, { userId, username }];
      });
    });

    // Listen for user left events
    socket.on('user:left', ({ userId }) => {
      console.log('User left:', userId);
      setOnlineUsers(prev => prev.filter(u => u.userId !== userId));
    });

    // Listen for online users list
    socket.on('room:users', (users) => {
      console.log('Online users:', users);
      setOnlineUsers(Array.isArray(users) ? users : []);
    });

    // Handle errors (but don't stop on room join errors during development)
    socket.on('error', (err) => {
      console.error('Socket error:', err);
      
      // For development: Don't block UI on room join errors
      if (err.message === 'Failed to join room') {
        console.warn('Room join failed, but continuing for development');
        setLoading(false);
        setMessages([]); // Start with empty messages
      } else {
        setError(err.message || 'Connection error');
        setLoading(false);
      }
    });

    return () => {
      console.log('ChatRoom unmounting, cleaning up');
      
      // Clear timeouts
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      if (loadingTimeoutRef.current) {
        clearTimeout(loadingTimeoutRef.current);
      }

      // Leave room if we're connected and have room info
      if (socket.connected && room && roomId) {
        console.log('Leaving room:', roomId);
        socket.emit('room:leave', { roomId, userId: user.id }, (response) => {
          if (response?.error) {
            console.error('Error leaving room:', response.error);
          } else {
            console.log('Successfully left room');
          }
        });
      }

      // Remove all listeners
      const events = [
        'room:messages',
        'message:new',
        'typing:user',
        'user:joined',
        'user:left',
        'room:users',
        'error',
        'connect_error',
        'disconnect'
      ];
      
      events.forEach(event => socket.off(event));
    };
  }, [socket, roomId, user]);

  const handleSendMessage = (content) => {
    if (!content.trim()) return;
    
    const tempId = `temp-${Date.now()}`;
    
    // Optimistic update
    const optimisticMessage = {
      _id: tempId,
      tempId,
      content,
      sender: {
        _id: user.id,
        username: user.username,
        avatar: user.avatar
      },
      createdAt: new Date().toISOString(),
      pending: true
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    
    console.log('Sending message:', { content, roomId, userId: user.id, tempId });
    
    socket.emit('message:send', {
      content,
      roomId: room._id, // Use the actual room ID
      userId: user.id,
      tempId
    }, (response) => {
      // Handle acknowledgment
      if (response?.error) {
        console.error('Error sending message:', response.error);
        // Remove optimistic message
        setMessages(prev => prev.filter(msg => msg.tempId !== tempId));
      }
    });
  };

  const handleTyping = (isTyping) => {
    if (isTyping && room) {
      socket.emit('typing:start', {
        roomId: room._id,
        userId: user.id,
        username: user.username
      });

      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      // Stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing:stop', { roomId, userId: user.id });
      }, 3000);
    } else {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      socket.emit('typing:stop', { roomId, userId: user.id });
    }
  };

  // Loading state
  if (loading || !room || !socket || !user) {
    return <LoadingSpinner />;
  }

  // Error state
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/chat/default')}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Return to Main Room
            </button>
            <button 
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar with user list */}
        <div className="w-64 bg-white border-r flex flex-col">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold">{room.name}</h2>
            <p className="text-sm text-gray-500">{onlineUsers.length} online</p>
          </div>
          <div className="flex-1 overflow-y-auto">
            <UserList users={onlineUsers} />
          </div>
        </div>

        {/* Main chat area */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="chat-header">
            <div>
              <h1 className="chat-title">Group Chat</h1>
              <p className="chat-subtitle">
                Online users: {onlineUsers.length || 1}
              </p>
            </div>
          </div>

          <div className="message-list">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <p className="text-xl mb-2">💬</p>
                  <p>No messages yet. Start the conversation!</p>
                </div>
              </div>
            ) : (
              <MessageList messages={messages} currentUserId={user.id} />
            )}
          </div>

          {/* Typing Indicator */}
          {typingUsers.size > 0 && (
            <div className="typing-indicator">
              <TypingIndicator users={Array.from(typingUsers)} />
            </div>
          )}

          {/* Message Input */}
          <div className="composer">
            <MessageInput 
              onSend={handleSendMessage}
              onTyping={handleTyping}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatRoom;