const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String, default: null },
  // sparse: true means the unique index ONLY applies when the field is NOT null.
  // We must ensure empty strings are converted to null before saving (see pre-save hook).
  studentId: { type: String, default: null, unique: true, sparse: true },
  staffId:   { type: String, default: null, unique: true, sparse: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  firebaseUid: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

// Pre-save: convert any empty-string IDs to null so sparse unique index works correctly.
// Without this, every user without a staffId saves "" and the second one triggers E11000.
userSchema.pre('save', async function(next) {
  // Normalize empty strings → null for sparse-indexed fields
  if (this.studentId === '' || this.studentId === undefined) this.studentId = null;
  if (this.staffId   === '' || this.staffId   === undefined) this.staffId   = null;
  if (this.phoneNumber === '') this.phoneNumber = null;

  // Hash password only when it was actually changed
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);