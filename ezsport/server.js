require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5002;

// ===============================
// ORIGINAL (DO NOT TOUCH)
// ===============================
const MONGODB_URI = process.env.MONGODB_URI;
// ===============================
// 🔥 ADDED (ENV SUPPORT FOR DEPLOYMENT)
// ===============================
const MONGODB_URI_ENV = process.env.MONGODB_URI || MONGODB_URI;
const SESSION_SECRET_ENV = process.env.SESSION_SECRET || 'ezsport_secret';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session
app.use(session({
  secret: SESSION_SECRET_ENV, // 🔥 ADDED (env support)
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGODB_URI }), // unchanged
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // 24 hours
}));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/gear', require('./routes/gear'));
app.use('/api/sports', require('./routes/sports'));
app.use('/api/about', require('./routes/about'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/notifications', require('./routes/notifications'));

// Serve the main HTML for all routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 EZSport server running at http://localhost:${PORT}`);
});