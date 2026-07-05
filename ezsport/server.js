require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5002;

// =========================================================================
// DATABASE CONNECTION STRING (Hardcoded directly to fix the undefined error)
// =========================================================================
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error("MONGODB_URI environment variable is required");
}
const SESSION_SECRET_ENV = process.env.SESSION_SECRET || 'ezsport_secret';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Middleware configuration
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration using connect-mongo store
app.use(session({
  secret: SESSION_SECRET_ENV,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: MONGODB_URI 
  }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 } // Session expires in 24 hours
}));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/gear', require('./routes/gear'));
app.use('/api/sports', require('./routes/sports'));
app.use('/api/about', require('./routes/about'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/feedback', require('./routes/feedback'));
app.use('/api/notifications', require('./routes/notifications'));

// Serve the main HTML for all client-side routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`🚀 EZSport server running at http://localhost:${PORT}`);
});