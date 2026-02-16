const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const conversationRoutes = require('./routes/conversations');
const app = express();
// Parse JSON bodies (for POST, PUT, DELETE, etc.)
app.use(express.json());
app.use(cors({ methods: ['GET','POST','PUT','DELETE','OPTIONS'],}));
app.use(bodyParser.json());
mongoose.connect('mongodb://127.0.0.1:27017/commentTracker');
app.use('/api/conversations', conversationRoutes);
app.listen(5000, () => console.log('Backend running on http://localhost:5000'));