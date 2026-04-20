const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Get all users
router.get('/users', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id,name,university_id,phone,email,role,created_at FROM users ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user
router.delete('/users/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id=? AND role != "admin"', [req.params.id]);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all rides
router.get('/rides', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT r.*, u.name as driver_name, u.email as driver_email,
       (SELECT COUNT(*) FROM ride_bookings rb WHERE rb.ride_id=r.id AND rb.status='confirmed') as bookings_count
       FROM rides r JOIN users u ON r.driver_id=u.id ORDER BY r.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete ride
router.delete('/rides/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await db.query('DELETE FROM rides WHERE id=?', [req.params.id]);
    res.json({ message: 'Ride deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Stats
router.get('/stats', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const [[{ total_users }]] = await db.query('SELECT COUNT(*) as total_users FROM users WHERE role="student"');
    const [[{ total_rides }]] = await db.query('SELECT COUNT(*) as total_rides FROM rides');
    const [[{ active_rides }]] = await db.query('SELECT COUNT(*) as active_rides FROM rides WHERE status="active"');
    const [[{ total_bookings }]] = await db.query('SELECT COUNT(*) as total_bookings FROM ride_bookings WHERE status="confirmed"');
    res.json({ total_users, total_rides, active_rides, total_bookings });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;