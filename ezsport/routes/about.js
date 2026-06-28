const express = require('express');
const router = express.Router();
const About = require('../models/About');

router.get('/', async (req, res) => {
  try {
    let about = await About.findOne();
    if (!about) { about = await About.create({}); }
    res.json(about);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/', async (req, res) => {
  try {
    let about = await About.findOne();
    if (!about) about = new About();
    Object.assign(about, req.body, { updatedAt: new Date() });
    await about.save();
    res.json(about);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;