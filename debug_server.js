const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3002;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('./todo.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

// Add debug middleware to log requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  console.log('Body:', req.body);
  next();
});

app.put('/api/tasks/:id', (req, res) => {
  console.log('PUT /api/tasks/:id called');
  console.log('Params:', req.params);
  console.log('Body:', req.body);

  const { id } = req.params;
  const { title, description, status } = req.body;

  // First, get the current task to preserve existing values
  db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, task) => {
    if (err) {
      console.error('DB error:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    if (!task) {
      console.log('Task not found');
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    console.log('Current task:', task);

    // Use existing values if not provided in update (only update what's provided)
    const updateTitle = title !== undefined ? title : task.title;
    const updateDescription = description !== undefined ? description : task.description;
    const updateStatus = status !== undefined ? status : task.status;

    console.log('Updating with:', { updateTitle, updateDescription, updateStatus });

    db.run(
      'UPDATE tasks SET title = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [updateTitle, updateDescription, updateStatus, id],
      function(err) {
        if (err) {
          console.error('Update error:', err);
          res.status(500).json({ error: err.message });
          return;
        }
        if (this.changes === 0) {
          console.log('No changes made');
          res.status(404).json({ error: 'Task not found' });
          return;
        }

        // Fetch the updated task to return it
        db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, row) => {
          if (err) {
            console.error('Fetch error:', err);
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

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Debug server running on port ${PORT}`);
});