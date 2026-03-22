const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('./todo.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
    // Create tables if they don't exist
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'todo',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
  }
});

// API Routes
app.get('/api/tasks', (req, res) => {
  db.all('SELECT * FROM tasks ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/tasks', (req, res) => {
  const { title, description } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  db.run(
    'INSERT INTO tasks (title, description) VALUES (?, ?)',
    [title, description || ''],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(201).json({ id: this.lastID, title, description, status: 'todo' });
    }
  );
});

app.put('/api/tasks/:id', (req, res) => {
  console.log('PUT request received');
  console.log('Params:', req.params);
  console.log('Body:', req.body);

  const { id } = req.params;
  const { title, description, status } = req.body;

  // First, get the current task to preserve existing values
  db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, task) => {
    if (err) {
      console.error('DB error in get:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    if (!task) {
      console.log('Task not found for id:', id);
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    console.log('Current task:', task);

    // Use existing values if not provided in update (only update what's provided)
    const updateTitle = title !== undefined ? title : task.title;
    const updateDescription = description !== undefined ? description : task.description;
    const updateStatus = status !== undefined ? status : task.status;

    console.log('Updating with:', { updateTitle, updateDescription, updateStatus });

    // Validate that we're not passing NULL for NOT NULL fields
    if (updateTitle === null) {
      console.error('ERROR: updateTitle is null!');
      res.status(400).json({ error: 'Title cannot be null' });
      return;
    }

    db.run(
      'UPDATE tasks SET title = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [updateTitle, updateDescription, updateStatus, id],
      function(err) {
        if (err) {
          console.error('DB error in run:', err);
          console.error('Params were:', [updateTitle, updateDescription, updateStatus, id]);
          res.status(500).json({ error: err.message });
          return;
        }
        if (this.changes === 0) {
          console.log('No changes made for id:', id);
          res.status(404).json({ error: 'Task not found' });
          return;
        }

        // Fetch the updated task to return it
        db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, row) => {
          if (err) {
            console.error('DB error in final get:', err);
            res.status(500).json({ error: err.message });
            return;
          }
          console.log('Updated task:', row);
          res.json(row);
        });
      }
    );
  });
});

app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM tasks WHERE id = ?', [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }
    res.json({ message: 'Task deleted successfully' });
  });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});