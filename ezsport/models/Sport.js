const mongoose = require('mongoose');

const sportSchema = new mongoose.Schema({
  name: { type: String, required: true },
  tagline: { type: String },
  description: { type: String },
  icon: { type: String },
  image: { type: String },
  players: { type: String },
  equipment: [{ type: String }],
  category: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Sport', sportSchema);