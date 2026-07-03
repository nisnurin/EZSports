const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phoneNumber: { type: String, default: null },
<<<<<<< HEAD
  // sparse: true means the unique index ONLY applies when the field exists and is not null.
=======
  // sparse: true means the unique index ONLY applies when the field is NOT null.
  // We must ensure empty strings are converted to null before saving (see pre-save hook).
>>>>>>> 0b95283ff8a49a9312c28913f221f42a98163bf8
  studentId: { type: String, default: null, unique: true, sparse: true },
  staffId:   { type: String, default: null, unique: true, sparse: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  firebaseUid: { type: String, default: null },
  createdAt: { type: Date, default: Date.now }
});

<<<<<<< HEAD
// Pre-save: completely sanitize fields based on roles before entering the database
userSchema.pre('save', async function(next) {
  
  // If registering as a regular user, completely strip staffId to prevent any unique constraint collisions
  if (this.role === 'user') {
    this.staffId = undefined; 
    
    // Normalize studentId values
    if (this.studentId === '' || this.studentId === null || this.studentId === undefined) {
      this.studentId = undefined;
    }
  } 
  
  // If registering as an admin, completely strip studentId to prevent any unique constraint collisions
  if (this.role === 'admin') {
    this.studentId = undefined;
    
    // Normalize staffId values
    if (this.staffId === '' || this.staffId === null || this.staffId === undefined) {
      this.staffId = undefined;
    }
  }

  // Normalize phone number fields
  if (this.phoneNumber === '' || this.phoneNumber === null) {
    this.phoneNumber = undefined;
  }

  // Hash password only when it was actually changed or newly created
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  
=======
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
>>>>>>> 0b95283ff8a49a9312c28913f221f42a98163bf8
  next();
});

userSchema.methods.comparePassword = async function(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);