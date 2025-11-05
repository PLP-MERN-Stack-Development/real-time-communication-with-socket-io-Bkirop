require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/chat-app')
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// In-memory storage for testing
const connectedUsers = new Map();
const messages = [];

// Socket.io handlers
io.on('connection', (socket) => {
  console.log('🔌 User connected:', socket.id);

  socket.on('authenticate', (data) => {
    const { userId } = data;
    connectedUsers.set(userId, socket.id);
    socket.userId = userId;
    socket.emit('authenticated', { success: true });
    console.log('✅ User authenticated:', userId);
  });

  socket.on('room:join', ({ roomId, userId }) => {
    socket.join(roomId);
    socket.emit('room:messages', { roomId, messages });
    socket.to(roomId).emit('user:joined', { userId, roomId });
    console.log(`✅ User ${userId} joined room ${roomId}`);
  });

  socket.on('message:send', (data) => {
    const message = {
      _id: Date.now().toString(),
      content: data.content,
      sender: {
        _id: data.userId,
        username: data.username || 'User',
        avatar: `https://ui-avatars.com/api/?name=${data.username || 'User'}`
      },
      room: data.roomId,
      createdAt: new Date(),
      reactions: []
    };
    
    messages.push(message);
    io.to(data.roomId).emit('message:new', message);
    socket.emit('message:delivered', { tempId: data.tempId, messageId: message._id });
    console.log('📨 Message sent:', message.content);
  });

  socket.on('typing:start', (data) => {
    socket.to(data.roomId).emit('typing:user', {
      userId: data.userId,
      username: data.username,
      isTyping: true
    });
  });

  socket.on('typing:stop', (data) => {
    socket.to(data.roomId).emit('typing:user', {
      userId: data.userId,
      isTyping: false
    });
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      connectedUsers.delete(socket.userId);
    }
    console.log('🔌 User disconnected:', socket.id);
  });
});

// REST API Routes
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  
  if (!username || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide all fields'
    });
  }
  
  res.json({
    success: true,
    data: {
      user: {
        id: Date.now().toString(),
        username,
        email,
        avatar: `https://ui-avatars.com/api/?name=${username}&background=random`
      },
      token: 'test-token-' + Date.now()
    }
  });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Please provide email and password'
    });
  }
  
  const username = email.split('@')[0];
  
  res.json({
    success: true,
    data: {
      user: {
        id: Date.now().toString(),
        username,
        email,
        avatar: `https://ui-avatars.com/api/?name=${username}&background=random`
      },
      token: 'test-token-' + Date.now()
    }
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date(),
    users: connectedUsers.size,
    messages: messages.length
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 Socket.io ready`);
  console.log(`🌍 Visit http://localhost:${PORT}/api/health`);
});