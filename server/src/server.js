const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const { Server } = require("socket.io");

const { connectDB } = require("./config/db");
const { socketAuthMiddleware } = require("./middleware/socketAuth");

dotenv.config();

const app = express();
const httpServer = http.createServer(app);

connectDB();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || process.env.ALLOWED_ORIGIN || "")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

const defaultOrigins = ["http://localhost:5173", "http://127.0.0.1:5173"];

const corsOrigins = allowedOrigins.length > 0 ? allowedOrigins : defaultOrigins;

if (process.env.NODE_ENV !== "production") {
  const timestamp = new Date().toISOString();
  process.stdout.write(`[${timestamp}] CORS origins: ${corsOrigins.join(", ")}\n`);
}

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin || corsOrigins.includes(origin) || corsOrigins.includes("*")) {
      callback(null, true);
    } else {
      if (process.env.NODE_ENV !== "production") {
        process.stderr.write(`[CORS] Blocked origin: ${origin}\n`);
      }
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-User-Id"],
  exposedHeaders: ["Content-Range", "X-Content-Range"],
  maxAge: 600
};

app.use(cors(corsOptions));

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins,
    credentials: true,
    methods: ["GET", "POST"]
  }
});

global.io = io;

const userPresence = new Map();

io.use(socketAuthMiddleware);

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => res.send("Chat API OK"));
app.get("/healthz", (req, res) => res.json({ status: "ok" }));

const conversationRoutes = require("./routes/conversationRoutes");
const messageRoutes = require("./routes/messageRoutes");
const userRoutes = require("./routes/userRoutes");

app.use("/api/conversations", conversationRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/users", userRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Not Found" });
});

app.use((err, req, res, next) => {
  const status = err.statusCode || 500;
  const response = {
    message: err.message || "Internal server error"
  };
  if (process.env.NODE_ENV !== "production") {
    response.stack = err.stack;
  }
  res.status(status).json(response);
});

io.on("connection", (socket) => {
  const { userId } = socket.data;
  if (userId) {
    userPresence.set(userId, socket.id);
    socket.join(userId);
  }

  socket.on("conversation:join", (conversationId) => {
    if (conversationId) {
      socket.join(conversationId);
    }
  });

  socket.on("conversation:leave", (conversationId) => {
    if (conversationId) {
      socket.leave(conversationId);
    }
  });

  socket.on("message:new", ({ conversationId, message }) => {
    if (conversationId && message) {
      socket.to(conversationId).emit("message:new", { conversationId, message });
    }
  });

  socket.on("disconnect", () => {
    if (userId) {
      userPresence.delete(userId);
    }
  });
});

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, () => {
  if (process.env.NODE_ENV !== "production") {
    const timestamp = new Date().toISOString();
    process.stdout.write(`[${timestamp}] Server ready on http://localhost:${PORT}\n`);
  }
});
