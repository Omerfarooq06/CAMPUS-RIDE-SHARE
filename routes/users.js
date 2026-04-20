const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authMiddleware } = require('../middleware/auth');

// Get dashboard data
router.get('/dashboard', authMiddleware, async (req, res) => {
  try {
    const [posted] = await db.query(
      `SELECT r.*, COUNT(rb.id) as passenger_count FROM rides r
       LEFT JOIN ride_bookings rb ON r.id=rb.ride_id AND rb.status='confirmed'
       WHERE r.driver_id=? GROUP BY r.id ORDER BY r.ride_date DESC`, [req.user.id]
    );
    const [joined] = await db.query(
      `SELECT r.*, u.name as driver_name, u.phone as driver_phone, rb.status as booking_status
       FROM ride_bookings rb JOIN rides r ON rb.ride_id=r.id JOIN users u ON r.driver_id=u.id
       WHERE rb.passenger_id=? ORDER BY r.ride_date DESC`, [req.user.id]
    );
    res.json({ posted, joined });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;