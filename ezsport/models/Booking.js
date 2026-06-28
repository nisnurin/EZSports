const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingId: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  gear: { type: mongoose.Schema.Types.ObjectId, ref: 'Gear', required: true },
  gearId: { type: String },
  gearName: { type: String },
  renterName: { type: String },
  studentId: { type: String },
  staffId: { type: String },
  rentalType: { type: String, enum: ['leisure', 'athlete'], default: 'leisure' },
  rentalDate: { type: Date, required: true },
  returnDate: { type: Date, required: true },
  pickupTime: { type: String, required: true },
  returnTime: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'active', 'returned', 'cancelled'], default: 'pending' },
  feedback: { type: String },
  rating: { type: Number, min: 1, max: 5 },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);