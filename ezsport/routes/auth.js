const express  = require('express');
const router   = express.Router();
const User     = require('../models/User');
const Notification = require('../models/Notification');

// Helper function to handle empty/blank values and convert them to null
function nullify(val) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  return s === '' ? null : s;
}

// REGISTER — works standalone for both roles without requiring admin pre-approval
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, phoneNumber, password, role } = req.body;
    
    // Determine the role and filter inputs to prevent duplicate 'null' conflicts in MongoDB
    const isClientAdmin = role === 'admin';
    const studentId = isClientAdmin ? null : nullify(req.body.studentId);
    const staffId   = isClientAdmin ? nullify(req.body.staffId) : null;

    // Validation checks for required fields
    if (!fullName || !String(fullName).trim())
      return res.status(400).json({ error: 'Full name is required.' });
    if (!email || !String(email).trim())
      return res.status(400).json({ error: 'Email address is required.' });
    if (!password || password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const emailNorm = String(email).toLowerCase().trim();

    // Check if email already exists in the database
    if (await User.findOne({ email: emailNorm }))
      return res.status(400).json({ error: 'An account with this email already exists. Please log in.' });

    // Only validate Student ID uniqueness if registering as a regular user
    if (!isClientAdmin && studentId && await User.findOne({ studentId }))
      return res.status(400).json({ error: 'This Student ID is already registered. Please log in.' });

    // Only validate Staff ID uniqueness if registering as an admin
    if (isClientAdmin && staffId && await User.findOne({ staffId }))
      return res.status(400).json({ error: 'This Staff ID is already registered. Please log in.' });

    // Dynamically build the user object based on the role
    const userFields = {
      fullName:    String(fullName).trim(),
      email:       emailNorm,
      phoneNumber: nullify(phoneNumber),
      password,
      role: isClientAdmin ? 'admin' : 'user'
    };

    // Explicitly assign IDs only to their respective roles to prevent database index collisions
    if (isClientAdmin) {
      if (staffId) userFields.staffId = staffId;
    } else {
      if (studentId) userFields.studentId = studentId;
    }

    const user = new User(userFields);
    await user.save();
    
    // Establish session after successful registration
    req.session.userId = user._id;
    req.session.role   = user.role;

    // Create a welcome notification for the new user
    await Notification.create({
      user:    user._id,
      message: `Welcome to EZSport, ${user.fullName}! Your account is ready. 🎉`,
      type:    'system'
    });

    return res.json({
      success: true,
      user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, studentId: user.studentId, staffId: user.staffId }
    });

  } catch (err) {
    // Handle MongoDB duplicate key errors (code 11000)
    if (err.code === 11000) {
      const field  = Object.keys(err.keyPattern || {})[0] || 'field';
      const labels = { email: 'Email', studentId: 'Student ID', staffId: 'Staff ID' };
      return res.status(400).json({ error: `${labels[field] || field} is already registered. Please log in.` });
    }
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// LOGIN
router.post('/login', async (req, res) => {
  try {
    const { password, role } = req.body;
    const email = String(req.body.email || '').toLowerCase().trim();
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required.' });

    const user = await User.findOne({ email, role: role || 'user' });
    if (!user)
      return res.status(400).json({ error: 'No account found with this email for the selected role.' });

    const valid = await user.comparePassword(password);
    if (!valid)
      return res.status(400).json({ error: 'Incorrect password. Please try again.' });

    req.session.userId = user._id;
    req.session.role   = user.role;

    return res.json({
      success: true,
      user: { id: user._id, fullName: user.fullName, email: user.email, role: user.role, studentId: user.studentId, staffId: user.staffId }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// LOGOUT
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ success: true }));
});

// GET CURRENT USER
router.get('/me', async (req, res) => {
  if (!req.session.userId) return res.json({ user: null });
  try {
    const user = await User.findById(req.session.userId).select('-password');
    return res.json({ user: user || null });
  } catch (err) {
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;