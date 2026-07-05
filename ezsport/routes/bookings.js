const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Gear = require('../models/Gear');
const Notification = require('../models/Notification');
const { v4: uuidv4 } = require('uuid');

// Create booking
router.post('/', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const { gearId, rentalDate, returnDate, pickupTime, returnTime, quantity, rentalType } = req.body;
    const gear = await Gear.findById(gearId);
    if (!gear) return res.status(404).json({ error: 'Gear not found' });
    if (gear.availableQuantity < quantity) return res.status(400).json({ error: 'Not enough quantity available' });
    const User = require('../models/User');
    const user = await User.findById(req.session.userId);
    const bookingId = 'BK' + uuidv4().slice(0, 8).toUpperCase();
    const booking = new Booking({
      bookingId, user: req.session.userId, gear: gear._id,
      gearId: gear.gearId, gearName: gear.itemName,
      renterName: user.fullName, studentId: user.studentId, staffId: user.staffId,
      rentalDate, returnDate, pickupTime, returnTime, quantity: quantity || 1, rentalType: rentalType || 'leisure'
    });
    await booking.save();
    await Notification.create({ user: req.session.userId, message: `Booking request for ${gear.itemName} submitted. Pending approval.`, type: 'booking' });
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user bookings
router.get('/my', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const bookings = await Booking.find({ user: req.session.userId }).populate('gear').sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all bookings (admin)
router.get('/all', async (req, res) => {
  try {
    const bookings = await Booking.find().populate('gear').populate('user', '-password').sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update booking status (admin)
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id).populate('gear');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    booking.status = status;
    await booking.save();
    if (status === 'accepted') {
      const gearDoc = await Gear.findById(booking.gear._id);
      const newQty = gearDoc.availableQuantity - booking.quantity;
      await Gear.findByIdAndUpdate(booking.gear._id, {
        availableQuantity: newQty,
        status: newQty <= 0 ? 'Rented' : 'Available',
        lastRental: new Date()
      });
      await Notification.create({ user: booking.user, message: `Your booking for ${booking.gearName} has been ACCEPTED! Pickup at ${booking.pickupTime}.`, type: 'booking' });
    } else if (status === 'rejected') {
      await Notification.create({ user: booking.user, message: `Your booking for ${booking.gearName} has been rejected.`, type: 'booking' });
    } else if (status === 'returned' || status === 'late-returned') {
      const gearDoc = await Gear.findById(booking.gear._id);
      const newQty = gearDoc.availableQuantity + booking.quantity;
      const update = { availableQuantity: newQty };
      // Only auto-restore to Available if it wasn't manually set to Damaged/Not Available
      if (gearDoc.status === 'Rented' && newQty > 0) update.status = 'Available';
      await Gear.findByIdAndUpdate(booking.gear._id, update);
      if (status === 'late-returned') {
        await Notification.create({ user: booking.user, message: `Your booking for ${booking.gearName} has been marked as returned LATE.`, type: 'alert' });
      }
    }
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel booking
router.put('/:id/cancel', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, user: req.session.userId },
      { status: 'cancelled' }, { new: true }
    );
    res.json(booking);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;