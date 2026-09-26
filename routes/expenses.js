// routes/expenses.js - CRUD for expenses + aggregated summaries for charts
const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/expenses?category=&from=&to=
router.get('/', (req, res) => {
  const { category, from, to } = req.query;

  let query = `
    SELECT e.id, e.amount, e.description, e.expense_date, e.category_id,
           c.name AS category_name, c.color AS category_color
    FROM expenses e
    LEFT JOIN categories c ON c.id = e.category_id
    WHERE e.user_id = ?
  `;
  const params = [req.userId];

  if (category) {
    query += ' AND e.category_id = ?';
    params.push(category);
  }
  if (from) {
    query += ' AND e.expense_date >= ?';
    params.push(from);
  }
  if (to) {
    query += ' AND e.expense_date <= ?';
    params.push(to);
  }
  query += ' ORDER BY e.expense_date DESC, e.id DESC';

  const rows = db.prepare(query).all(...params);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { amount, category_id, description, expense_date } = req.body;

  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number.' });
  }
  if (!expense_date) {
    return res.status(400).json({ error: 'Expense date is required.' });
  }

  const info = db
    .prepare(
      'INSERT INTO expenses (user_id, category_id, amount, description, expense_date) VALUES (?, ?, ?, ?, ?)'
    )
    .run(req.userId, category_id || null, numAmount, (description || '').trim(), expense_date);

  res.status(201).json({ id: info.lastInsertRowid });
});

router.put('/:id', (req, res) => {
  const { amount, category_id, description, expense_date } = req.body;
  const numAmount = Number(amount);
  if (!numAmount || numAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number.' });
  }

  const info = db
    .prepare(
      `UPDATE expenses SET amount = ?, category_id = ?, description = ?, expense_date = ?
       WHERE id = ? AND user_id = ?`
    )
    .run(numAmount, category_id || null, (description || '').trim(), expense_date, req.params.id, req.userId);

  if (info.changes === 0) return res.status(404).json({ error: 'Expense not found.' });
  res.json({ success: true });
});

router.delete('/:id', (req, res) => {
  const info = db
    .prepare('DELETE FROM expenses WHERE id = ? AND user_id = ?')
    .run(req.params.id, req.userId);
  if (info.changes === 0) return res.status(404).json({ error: 'Expense not found.' });
  res.json({ success: true });
});

// GET /api/expenses/summary/by-category  -> totals per category (for pie chart)
router.get('/summary/by-category', (req, res) => {
  const rows = db
    .prepare(
      `SELECT COALESCE(c.name, 'Uncategorized') AS category,
              COALESCE(c.color, '#6b7280') AS color,
              SUM(e.amount) AS total
       FROM expenses e
       LEFT JOIN categories c ON c.id = e.category_id
       WHERE e.user_id = ?
       GROUP BY category, color
       ORDER BY total DESC`
    )
    .all(req.userId);
  res.json(rows);
});

// GET /api/expenses/summary/by-month -> totals per month (for bar/line chart)
router.get('/summary/by-month', (req, res) => {
  const rows = db
    .prepare(
      `SELECT strftime('%Y-%m', expense_date) AS month, SUM(amount) AS total
       FROM expenses
       WHERE user_id = ?
       GROUP BY month
       ORDER BY month ASC`
    )
    .all(req.userId);
  res.json(rows);
});

module.exports = router;
