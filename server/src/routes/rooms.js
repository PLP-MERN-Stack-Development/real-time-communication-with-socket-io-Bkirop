const express = require('express');
const router = express.Router();
const Room = require('../models/Room');
const Message = require('../models/Message');
const { protect } = require('../middleware/auth');

// @route   GET /api/rooms/default-room
// @desc    Get or create default room (alternative endpoint)
// @access  Public (for initial connection)
router.get('/default-room', async (req, res) => {
  try {
    console.log('📩 Fetching default room...');
    
    // Try to find room with type 'default'
    let room = await Room.findOne({ type: 'default' })
      .populate('members', 'username avatar status');

    if (!room) {
      console.log('⚠️ Default room not found, creating...');
      
      // Create default room
      room = await Room.create({
        name: 'General Chat',
        type: 'default',
        description: 'Default public chat room',
        members: [],
        admins: [],
        creator: null
      });
      
      console.log('✅ Created default room:', room._id);
    } else {
      console.log('✅ Found existing default room:', room._id);
    }

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('❌ Get default room error:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// @route   GET /api/rooms
// @desc    Get all rooms for user
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const rooms = await Room.find({
      members: req.user.id
    })
      .populate('members', 'username avatar status')
      .populate('creator', 'username')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'username avatar'
        }
      })
      .sort({ updatedAt: -1 });

    res.json({
      success: true,
      data: rooms
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   POST /api/rooms
// @desc    Create new room
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const { name, type, description, members } = req.body;

    const room = await Room.create({
      name,
      type: type || 'public',
      description,
      members: [req.user.id, ...(members || [])],
      admins: [req.user.id],
      creator: req.user.id
    });

    await room.populate('members', 'username avatar status');

    res.status(201).json({
      success: true,
      data: room
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/rooms/default
// @desc    Get or create default room
// @access  Private
router.get('/default', protect, async (req, res) => {
  try {
    let room = await Room.findOne({ type: 'default' });

    if (!room) {
      room = await Room.create({
        name: 'General Chat',
        type: 'default',
        description: 'Default public chat room',
        creator: req.user.id,
        members: [req.user.id]
      });
    }

    // Ensure user is a member
    if (!room.members.includes(req.user.id)) {
      room.members.push(req.user.id);
      await room.save();
    }

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/rooms/default-room
// @desc    Get or create default room (alternative endpoint)
// @access  Public (for initial connection)
router.get('/default-room', async (req, res) => {
  try {
    // Try to find room with ID 'default-room' or type 'default'
    let room = await Room.findOne({ 
      $or: [
        { _id: 'default-room' },
        { type: 'default' }
      ]
    }).populate('members', 'username avatar status');

    if (!room) {
      // Create default room with specific ID
      room = await Room.create({
        _id: 'default-room',
        name: 'General Chat',
        type: 'default',
        description: 'Default public chat room',
        members: []
      });
      console.log('✅ Created default room');
    }

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    console.error('Get default room error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/rooms/:id
// @desc    Get room by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;

    const room = await Room.findById(id)
      .populate('members', 'username avatar status')
      .populate('creator', 'username avatar')
      .populate({
        path: 'lastMessage',
        populate: {
          path: 'sender',
          select: 'username avatar'
        }
      });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }

    res.json({
      success: true,
      data: room
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// @route   GET /api/rooms/:id/messages
// @desc    Get room messages
// @access  Private
router.get('/:id/messages', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 50, before } = req.query;

    const query = { room: id };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('sender', 'username avatar status')
      .populate({
        path: 'replyTo',
        populate: { path: 'sender', select: 'username avatar' }
      })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: messages.reverse()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;