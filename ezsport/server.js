require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 80;

// =========================================================================
// DATABASE CONNECTION STRING
// =========================================================================
const MONGODB_URI = process.env.MONGODB_URI;
const SESSION_SECRET_ENV = process.env.SESSION_SECRET || 'ezsport_secret';

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('✅ MongoDB connected'))
  .catch(err => console.error('❌ MongoDB error:', err));

// Render sits behind a proxy — this is required for secure cookies to work
app.set('trust proxy', 1);

// =========================================================================
// CORS — allow your Vercel frontend domain(s) and send credentials (cookies)
// =========================================================================
const ALLOWED_ORIGINS = [
  'https://ezsportss.vercel.app',
  'https://ezsportss-git-main-irfandanish19s-projects.vercel.app',
  'http://localhost:3000', // optional: for local frontend testing
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like Postman, curl, or server-to-server)
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS: ' + origin));
    }
  },
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// =========================================================================
// Session — cross-domain cookie settings (frontend and backend are now
// on different domains: Vercel vs Render)
// =========================================================================
app.use(session({
  secret: SESSION_SECRET_ENV,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ mongoUrl: MONGODB_URI }),
  cookie: {
    maxAge: 1000 * 60 * 60 * 24, // 24 hours
    secure: true,       // requires HTTPS — both Vercel and Render provide this
    sameSite: 'none',   // required for cross-domain cookies to be sent/accepted
  }
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