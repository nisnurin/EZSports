const express = require('express');
const router = express.Router();
const Sport = require('../models/Sport');

router.get('/', async (req, res) => {
  try {
    const sports = await Sport.find().sort({ name: 1 });
    if (sports.length === 0) {
      // Return default sports if none in DB
      return res.json(getDefaultSports());
    }
    res.json(sports);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const sport = new Sport(req.body);
    await sport.save();
    res.json(sport);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const sport = await Sport.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(sport);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Sport.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/seed/default', async (req, res) => {
  try {
    const existing = await Sport.countDocuments();
    if (existing > 0) return res.json({ message: 'Already seeded' });
    await Sport.insertMany(getDefaultSports());
    res.json({ message: 'Sports seeded' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

function getDefaultSports() {
  return [
    { name: 'Badminton', tagline: 'Smash to the Top', description: 'A fast-paced racket sport played with a shuttlecock.', players: '2 (Singles) or 4 (Doubles)', equipment: ['Racket', 'Shuttlecock', 'Net'], icon: '🏸' },
    { name: 'Volleyball', tagline: 'Spike & Serve', description: 'Team sport where players hit a ball over a net.', players: '6 per team', equipment: ['Volleyball', 'Net', 'Knee Pads'], icon: '🏐' },
    { name: 'Football', tagline: 'The Beautiful Game', description: 'The world\'s most popular sport.', players: '11 per team', equipment: ['Football', 'Cleats', 'Shin Guards', 'Goal Net'], icon: '⚽' },
    { name: 'Basketball', tagline: 'Rise Above', description: 'Fast-paced sport played on a court.', players: '5 per team', equipment: ['Basketball', 'Hoop', 'Jersey'], icon: '🏀' },
    { name: 'Rugby', tagline: 'Power & Teamwork', description: 'Contact sport played with an oval ball.', players: '7 or 15 per team', equipment: ['Rugby Ball', 'Mouth Guard', 'Boots', 'Scrum Cap'], icon: '🏉' },
    { name: 'Handball', tagline: 'Fast & Furious', description: 'A team sport where players throw a ball.', players: '7 per team', equipment: ['Handball', 'Goal Net', 'Gloves'], icon: '🤾' },
    { name: 'Takraw', tagline: 'Kick Like the Wind', description: 'Southeast Asian sport using a rattan ball.', players: '3 per team', equipment: ['Rattan Ball', 'Net'], icon: '⚽' },
    { name: 'Pingpong', tagline: 'Precision & Speed', description: 'Table tennis played with paddles and a small ball.', players: '2 or 4', equipment: ['Paddle', 'Table Tennis Ball', 'Table', 'Net'], icon: '🏓' },
    { name: 'Netball', tagline: 'Shoot to Score', description: 'Team sport similar to basketball but without backboards.', players: '7 per team', equipment: ['Netball', 'Goal Ring', 'Bib'], icon: '🏀' }
  ];
}

module.exports = router;