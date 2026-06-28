const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');

router.post('/', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const { bookingId, feedback, rating } = req.body;
    const booking = await Booking.findOneAndUpdate(
      { _id: bookingId, user: req.session.userId },
      { feedback, rating }, { new: true }
    );
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/all', async (req, res) => {
  try {
    const feedbacks = await Booking.find({ feedback: { $exists: true, $ne: '' } })
      .populate('user', 'fullName')
      .select('feedback rating renterName createdAt gearName')
      .sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;