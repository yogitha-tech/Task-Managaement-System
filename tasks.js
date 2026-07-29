const express = require('express');
const router = express.Router();
const db = require('./db');

const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];
const VALID_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];

// Basic validation for create/update payloads
function validateTaskInput(body, isUpdate = false) {
  const errors = [];

  if (!isUpdate || body.title !== undefined) {
    if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
      errors.push('Title is required.');
    }
  }

  if (!isUpdate || body.description !== undefined) {
    if (!body.description || typeof body.description !== 'string' || !body.description.trim()) {
      errors.push('Description is required.');
    }
  }

  if (!isUpdate || body.dueDate !== undefined) {
    if (!body.dueDate) {
      errors.push('Due date is required.');
    } else if (isNaN(Date.parse(body.dueDate))) {
      errors.push('Due date must be a valid date.');
    }
  }

  if (body.priority !== undefined && !VALID_PRIORITIES.includes(body.priority)) {
    errors.push(`Priority must be one of: ${VALID_PRIORITIES.join(', ')}.`);
  }

  if (body.status !== undefined && !VALID_STATUSES.includes(body.status)) {
    errors.push(`Status must be one of: ${VALID_STATUSES.join(', ')}.`);
  }

  return errors;
}

function rowToTask(row) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    dueDate: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

// GET /api/tasks - list all tasks, supports optional ?status= & ?priority= & ?sortBy= & ?order=
router.get('/', (req, res) => {
  try {
    const { status, priority, sortBy, order } = req.query;

    let query = 'SELECT * FROM tasks WHERE 1=1';
    const params = [];

    if (status) {
      if (!VALID_STATUSES.includes(status)) {
        return res.status(400).json({ message: `Invalid status filter: ${status}` });
      }
      query += ' AND status = ?';
      params.push(status);
    }

    if (priority) {
      if (!VALID_PRIORITIES.includes(priority)) {
        return res.status(400).json({ message: `Invalid priority filter: ${priority}` });
      }
      query += ' AND priority = ?';
      params.push(priority);
    }

    const allowedSort = ['created_at', 'due_date', 'priority', 'status', 'title'];
    const sortColumn = allowedSort.includes(sortBy) ? sortBy : 'created_at';
    const sortOrder = order && order.toLowerCase() === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY ${sortColumn} ${sortOrder}`;

    const rows = db.prepare(query).all(...params);
    res.json(rows.map(rowToTask));
  } catch (err) {
    console.error('Error fetching tasks:', err);
    res.status(500).json({ message: 'Failed to fetch tasks.' });
  }
});

// GET /api/tasks/search?q=keyword - search title/description
router.get('/search', (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      return res.status(400).json({ message: 'Query parameter "q" is required.' });
    }
    const like = `%${q}%`;
    const rows = db
      .prepare('SELECT * FROM tasks WHERE title LIKE ? OR description LIKE ? ORDER BY created_at DESC')
      .all(like, like);
    res.json(rows.map(rowToTask));
  } catch (err) {
    console.error('Error searching tasks:', err);
    res.status(500).json({ message: 'Failed to search tasks.' });
  }
});

// GET /api/tasks/:id
router.get('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'Invalid task id.' });
    }
    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!row) {
      return res.status(404).json({ message: `Task with id ${id} not found.` });
    }
    res.json(rowToTask(row));
  } catch (err) {
    console.error('Error fetching task:', err);
    res.status(500).json({ message: 'Failed to fetch task.' });
  }
});

// POST /api/tasks
router.post('/', (req, res) => {
  try {
    const errors = validateTaskInput(req.body);
    if (errors.length) {
      return res.status(400).json({ message: 'Validation failed.', errors });
    }

    const { title, description, dueDate } = req.body;
    const priority = req.body.priority || 'MEDIUM';
    const status = req.body.status || 'TODO';

    const stmt = db.prepare(`
      INSERT INTO tasks (title, description, priority, status, due_date, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    const result = stmt.run(title.trim(), description.trim(), priority, status, dueDate);

    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(rowToTask(row));
  } catch (err) {
    console.error('Error creating task:', err);
    res.status(500).json({ message: 'Failed to create task.' });
  }
});

// PUT /api/tasks/:id
router.put('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'Invalid task id.' });
    }

    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: `Task with id ${id} not found.` });
    }

    const errors = validateTaskInput(req.body, true);
    if (errors.length) {
      return res.status(400).json({ message: 'Validation failed.', errors });
    }

    const title = req.body.title !== undefined ? req.body.title.trim() : existing.title;
    const description = req.body.description !== undefined ? req.body.description.trim() : existing.description;
    const priority = req.body.priority !== undefined ? req.body.priority : existing.priority;
    const status = req.body.status !== undefined ? req.body.status : existing.status;
    const dueDate = req.body.dueDate !== undefined ? req.body.dueDate : existing.due_date;

    db.prepare(`
      UPDATE tasks
      SET title = ?, description = ?, priority = ?, status = ?, due_date = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(title, description, priority, status, dueDate, id);

    const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    res.json(rowToTask(row));
  } catch (err) {
    console.error('Error updating task:', err);
    res.status(500).json({ message: 'Failed to update task.' });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) {
      return res.status(400).json({ message: 'Invalid task id.' });
    }
    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ message: `Task with id ${id} not found.` });
    }
    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
    res.status(204).send();
  } catch (err) {
    console.error('Error deleting task:', err);
    res.status(500).json({ message: 'Failed to delete task.' });
  }
});

module.exports = router;
