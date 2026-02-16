const express = require('express');
const mongoose = require('mongoose');
require("dotenv").config();
const cors = require('cors');
const bodyParser = require('body-parser');
const conversationRoutes = require('./routes/conversations');
const app = express();
// Parse JSON bodies (for POST, PUT, DELETE, etc.)
app.use(express.json());
app.use(cors({ methods: ['GET','POST','PUT','DELETE','OPTIONS'],}));
app.use(bodyParser.json());
const mongoUri = process.env.MONGO_URI;

// mongoose.connect('mongodb://127.0.0.1:27017/commentTracker');
mongoose.connect(mongoUri,{
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB connection error:", err));

app.use('/api/conversations', conversationRoutes);
// Listen on Render PORT or local 5000
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));