const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// Post a ride
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { starting_location, destination, ride_date, ride_time, seats_available, estimated_cost } = req.body;
    if (!starting_location || !destination || !ride_date || !ride_time || !seats_available || !estimated_cost)
      return res.status(400).json({ message: 'All fields required' });
    await db.query(
      'INSERT INTO rides (driver_id,starting_location,destination,ride_date,ride_time,seats_available,seats_total,estimated_cost) VALUES (?,?,?,?,?,?,?,?)',
      [req.user.id, starting_location, destination, ride_date, ride_time, seats_available, seats_available, estimated_cost]
    );
    res.status(201).json({ message: 'Ride posted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Search rides
router.get('/search', async (req, res) => {
  try {
    const { destination, date } = req.query;
    let query = `SELECT r.*, u.name as driver_name, u.phone as driver_phone
      FROM rides r JOIN users u ON r.driver_id=u.id
      WHERE r.status='active' AND r.seats_available > 0`;
    const params = [];
    if (destination) { query += ' AND r.destination LIKE ?'; params.push(`%${destination}%`); }
    if (date) { query += ' AND r.ride_date=?'; params.push(date); }
    query += ' ORDER BY r.ride_date, r.ride_time';
    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get all rides
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, u.name as driver_name, u.phone as driver_phone
       FROM rides r JOIN users u ON r.driver_id=u.id
       WHERE r.status='active' AND r.seats_available > 0
       ORDER BY r.ride_date, r.ride_time`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Get ride details
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, u.name as driver_name, u.phone as driver_phone, u.email as driver_email
       FROM rides r JOIN users u ON r.driver_id=u.id WHERE r.id=?`, [req.params.id]
    );
    if (!rows.length) return res.status(404).json({ message: 'Ride not found' });
    const [bookings] = await db.query(
      `SELECT rb.*, u.name as passenger_name FROM ride_bookings rb
       JOIN users u ON rb.passenger_id=u.id WHERE rb.ride_id=? AND rb.status='confirmed'`, [req.params.id]
    );
    const ride = rows[0];
    res.json({ ...ride, bookings });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Join a ride
router.post('/:id/join', authMiddleware, async (req, res) => {
  try {
    const rideId = req.params.id;
    const [rides] = await db.query('SELECT * FROM rides WHERE id=? AND status=?', [rideId, 'active']);
    if (!rides.length) return res.status(404).json({ message: 'Ride not found or inactive' });
    const ride = rides[0];
    if (ride.driver_id === req.user.id) return res.status(400).json({ message: 'You cannot join your own ride' });
    if (ride.seats_available <= 0) return res.status(400).json({ message: 'No seats available' });

    const [existing] = await db.query('SELECT id FROM ride_bookings WHERE ride_id=? AND passenger_id=?', [rideId, req.user.id]);
    if (existing.length) return res.status(409).json({ message: 'Already joined this ride' });

    await db.query('INSERT INTO ride_bookings (ride_id,passenger_id) VALUES (?,?)', [rideId, req.user.id]);
    await db.query('UPDATE rides SET seats_available=seats_available-1 WHERE id=?', [rideId]);
    res.json({ message: 'Joined ride successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Leave a ride
router.delete('/:id/leave', authMiddleware, async (req, res) => {
  try {
    const [result] = await db.query(
      'DELETE FROM ride_bookings WHERE ride_id=? AND passenger_id=?', [req.params.id, req.user.id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Booking not found' });
    await db.query('UPDATE rides SET seats_available=seats_available+1 WHERE id=?', [req.params.id]);
    res.json({ message: 'Left ride successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Cancel own ride
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const [rides] = await db.query('SELECT * FROM rides WHERE id=? AND driver_id=?', [req.params.id, req.user.id]);
    if (!rides.length) return res.status(404).json({ message: 'Ride not found' });
    await db.query('UPDATE rides SET status="cancelled" WHERE id=?', [req.params.id]);
    res.json({ message: 'Ride cancelled' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;