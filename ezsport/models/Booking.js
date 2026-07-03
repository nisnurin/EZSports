const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  bookingId:        { type: String, required: true, unique: true },
  user:             { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  gear:             { type: mongoose.Schema.Types.ObjectId, ref: 'Gear', required: true },
  gearId:           { type: String },
  gearName:         { type: String },
  renterName:       { type: String },
  studentId:        { type: String },
  staffId:          { type: String },
  rentalType:       { type: String, enum: ['leisure', 'athlete'], default: 'leisure' },
  rentalDate:       { type: Date, required: true },
  returnDate:       { type: Date, required: true },
  actualReturnDate: { type: Date, default: null },
  pickupTime:       { type: String, required: true },
  returnTime:       { type: String, required: true },
  quantity:         { type: Number, default: 1 },
  rentalStatus:     { type: String, enum: ['Pending','Active','Returned','Cancelled'], default: 'Pending' },
  status:           { type: String, enum: ['pending','accepted','rejected','active','returned','cancelled', 'late'], default: 'pending' },
  feedback:         { type: String },
  rating:           { type: Number, min: 1, max: 5 },
  createdAt:        { type: Date, default: Date.now }
});

// 🔥 FIX: Virtual Property to automatically calculate late return days dynamically
bookingSchema.virtual('lateDays').get(function() {
  // If the item hasn't been returned yet
  if (this.status !== 'returned' && this.status !== 'cancelled') {
    const today = new Date();
    const targetReturn = new Date(this.returnDate);
    
    // Reset time to midnight for accurate day-to-day comparison
    today.setHours(0,0,0,0);
    targetReturn.setHours(0,0,0,0);

    if (today > targetReturn) {
      const diffTime = today - targetReturn;
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Converts milliseconds to days
    }
  }
  return 0; // Return 0 if not late or already returned
});

bookingSchema.set('toJSON',   { virtuals: true });
bookingSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Booking', bookingSchema);