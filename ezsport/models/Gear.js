const mongoose = require('mongoose');

const gearSchema = new mongoose.Schema({
  gearId: { type: String, required: true, unique: true },
  itemName: { type: String, required: true },
  photo: { type: String, default: '' },
  category: { type: String, required: true, enum: ['Badminton','Basketball','Soccer','Volleyball','Rugby','Handball','Takraw','Pingpong','Netball'] },
  condition: { type: String, enum: ['Good', 'New', 'Damaged'], default: 'Good' },
  status: { type: String, enum: ['Available', 'Rented', 'Damaged', 'Not Available'], default: 'Available' },
  totalQuantity: { type: Number, default: 1 },
  availableQuantity: { type: Number, default: 1 },
  lastRental: { type: Date },
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Gear', gearSchema);