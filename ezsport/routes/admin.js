const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Booking = require('../models/Booking');

router.get('/stats', async (req, res) => {
  try {
    const activeLoans = await Booking.countDocuments({ status: 'accepted' });
    const pendingRequests = await Booking.countDocuments({ status: 'pending' });
    const totalUsers = await User.countDocuments({ role: 'user' });
    const feedbackCount = await Booking.countDocuments({ feedback: { $exists: true, $ne: '' } });
    res.json({ activeLoans, pendingRequests, totalUsers, feedbackCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'user' }).select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;