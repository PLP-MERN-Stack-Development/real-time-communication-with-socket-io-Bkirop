# Real-Time Chat Application with Socket.io

A full-stack real-time chat application built with the MERN stack and Socket.io, featuring user authentication, multiple chat rooms, typing indicators, notifications, and advanced messaging capabilities.

![Chat Application Preview](https://via.placeholder.com/800x400/4F46E5/FFFFFF?text=Real-Time+Chat+App)

## 🚀 Features

### Core Features
- **Real-time Messaging**: Instant message delivery using Socket.io
- **User Authentication**: Secure login and registration with JWT tokens
- **Multiple Chat Rooms**: Create and join different chat rooms
- **User Presence**: Real-time online/offline status indicators
- **Typing Indicators**: See when other users are typing
- **Message Notifications**: Browser notifications for new messages

### Advanced Features
- **Message Reactions**: Add emoji reactions to messages
- **Private Messaging**: Direct messages between users
- **Message Editing**: Edit sent messages
- **Message Deletion**: Delete your own messages
- **Read Receipts**: See when messages are read
- **Message History**: Persistent message storage with MongoDB
- **Responsive Design**: Works on desktop and mobile devices

## 🛠️ Tech Stack

### Frontend
- **React 18** - Modern JavaScript library for building user interfaces
- **Vite** - Fast build tool and development server
- **React Router** - Client-side routing
- **Material-UI** - React components implementing Google's Material Design
- **Socket.io Client** - Real-time bidirectional communication
- **Axios** - HTTP client for API requests
- **Tailwind CSS** - Utility-first CSS framework
- **date-fns** - Modern JavaScript date utility library

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web application framework
- **Socket.io** - Real-time communication engine
- **MongoDB** - NoSQL database
- **Mongoose** - MongoDB object modeling
- **JWT** - JSON Web Tokens for authentication
- **bcryptjs** - Password hashing
- **CORS** - Cross-origin resource sharing

## 📋 Prerequisites

Before running this application, make sure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **MongoDB** (local installation or cloud service like MongoDB Atlas)
- **Git**

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/PLP-MERN-Stack-Development/real-time-communication-with-socket-io-Bkirop.git
cd real-time-communication-with-socket-io
```

### 2. Environment Setup

#### Backend Environment Variables
Create a `.env` file in the `server` directory:

```env
<<<<<<< HEAD

NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/chatapp
JWT_SECRET=your-super-secret-jwt-key-here
CORS_ORIGIN=http://localhost:5173
```

#### Frontend Environment Variables
Create a `.env` file in the `client` directory:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 3. Install Dependencies

#### Install Server Dependencies
```bash
cd server
npm install
```

#### Install Client Dependencies
```bash
cd ../client
npm install
```

### 4. Start MongoDB

Make sure MongoDB is running on your system:

=======
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/chatapp
JWT_SECRET=your-super-secret-jwt-key-here
CORS_ORIGIN=http://localhost:5173
```

#### Frontend Environment Variables
Create a `.env` file in the `client` directory:

```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

### 3. Install Dependencies

#### Install Server Dependencies
```bash
cd server
npm install
```

#### Install Client Dependencies
```bash
cd ../client
npm install
```

### 4. Start MongoDB

Make sure MongoDB is running on your system:

>>>>>>> d203863e990fcf00184910458de3f94a45cf892b
```bash
# For local MongoDB installation
mongod

# Or use MongoDB Atlas for cloud database
```

### 5. Run the Application

#### Start the Backend Server
```bash
cd server
npm run dev
```

#### Start the Frontend Client
```bash
cd client
npm run dev
```

The application will be available at:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000

## 📖 Usage

### Getting Started

1. **Register**: Create a new account with username, email, and password
2. **Login**: Sign in with your credentials
3. **Join Chat**: Automatically join the default chat room or create/join other rooms
4. **Start Chatting**: Send messages, react to messages, and enjoy real-time communication

### Chat Features

#### Sending Messages
- Type your message in the input field at the bottom
- Press Enter or click Send to send the message
- Messages are sent instantly to all users in the room

#### Message Reactions
- Hover over any message to see the reaction button
- Click the emoji button to add reactions
- Multiple users can react with different emojis

#### Private Messaging
- Click on a user's name in the user list
- Send direct messages that only you and the recipient can see

#### Message Management
- **Edit**: Click the edit icon on your messages to modify them
- **Delete**: Click the delete icon to remove your messages
- **Read Receipts**: See when others have read your messages

### Keyboard Shortcuts
- `Enter` - Send message
- `Shift + Enter` - New line in message input

## 🔌 API Documentation

### Authentication Endpoints

#### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123"
}
```

#### POST /api/auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

### Room Endpoints

#### GET /api/rooms
Get all available chat rooms.

#### GET /api/rooms/:id
Get details of a specific room.

#### POST /api/rooms
Create a new chat room.

**Request Body:**
```json
{
  "name": "General Discussion",
  "description": "Main chat room",
  "type": "public"
}
```

### Socket Events

#### Client → Server Events
- `authenticate` - Authenticate socket connection
- `room:join` - Join a chat room
- `room:leave` - Leave a chat room
- `message:send` - Send a message
- `typing:start` - Start typing indicator
- `typing:stop` - Stop typing indicator
- `message:read` - Mark message as read
- `reaction:add` - Add reaction to message
- `reaction:remove` - Remove reaction from message
- `message:edit` - Edit a message
- `message:delete` - Delete a message

#### Server → Client Events
- `authenticated` - Authentication successful
- `room:messages` - Receive room message history
- `message:new` - New message received
- `user:joined` - User joined the room
- `user:left` - User left the room
- `room:users` - Updated list of online users
- `typing:user` - Typing indicator update
- `message:read:update` - Read receipt update
- `reaction:updated` - Reaction update
- `message:edited` - Message edited
- `message:deleted` - Message deleted

## 🏗️ Project Structure

```
real-time-communication-with-socket-io/
├── client/                          # React frontend
│   ├── public/                      # Static assets
│   ├── src/
│   │   ├── components/              # React components
│   │   │   ├── Auth/               # Authentication components
│   │   │   ├── Chat/               # Chat-related components
│   │   │   └── Notifications/      # Notification components
│   │   ├── contexts/               # React context providers
│   │   ├── hooks/                  # Custom React hooks
│   │   ├── services/               # API service functions
│   │   └── socket/                 # Socket.io client setup
│   └── package.json
├── server/                          # Node.js backend
│   ├── src/
│   │   ├── config/                 # Database configuration
│   │   ├── controllers/            # Socket event handlers
│   │   ├── middleware/             # Express middleware
│   │   ├── models/                 # MongoDB models
│   │   ├── routes/                 # API routes
│   │   └── server.js               # Main server file
│   └── package.json
└── README.md
```

## 🔧 Development

### Available Scripts

#### Client Scripts
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
npm run clean        # Clean build files
```

#### Server Scripts
```bash
npm start            # Start production server
npm run dev          # Start development server with nodemon
```

### Code Quality
- ESLint configuration for code linting
- Prettier for code formatting
- Error boundaries for React error handling

## 🚀 Deployment

### Backend Deployment
1. Set environment variables for production
2. Build and deploy to your preferred hosting service (Heroku, DigitalOcean, AWS, etc.)
3. Ensure MongoDB connection string is set correctly

### Frontend Deployment
1. Build the production bundle: `npm run build`
2. Deploy to static hosting service (Netlify, Vercel, GitHub Pages, etc.)
3. Update API URLs in environment variables

### Environment Variables for Production
```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/chatapp
JWT_SECRET=your-production-jwt-secret
CORS_ORIGIN=https://your-frontend-domain.com
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Socket.io](https://socket.io/) for real-time communication
- [React](https://reactjs.org/) for the frontend framework
- [MongoDB](https://www.mongodb.com/) for the database
- [Material-UI](https://mui.com/) for UI components

## 📞 Support

If you have any questions or need help, please open an issue on GitHub or contact the maintainers.

---

<<<<<<< HEAD
**Happy Chatting! 🎉**
=======
**Happy Chatting! 🎉**
>>>>>>> d203863e990fcf00184910458de3f94a45cf892b
