// routes/categories.js - list and create expense categories (per user)
const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/', (req, res) => {
  const cats = db
    .prepare('SELECT id, name, color FROM categories WHERE user_id = ? ORDER BY name')
    .all(req.userId);
  res.json(cats);
});

router.post('/', (req, res) => {
  const { name, color } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Category name is required.' });
  }
  try {
    const info = db
      .prepare('INSERT INTO categories (user_id, name, color) VALUES (?, ?, ?)')
      .run(req.userId, name.trim(), color || '#6366f1');
    res.status(201).json({ id: info.lastInsertRowid, name: name.trim(), color: color || '#6366f1' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'You already have a category with that name.' });
    }
    res.status(500).json({ error: 'Could not create category.' });
  }
});

router.delete('/:id', (req, res) => {
  const info = db
    .prepare('DELETE FROM categories WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.userId);
  if (info.changes === 0) return res.status(404).json({ error: 'Category not found.' });
  res.json({ success: true });
});

module.exports = router;
