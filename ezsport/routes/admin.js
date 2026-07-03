const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const Booking = require('../models/Booking');

router.get('/stats', async (req, res) => {
  try {
    const [activeLoans, pendingRequests, totalUsers, feedbackCount, overdueCount] = await Promise.all([
      Booking.countDocuments({ status: { $in: ['accepted', 'active'] } }),
      Booking.countDocuments({ status: 'pending' }),
      User.countDocuments({ role: 'user' }),
      Booking.countDocuments({ feedback: { $exists: true, $ne: '' } }),
      Booking.countDocuments({ status: { $in: ['accepted', 'active'] }, returnDate: { $lt: new Date() } })
    ]);
    res.json({ activeLoans, pendingRequests, totalUsers, feedbackCount, overdueCount });
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