const express = require('express');
const mongoose = require('mongoose');
require("dotenv").config();
const cors = require('cors');
const authRoutes = require('./routes/auth');
const conversationRoutes = require('./routes/conversations');
const profileStatsRoutes = require('./routes/profileStats');
const blogPostRoutes = require('./routes/blogPosts');
const app = express();
app.set('trust proxy', 1);
// Parse JSON bodies (for POST, PUT, DELETE, etc.)
app.use(express.json());
const frontendOrigin = process.env.FRONTEND_URL
  ? new URL(process.env.FRONTEND_URL).origin
  : 'http://localhost:3000';
const allowedOrigins = new Set([frontendOrigin, 'http://localhost:3000', 'http://127.0.0.1:3000']);
app.use(cors({ origin: [...allowedOrigins], credentials: true, methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'] }));
app.use((req, res, next) => {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  if (!allowedOrigins.has(req.get('Origin'))) return res.status(403).json({ message: 'Request origin is not allowed' });
  next();
});
const mongoUri = process.env.MONGO_URI;

// mongoose.connect('mongodb://127.0.0.1:27017/commentTracker');
mongoose.connect(mongoUri)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error:", err));

app.use('/api/auth', authRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/profile-stats', profileStatsRoutes);
app.use('/api/blog-posts', blogPostRoutes);
// Listen on Render PORT or local 5000
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
