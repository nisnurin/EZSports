const mongoose = require('mongoose');

const aboutSchema = new mongoose.Schema({
  phone1: { type: String, default: '01234567890' },
  phone2: { type: String, default: '01112223333' },
  email: { type: String, default: 'ezsport@gmail.com' },
  instagram: { type: String, default: '@ezsport' },
  tiktok: { type: String, default: '@ezsport' },
  address: { type: String, default: 'UiTM, Shah Alam' },
  officeHours: { type: String, default: 'Monday - Friday, 8:00 AM - 5:00 PM' },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('About', aboutSchema);