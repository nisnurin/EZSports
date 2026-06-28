const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Notification = require('../models/Notification');

// Register
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, phoneNumber, studentId, staffId, password, role } = req.body;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const user = new User({ fullName, email, phoneNumber, studentId, staffId, password, role: role || 'user' });
    await user.save();
    req.session.userId = user._id;
    req.session.role = user.role;
    await Notification.create({ user: user._id, message: `Welcome to EZSport, ${fullName}!`, type: 'system' });
    res.json({ success: true, user: { id: user._id, fullName, email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;
    const user = await User.findOne({ email, role: role || 'user' });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const valid = await user.comparePassword(password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
    req.session.userId = user._id;
    req.session.role = user.role;
    res.json({ success: true, user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, studentId: user.studentId, staffId: user.staffId } });
  } catch (err) {
    res.status(500).json({ error: err.message });
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