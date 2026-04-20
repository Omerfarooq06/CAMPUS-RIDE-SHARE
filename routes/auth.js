const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
require('dotenv').config();

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, university_id, phone, email, password } = req.body;
    if (!name || !university_id || !phone || !email || !password)
      return res.status(400).json({ message: 'All fields required' });

    const [existing] = await db.query('SELECT id FROM users WHERE email=? OR university_id=?', [email, university_id]);
    if (existing.length > 0) return res.status(409).json({ message: 'Email or University ID already registered' });

    const hashed = await bcrypt.hash(password, 10);
    await db.query('INSERT INTO users (name,university_id,phone,email,password) VALUES (?,?,?,?,?)',
      [name, university_id, phone, email, hashed]);
    res.status(201).json({ message: 'Registered successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const [rows] = await db.query('SELECT * FROM users WHERE email=?', [email]);
    if (!rows.length) return res.status(401).json({ message: 'Invalid credentials' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role, phone: user.phone } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;