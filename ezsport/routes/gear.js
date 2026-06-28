const express = require('express');
const router = express.Router();
const Gear = require('../models/Gear');

// Get all gear
router.get('/', async (req, res) => {
  try {
    const { category, status, search } = req.query;
    let query = {};
    if (category) query.category = category;
    if (status) query.status = status;
    if (search) query.itemName = { $regex: search, $options: 'i' };
    const gear = await Gear.find(query).sort({ createdAt: -1 });
    res.json(gear);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single gear
router.get('/:id', async (req, res) => {
  try {
    const gear = await Gear.findById(req.params.id);
    if (!gear) return res.status(404).json({ error: 'Gear not found' });
    res.json(gear);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add gear (admin)
router.post('/', async (req, res) => {
  try {
    const count = await Gear.countDocuments();
    const gearId = `G${String(count + 1).padStart(3, '0')}`;
    const gear = new Gear({ ...req.body, gearId });
    await gear.save();
    res.json(gear);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update gear (admin)
router.put('/:id', async (req, res) => {
  try {
    const gear = await Gear.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(gear);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete gear (admin)
router.delete('/:id', async (req, res) => {
  try {
    await Gear.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Seed default gear
router.post('/seed/default', async (req, res) => {
  try {
    const existing = await Gear.countDocuments();
    if (existing > 0) return res.json({ message: 'Already seeded' });
    const defaultGear = [
      { gearId: 'G001', itemName: 'Yonex Racket', category: 'Badminton', condition: 'Good', status: 'Available', totalQuantity: 5, availableQuantity: 5, lastRental: new Date('2026-03-30') },
      { gearId: 'G002', itemName: 'Shuttlecock Pack', category: 'Badminton', condition: 'New', status: 'Available', totalQuantity: 10, availableQuantity: 10, lastRental: new Date('2026-05-05') },
      { gearId: 'G003', itemName: 'Volleyball Ball', category: 'Volleyball', condition: 'Good', status: 'Available', totalQuantity: 4, availableQuantity: 4, lastRental: new Date('2026-02-24') },
      { gearId: 'G004', itemName: 'Volleyball Net', category: 'Volleyball', condition: 'Good', status: 'Available', totalQuantity: 2, availableQuantity: 2, lastRental: new Date('2026-01-06') },
      { gearId: 'G005', itemName: 'Soccer Ball', category: 'Soccer', condition: 'New', status: 'Available', totalQuantity: 6, availableQuantity: 6, lastRental: new Date('2026-04-04') },
      { gearId: 'G006', itemName: 'Basketball', category: 'Basketball', condition: 'Good', status: 'Available', totalQuantity: 4, availableQuantity: 4 },
      { gearId: 'G007', itemName: 'Rugby Ball', category: 'Rugby', condition: 'Good', status: 'Available', totalQuantity: 3, availableQuantity: 3 },
      { gearId: 'G008', itemName: 'Ping Pong Paddle', category: 'Pingpong', condition: 'New', status: 'Available', totalQuantity: 8, availableQuantity: 8 },
      { gearId: 'G009', itemName: 'Netball', category: 'Netball', condition: 'Good', status: 'Available', totalQuantity: 4, availableQuantity: 4 },
      { gearId: 'G010', itemName: 'Handball', category: 'Handball', condition: 'Good', status: 'Available', totalQuantity: 3, availableQuantity: 3 }
    ];
    await Gear.insertMany(defaultGear);
    res.json({ message: 'Gear seeded', count: defaultGear.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;