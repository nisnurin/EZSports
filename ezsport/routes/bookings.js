const express  = require('express');
const router   = express.Router();
const Booking  = require('../models/Booking');
const Gear     = require('../models/Gear');
const Notification = require('../models/Notification');
const { v4: uuidv4 } = require('uuid');

function buildDeadline(returnDate, returnTime) {
  const [h, m] = (returnTime || '23:59').split(':').map(Number);
  const d = new Date(returnDate);
  d.setHours(h, m, 0, 0);
  return d;
}

function overdueLabel(deadline) {
  const ms = Date.now() - deadline.getTime();
  if (ms <= 0) return null;
  const totalMins = Math.floor(ms / 60000);
  const days  = Math.floor(totalMins / 1440);
  const hours = Math.floor((totalMins % 1440) / 60);
  const mins  = totalMins % 60;
  if (days > 0)  return `${days}d ${hours}h overdue`;
  if (hours > 0) return `${hours}h ${mins}m overdue`;
  return `${mins}m overdue`;
}

function enrich(booking) {
  const obj = booking.toJSON ? booking.toJSON() : { ...booking };
  const active = obj.status === 'accepted' || obj.status === 'active';
  if (active && obj.returnDate) {
    const deadline = buildDeadline(obj.returnDate, obj.returnTime);
    obj.overdueLabel = overdueLabel(deadline);
    obj.isOverdue    = !!obj.overdueLabel;
  } else {
    obj.overdueLabel = null;
    obj.isOverdue    = false;
  }
  return obj;
}

// CREATE
router.post('/', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const { gearId, rentalDate, returnDate, pickupTime, returnTime, quantity, rentalType } = req.body;
    const gear = await Gear.findById(gearId);
    if (!gear) return res.status(404).json({ error: 'Gear not found' });
    const qty = parseInt(quantity) || 1;
    if (gear.availableQuantity < qty)
      return res.status(400).json({ error: `Only ${gear.availableQuantity} unit(s) available.` });

    const User = require('../models/User');
    const user = await User.findById(req.session.userId);
    const bookingId = 'BK' + uuidv4().slice(0, 8).toUpperCase();

    const booking = new Booking({
      bookingId, user: req.session.userId, gear: gear._id,
      gearId: gear.gearId, gearName: gear.itemName,
      renterName: user.fullName, studentId: user.studentId, staffId: user.staffId,
      rentalDate, returnDate, pickupTime,
      returnTime: returnTime || '17:00',
      quantity: qty, rentalType: rentalType || 'leisure',
      status: 'pending', rentalStatus: 'Pending'
    });
    await booking.save();
    await Notification.create({
      user: req.session.userId,
      message: `Booking for "${gear.itemName}" submitted. Awaiting admin approval. 📬`,
      type: 'booking'
    });
    return res.json(booking);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// MY BOOKINGS
router.get('/my', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const bookings = await Booking.find({ user: req.session.userId }).populate('gear').sort({ createdAt: -1 });
    return res.json(bookings.map(enrich));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ALL BOOKINGS (admin)
router.get('/all', async (req, res) => {
  try {
    const bookings = await Booking.find().populate('gear').populate('user', '-password').sort({ createdAt: -1 });
    return res.json(bookings.map(enrich));
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ACCEPT / REJECT (admin)
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id).populate('gear');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });

    booking.status = status;

    if (status === 'accepted') {
      booking.rentalStatus = 'Active';
      const gear = await Gear.findById(booking.gear._id);
      if (gear) {
        gear.availableQuantity = Math.max(0, gear.availableQuantity - booking.quantity);
        if (gear.availableQuantity === 0) gear.status = 'Rented';
        gear.lastRental = new Date();
        await gear.save();
      }
      await Notification.create({
        user: booking.user,
        message: `✅ Booking for "${booking.gearName}" ACCEPTED! Pickup at ${booking.pickupTime}.`,
        type: 'booking'
      });
    } else if (status === 'rejected') {
      booking.rentalStatus = 'Cancelled';
      await Notification.create({
        user: booking.user,
        message: `❌ Booking for "${booking.gearName}" was rejected.`,
        type: 'booking'
      });
    }

    await booking.save();
    return res.json(booking);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// MARK AS RETURNED (admin)
router.put('/:id/return', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('gear');
    if (!booking) return res.status(404).json({ error: 'Booking not found' });
    if (booking.status === 'returned')
      return res.status(400).json({ error: 'Already marked as returned.' });

    // 1. Update Booking status variables
    booking.status           = 'returned';
    booking.rentalStatus     = 'Returned';
    booking.actualReturnDate = new Date();
    await booking.save();

    // 2. Put back the stock quantity inside Gear collection
    const gear = await Gear.findById(booking.gear._id || booking.gear);
    if (gear) {
      // Safely increment available inventory based on quantity field names
      const currentAvail = gear.availableQuantity || gear.quantity || 0;
      gear.availableQuantity = currentAvail + booking.quantity;
      
      // Toggle status back to available if it was fully rented out previously
      if (gear.status === 'Rented' || gear.status === 'rented') {
        gear.status = 'Available';
      }
      await gear.save();
    }

    // 3. Fire a system notification confirmation back to the student/staff
    await Notification.create({
      user: booking.user,
      message: `📦 Your rented gear "${booking.gearName}" has been safely returned. Thank you!`,
      type: 'booking'
    });

    return res.json({ success: true, booking });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// CANCEL (user)
router.put('/:id/cancel', async (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated' });
  try {
    const booking = await Booking.findOneAndUpdate(
      { _id: req.params.id, user: req.session.userId, status: 'pending' },
      { status: 'cancelled', rentalStatus: 'Cancelled' },
      { new: true }
    );
    if (!booking) return res.status(404).json({ error: 'Booking not found or cannot be cancelled.' });
    return res.json(booking);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;