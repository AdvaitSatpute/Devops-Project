const express = require('express');
const mongoose = require('mongoose');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI || 'mongodb://mongodb:27017/chatapp', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('MongoDB connected');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// Models
const User = require('./models/User');
const Message = require('./models/Message');
const Conversation = require('./models/Conversation');

// Multer setup for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage });

// Keyword list for filtering
const keywords = ['urgent', 'important', 'critical', 'alert', 'asap'];

function isImportant(text) {
  return keywords.some(keyword => text.toLowerCase().includes(keyword));
}

// Track online users: userId -> socketId
const userSockets = {};

// ============ USER ROUTES ============

// Returns ALL registered users so frontend can show them in New Chat modal
app.get('/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ AUTHENTICATION ROUTES ============

app.post('/register', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const user = new User({ username, password });
    await user.save();

    res.status(201).json({ message: 'User registered successfully', userId: user._id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = await User.findOne({ username, password });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    res.json({
      message: 'Login successful',
      userId: user._id,
      username: user.username
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ CONVERSATION ROUTES ============

app.get('/conversations', async (req, res) => {
  try {
    const userId = req.query.userId;
    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    const conversations = await Conversation.find({ members: userId })
      .populate('members', 'username')
      .populate('createdBy', 'username')
      .sort({ lastMessageTime: -1 });

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/conversations', async (req, res) => {
  try {
    const { name, type, members, userId } = req.body;

    if (!type || !members || !userId) {
      return res.status(400).json({ error: 'type, members, and userId required' });
    }

    const memberSet = new Set(members.map(m => m.toString()));
    memberSet.add(userId.toString());
    const uniqueMembers = Array.from(memberSet);

    // For direct messages, reuse existing conversation if already exists
    if (type === 'direct' && uniqueMembers.length === 2) {
      const existing = await Conversation.findOne({
        type: 'direct',
        members: { $all: uniqueMembers, $size: 2 }
      }).populate('members', 'username').populate('createdBy', 'username');

      if (existing) {
        return res.json(existing);
      }
    }

    const conversation = new Conversation({
      name: name || (type === 'direct' ? 'Direct Message' : 'New Group'),
      type,
      members: uniqueMembers,
      createdBy: userId
    });

    await conversation.save();
    await conversation.populate('members', 'username');
    await conversation.populate('createdBy', 'username');

    // Notify all online members so their sidebar updates immediately
    for (const memberId of uniqueMembers) {
      const socketId = userSockets[memberId.toString()];
      if (socketId) {
        io.to(socketId).emit('new_conversation', conversation);
      }
    }

    res.status(201).json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/conversations/:id', async (req, res) => {
  try {
    const conversation = await Conversation.findById(req.params.id)
      .populate('members', 'username')
      .populate('createdBy', 'username');

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    res.json(conversation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ MESSAGE ROUTES ============

app.get('/conversations/:id/messages', async (req, res) => {
  try {
    const messages = await Message.find({ conversationId: req.params.id })
      .sort({ timestamp: 1 })
      .limit(100);

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ SUMMARY ROUTE ============

app.get('/conversations/:id/summary', async (req, res) => {
  try {
    const messages = await Message.find({ conversationId: req.params.id })
      .sort({ timestamp: -1 })
      .limit(20);

    if (messages.length === 0) {
      return res.json({ summary: 'No messages yet' });
    }

    const users = new Set(messages.map(m => m.username));
    const importantCount = messages.filter(m => m.isImportant).length;
    const summary = `Chat summary: ${messages.length} messages from ${users.size} users. ${importantCount} marked as important.`;

    res.json({ summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ FILE UPLOAD ============

app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ imageUrl });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ SOCKET.IO ============

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Register user as online after login
  socket.on('user_login', (data) => {
    userSockets[data.userId] = socket.id;
    console.log(`User ${data.username} is online`);
  });

  socket.on('join_conversation', (data) => {
    socket.join(data.conversationId);
    console.log(`User ${data.username} joined room ${data.conversationId}`);
  });

  socket.on('leave_conversation', (data) => {
    socket.leave(data.conversationId);
  });

  socket.on('send_message', async (data) => {
    try {
      const isImportantMsg = isImportant(data.text);

      // Save message to DB — this is what delivers it to offline users later
      const message = new Message({
        conversationId: data.conversationId,
        userId: data.userId,
        username: data.username,
        text: data.text,
        imageUrl: data.imageUrl || null,
        isImportant: isImportantMsg,
        timestamp: new Date()
      });

      await message.save();

      // Update conversation's last message preview
      await Conversation.findByIdAndUpdate(data.conversationId, {
        lastMessage: data.text.substring(0, 50),
        lastMessageTime: new Date()
      });

      // Emit to all users currently in this conversation room (online + joined)
      io.to(data.conversationId).emit('receive_message', {
        id: message._id,
        conversationId: message.conversationId,
        userId: message.userId,
        username: message.username,
        text: message.text,
        imageUrl: message.imageUrl,
        isImportant: message.isImportant,
        timestamp: message.timestamp
      });

      // Ping all members personally so their sidebar refreshes
      // Offline users won't have a socket — that's fine, DB handles their delivery
      const conversation = await Conversation.findById(data.conversationId);
      for (const memberId of conversation.members) {
        const socketId = userSockets[memberId.toString()];
        if (socketId) {
          io.to(socketId).emit('conversation_updated', {
            conversationId: data.conversationId,
            lastMessage: data.text.substring(0, 50),
            lastMessageTime: new Date()
          });
        }
      }
    } catch (error) {
      console.error('Message save error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  socket.on('typing', (data) => {
    socket.to(data.conversationId).emit('user_typing', { username: data.username });
  });

  socket.on('stop_typing', (data) => {
    socket.to(data.conversationId).emit('user_stop_typing');
  });

  socket.on('disconnect', () => {
    for (const userId in userSockets) {
      if (userSockets[userId] === socket.id) {
        delete userSockets[userId];
        console.log(`User ${userId} went offline`);
        break;
      }
    }
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
