const User = require('../models/User');
const Message = require('../models/Message');
const Room = require('../models/Room');

// Store connected users: userId -> socketId
const connectedUsers = new Map();

class SocketController {
  constructor(io) {
    this.io = io;
  }

  async handleConnection(socket) {
    console.log('🔌 User connected:', socket.id);

    // Authenticate user
    socket.on('authenticate', async (data) => {
      await this.handleAuthenticate(socket, data);
    });

    // Join room
    socket.on('room:join', async (data, callback) => {
      await this.handleJoinRoom(socket, data, callback);
    });

    // Leave room
    socket.on('room:leave', async (data) => {
      await this.handleLeaveRoom(socket, data);
    });

    // Send message
    socket.on('message:send', async (data, callback) => {
      await this.handleSendMessage(socket, data, callback);
    });

    // Typing indicators
    socket.on('typing:start', (data) => {
      this.handleTypingStart(socket, data);
    });

    socket.on('typing:stop', (data) => {
      this.handleTypingStop(socket, data);
    });

    // Read receipts
    socket.on('message:read', async (data) => {
      await this.handleMessageRead(socket, data);
    });

    // Reactions
    socket.on('reaction:add', async (data) => {
      await this.handleReactionAdd(socket, data);
    });

    socket.on('reaction:remove', async (data) => {
      await this.handleReactionRemove(socket, data);
    });

    // Private messages
    socket.on('message:private', async (data) => {
      await this.handlePrivateMessage(socket, data);
    });

    // Edit message
    socket.on('message:edit', async (data) => {
      await this.handleEditMessage(socket, data);
    });

    // Delete message
    socket.on('message:delete', async (data) => {
      await this.handleDeleteMessage(socket, data);
    });

    // Disconnect
    socket.on('disconnect', async () => {
      await this.handleDisconnect(socket);
    });
  }

  async handleAuthenticate(socket, data) {
    try {
      const { userId } = data;

      if (!userId) {
        socket.emit('error', { message: 'User ID required' });
        return;
      }

      // Verify user exists
      const user = await User.findById(userId);
      if (!user) {
        socket.emit('error', { message: 'User not found' });
        return;
      }

      // Update user status
      await User.findByIdAndUpdate(userId, {
        status: 'online',
        lastSeen: new Date(),
        socketId: socket.id
      });

      // Store connection
      connectedUsers.set(userId, socket.id);
      socket.userId = userId;
      socket.user = user; // Store full user object

      // Get user's rooms
      const rooms = await Room.find({ members: userId });

      // Join all user's rooms
      rooms.forEach(room => {
        socket.join(room._id.toString());
      });

      // Broadcast online status
      this.io.emit('user:status', {
        userId,
        status: 'online',
        lastSeen: new Date()
      });

      socket.emit('authenticated', { 
        success: true,
        rooms: rooms.map(r => r._id.toString())
      });

      console.log(`✅ User ${userId} authenticated`);
    } catch (error) {
      console.error('Authentication error:', error);
      socket.emit('error', { message: 'Authentication failed', details: error.message });
    }
  }

  async handleJoinRoom(socket, data, callback) {
    try {
      const { roomId, userId } = data;

      console.log('📩 Join room request:', { roomId, userId, socketId: socket.id });

      // Validate inputs
      if (!roomId || !userId) {
        const error = { error: 'Missing roomId or userId' };
        socket.emit('error', { message: 'Failed to join room', details: 'Missing required fields' });
        if (callback) callback(error);
        return;
      }

      // Verify room exists or create default room
      let room;
      try {
        room = await Room.findById(roomId);
        if (!room && roomId === 'default-room') {
          // Create default room if it doesn't exist
          room = await Room.create({
            _id: 'default-room',
            name: 'General Chat',
            type: 'default',
            description: 'Default public chat room',
            members: [userId]
          });
          console.log('✅ Created default room');
        } else if (!room) {
          const error = { error: 'Room not found' };
          socket.emit('error', { message: 'Failed to join room', details: 'Room not found' });
          if (callback) callback(error);
          return;
        }
      } catch (err) {
        const error = { error: err.message };
        socket.emit('error', { message: 'Failed to join room', details: err.message });
        if (callback) callback(error);
        return;
      }

      // Add user to room members if not already a member
      if (!room.members.includes(userId)) {
        room.members.push(userId);
        await room.save();
      }

      // Join Socket.IO room
      await socket.join(roomId.toString());
      socket.currentRoom = roomId;

      // Load room messages with full population
      const messages = await Message.find({ room: roomId })
        .populate('sender', 'username avatar status')
        .populate({
          path: 'replyTo',
          populate: { path: 'sender', select: 'username avatar' }
        })
        .sort({ createdAt: 1 }) // Ascending order (oldest first)
        .limit(50);

      console.log(`📨 Sending ${messages.length} messages to user ${userId}`);

      // Send messages as array (not object!)
      socket.emit('room:messages', messages);

      // Get online users in this room
      const socketsInRoom = await this.io.in(roomId).fetchSockets();
      const onlineUsers = socketsInRoom
        .filter(s => s.userId) // Only authenticated sockets
        .map(s => ({
          userId: s.userId,
          username: s.user?.username || 'Unknown',
          avatar: s.user?.avatar
        }));

      console.log(`👥 Online users in room ${roomId}:`, onlineUsers.length);

      // Send online users list to joining user
      socket.emit('room:users', onlineUsers);

      // Notify others in the room
      socket.to(roomId).emit('user:joined', {
        userId,
        username: socket.user?.username || 'Unknown',
        roomId,
        timestamp: new Date()
      });

      // Also broadcast updated user list to everyone
      this.io.to(roomId).emit('room:users', onlineUsers);

      console.log(`✅ User ${userId} joined room ${roomId}`);
      
      // Send success callback
      if (callback) {
        callback({ success: true, messageCount: messages.length });
      }
    } catch (error) {
      console.error('Join room error:', error);
      const errorResponse = { error: error.message };
      socket.emit('error', { message: 'Failed to join room', details: error.message });
      if (callback) callback(errorResponse);
    }
  }

  async handleLeaveRoom(socket, data) {
    try {
      const { roomId, userId } = data;

      console.log(`👋 User ${userId} leaving room ${roomId}`);

      await socket.leave(roomId);
      socket.currentRoom = null;

      // Get updated online users
      const socketsInRoom = await this.io.in(roomId).fetchSockets();
      const onlineUsers = socketsInRoom
        .filter(s => s.userId)
        .map(s => ({
          userId: s.userId,
          username: s.user?.username || 'Unknown',
          avatar: s.user?.avatar
        }));

      // Notify others
      socket.to(roomId).emit('user:left', {
        userId,
        roomId,
        timestamp: new Date()
      });

      // Send updated user list
      this.io.to(roomId).emit('room:users', onlineUsers);

      console.log(`✅ User ${userId} left room ${roomId}`);
    } catch (error) {
      console.error('Leave room error:', error);
    }
  }

  async handleSendMessage(socket, data, callback) {
    try {
      const { content, roomId, userId, type = 'text', fileUrl, fileName, replyTo, tempId } = data;

      console.log('📤 Sending message:', { roomId, userId, content: content?.substring(0, 50) });

      // Validate
      if (!content || !roomId || !userId) {
        const error = { error: 'Missing required fields' };
        socket.emit('error', { message: 'Failed to send message' });
        if (callback) callback(error);
        return;
      }

      // Create message
      const message = await Message.create({
        content,
        sender: userId,
        room: roomId,
        type,
        fileUrl,
        fileName,
        replyTo
      });

      // Populate sender info
      await message.populate('sender', 'username avatar status');
      if (replyTo) {
        await message.populate({
          path: 'replyTo',
          populate: { path: 'sender', select: 'username avatar' }
        });
      }

      // Update room's last message
      await Room.findByIdAndUpdate(roomId, {
        lastMessage: message._id,
        updatedAt: new Date()
      });

      // Broadcast to room
      this.io.to(roomId).emit('message:new', message);

      // Send success callback
      if (callback) {
        callback({ 
          success: true, 
          messageId: message._id,
          tempId 
        });
      }

      console.log(`✅ Message sent in room ${roomId}:`, message._id);
    } catch (error) {
      console.error('Send message error:', error);
      const errorResponse = { error: error.message };
      socket.emit('error', { message: 'Failed to send message', details: error.message });
      if (callback) callback(errorResponse);
    }
  }

  handleTypingStart(socket, data) {
    const { roomId, userId, username } = data;
    
    console.log(`⌨️  ${username} started typing in ${roomId}`);
    
    socket.to(roomId).emit('typing:user', {
      userId,
      username,
      isTyping: true
    });
  }

  handleTypingStop(socket, data) {
    const { roomId, userId, username } = data;
    
    console.log(`⌨️  ${username || userId} stopped typing in ${roomId}`);
    
    socket.to(roomId).emit('typing:user', {
      userId,
      username,
      isTyping: false
    });
  }

  async handleMessageRead(socket, data) {
    try {
      const { messageId, userId } = data;

      await Message.findByIdAndUpdate(messageId, {
        $addToSet: {
          readBy: {
            user: userId,
            readAt: new Date()
          }
        }
      });

      const message = await Message.findById(messageId);
      
      if (message) {
        this.io.to(message.room.toString()).emit('message:read:update', {
          messageId,
          userId,
          readAt: new Date()
        });
      }
    } catch (error) {
      console.error('Read receipt error:', error);
    }
  }

  async handleReactionAdd(socket, data) {
    try {
      const { messageId, userId, emoji } = data;

      // Remove existing reaction from this user
      await Message.findByIdAndUpdate(messageId, {
        $pull: { reactions: { user: userId } }
      });

      // Add new reaction
      const message = await Message.findByIdAndUpdate(
        messageId,
        {
          $push: {
            reactions: { user: userId, emoji, createdAt: new Date() }
          }
        },
        { new: true }
      ).populate('reactions.user', 'username avatar');

      if (message) {
        this.io.to(message.room.toString()).emit('reaction:updated', {
          messageId,
          reactions: message.reactions
        });
      }
    } catch (error) {
      console.error('Reaction error:', error);
    }
  }

  async handleReactionRemove(socket, data) {
    try {
      const { messageId, userId } = data;

      const message = await Message.findByIdAndUpdate(
        messageId,
        {
          $pull: { reactions: { user: userId } }
        },
        { new: true }
      ).populate('reactions.user', 'username avatar');

      if (message) {
        this.io.to(message.room.toString()).emit('reaction:updated', {
          messageId,
          reactions: message.reactions
        });
      }
    } catch (error) {
      console.error('Reaction remove error:', error);
    }
  }

  async handlePrivateMessage(socket, data) {
    try {
      const { content, toUserId, fromUserId } = data;

      // Find or create direct message room
      let room = await Room.findOne({
        type: 'direct',
        members: { $all: [toUserId, fromUserId], $size: 2 }
      });

      if (!room) {
        room = await Room.create({
          name: `DM-${fromUserId}-${toUserId}`,
          type: 'direct',
          members: [toUserId, fromUserId],
          creator: fromUserId
        });
      }

      // Create message
      const message = await Message.create({
        content,
        sender: fromUserId,
        room: room._id
      });

      await message.populate('sender', 'username avatar status');

      // Send to recipient
      const recipientSocketId = connectedUsers.get(toUserId);
      if (recipientSocketId) {
        this.io.to(recipientSocketId).emit('message:private:new', {
          message,
          roomId: room._id
        });
      }

      // Send to sender
      socket.emit('message:private:sent', {
        message,
        roomId: room._id
      });
    } catch (error) {
      console.error('Private message error:', error);
      socket.emit('error', { message: 'Failed to send private message', details: error.message });
    }
  }

  async handleEditMessage(socket, data) {
    try {
      const { messageId, content, userId } = data;

      const message = await Message.findById(messageId);

      if (!message) {
        return socket.emit('error', { message: 'Message not found' });
      }

      if (message.sender.toString() !== userId) {
        return socket.emit('error', { message: 'Not authorized' });
      }

      message.content = content;
      message.edited = true;
      message.editedAt = new Date();
      await message.save();

      await message.populate('sender', 'username avatar status');

      this.io.to(message.room.toString()).emit('message:edited', message);
    } catch (error) {
      console.error('Edit message error:', error);
      socket.emit('error', { message: 'Failed to edit message', details: error.message });
    }
  }

  async handleDeleteMessage(socket, data) {
    try {
      const { messageId, userId } = data;

      const message = await Message.findById(messageId);

      if (!message) {
        return socket.emit('error', { message: 'Message not found' });
      }

      if (message.sender.toString() !== userId) {
        return socket.emit('error', { message: 'Not authorized' });
      }

      const roomId = message.room.toString();
      await message.deleteOne();

      this.io.to(roomId).emit('message:deleted', {
        messageId
      });
    } catch (error) {
      console.error('Delete message error:', error);
      socket.emit('error', { message: 'Failed to delete message', details: error.message });
    }
  }

  async handleDisconnect(socket) {
    console.log('🔌 User disconnected:', socket.id);

    if (socket.userId) {
      try {
        // Update user status
        await User.findByIdAndUpdate(socket.userId, {
          status: 'offline',
          lastSeen: new Date(),
          socketId: null
        });

        // Remove from connected users
        connectedUsers.delete(socket.userId);

        // If user was in a room, update that room's user list
        if (socket.currentRoom) {
          const socketsInRoom = await this.io.in(socket.currentRoom).fetchSockets();
          const onlineUsers = socketsInRoom
            .filter(s => s.userId)
            .map(s => ({
              userId: s.userId,
              username: s.user?.username || 'Unknown',
              avatar: s.user?.avatar
            }));

          this.io.to(socket.currentRoom).emit('room:users', onlineUsers);
          this.io.to(socket.currentRoom).emit('user:left', {
            userId: socket.userId,
            roomId: socket.currentRoom,
            timestamp: new Date()
          });
        }

        // Broadcast offline status
        this.io.emit('user:status', {
          userId: socket.userId,
          status: 'offline',
          lastSeen: new Date()
        });

        console.log(`✅ User ${socket.userId} disconnected and cleaned up`);
      } catch (error) {
        console.error('Disconnect error:', error);
      }
    }
  }
}

module.exports = SocketController;