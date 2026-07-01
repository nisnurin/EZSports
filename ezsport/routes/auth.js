const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Notification = require('../models/Notification');

// Helper: convert empty string / whitespace-only to null
function nullify(val) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

// Register
router.post('/register', async (req, res) => {
  try {
    const {
      fullName, email, phoneNumber, password, role
    } = req.body;

    // Sanitize ID fields — empty string must become null so the sparse
    // unique index doesn't treat every blank as a duplicate of every other blank.
    const studentId = nullify(req.body.studentId);
    const staffId   = nullify(req.body.staffId);

    // ── Basic validation ──────────────────────────────────────────────
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Full name, email and password are required.' });
    }

    // ── Duplicate email check ─────────────────────────────────────────
    const existingEmail = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingEmail) {
      return res.status(400).json({ error: 'An account with this email already exists. Please log in.' });
    }

    // ── Duplicate Student ID check (users only) ───────────────────────
    if (studentId) {
      const existingStudent = await User.findOne({ studentId });
      if (existingStudent) {
        return res.status(400).json({ error: 'This Student ID is already registered. Please log in instead.' });
      }
    }

    // ── Duplicate Staff ID check (admins only) ────────────────────────
    if (staffId) {
      const existingStaff = await User.findOne({ staffId });
      if (existingStaff) {
        return res.status(400).json({ error: 'This Staff ID is already registered. Please log in instead.' });
      }
    }

    // ── Create user ───────────────────────────────────────────────────
    const user = new User({
      fullName:    String(fullName).trim(),
      email:       String(email).toLowerCase().trim(),
      phoneNumber: nullify(phoneNumber),
      studentId,   // already null or trimmed string
      staffId,     // already null or trimmed string
      password,
      role: role || 'user'
    });

    await user.save();

    req.session.userId = user._id;
    req.session.role   = user.role;

    await Notification.create({
      user:    user._id,
      message: `Welcome to EZSport, ${user.fullName}! 🎉`,
      type:    'system'
    });

    res.json({
      success: true,
      user: {
        id:        user._id,
        fullName:  user.fullName,
        email:     user.email,
        role:      user.role,
        studentId: user.studentId,
        staffId:   user.staffId
      }
    });

  } catch (err) {
    // Catch any MongoDB duplicate-key errors that slip through (race condition safety net)
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern || {})[0] || 'field';
      const labels = { email: 'Email', studentId: 'Student ID', staffId: 'Staff ID' };
      const label = labels[field] || field;
      return res.status(400).json({ error: `${label} is already registered. Please log in.` });
    }
    console.error('Register error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { password, role } = req.body;
    const email = String(req.body.email || '').toLowerCase().trim();

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // Find by email AND role — admin/user accounts are separate
    const user = await User.findOne({ email, role: role || 'user' });
    if (!user) {
      return res.status(400).json({ error: 'No account found with this email. Please sign up.' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) {
      return res.status(400).json({ error: 'Incorrect password. Please try again.' });
    }

    req.session.userId = user._id;
    req.session.role   = user.role;

    res.json({
      success: true,
      user: {
        id:        user._id,
        fullName:  user.fullName,
        email:     user.email,
        role:      user.role,
        studentId: user.studentId,
        staffId:   user.staffId
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Get current user
router.get('/me', async (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  try {
    const user = await User.findById(req.session.userId).select('-password');
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;