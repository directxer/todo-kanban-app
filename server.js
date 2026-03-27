const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');

const app = express();
const PORT = process.env.PORT || 3000;

// Helper function to get current time in GMT+8 format as YYYY-MM-DD HH:MM:SS
function getGMT8DateTimeString() {
  const now = new Date();
  const gmt8Offset = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
  const gmt8Time = new Date(now.getTime() + gmt8Offset);
  const year = gmt8Time.getFullYear();
  const month = String(gmt8Time.getMonth() + 1).padStart(2, '0');
  const day = String(gmt8Time.getDate()).padStart(2, '0');
  const hour = String(gmt8Time.getHours()).padStart(2, '0');
  const minute = String(gmt8Time.getMinutes()).padStart(2, '0');
  const second = String(gmt8Time.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

// Logging function to output to console and server.log
const logFilePath = path.join(__dirname, 'server.log');
function log(message) {
  console.log(message);
  try {
    fs.appendFileSync(logFilePath, message + '\n');
  } catch (err) {
    console.error('Failed to write to server.log:', err);
  }
}

// Function to format date for backup filenames (GMT+8) - reuses getGMT8DateTimeString
function getGMT8DateTimeForFilename() {
  return getGMT8DateTimeString().replace(/[: ]/g, '-');
}

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Database setup
const db = new sqlite3.Database('./todo.db', (err) => {
  if (err) {
    log('Error opening database:', err.message);
  } else {
    log('Connected to SQLite database.');
    // Create tables if they don't exist
    db.run(`CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT DEFAULT 'todo',
      created_at DATETIME,
      updated_at DATETIME
    )`);
  }
});

// Backup functionality
const BACKUP_DIR = path.join(__dirname, 'backups');

// Ensure backups directory exists
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR);
  log('Created backups directory:', BACKUP_DIR);
}

// Function to delete backup files older than 30 days
function cleanupOldBackups() {
  const cutoffTime = Date.now() - (30 * 24 * 60 * 60 * 1000); // 30 days ago

  fs.readdirSync(BACKUP_DIR).forEach(file => {
    const filePath = path.join(BACKUP_DIR, file);
    const stats = fs.statSync(filePath);

    if (stats.isFile() && stats.mtime.getTime() < cutoffTime) {
      fs.unlinkSync(filePath);
      log(`Deleted old backup file: ${file}`);
    }
  });
}

// Function to perform database backup
function backupDatabase() {
  try {
    const timestamp = getGMT8DateTimeForFilename();
    const dbBackupPath = path.join(BACKUP_DIR, `todo-${timestamp}.db`);
    const jsonBackupPath = path.join(BACKUP_DIR, `todo-${timestamp}.json`);

    // Backup database file
    const data = fs.readFileSync('./todo.db');
    fs.writeFileSync(dbBackupPath, data);

    // Export all tasks to JSON
    db.all('SELECT * FROM tasks ORDER BY created_at DESC', [], (err, rows) => {
      if (err) {
        log('Error exporting tasks to JSON:', err.message);
        return;
      }

      const jsonData = JSON.stringify(rows, null, 2);
      fs.writeFileSync(jsonBackupPath, jsonData, 'utf8');

      log(`Database backup completed: ${dbBackupPath} and ${jsonBackupPath}`);

      // Cleanup old backups after successful backup
      cleanupOldBackups();
    });
  } catch (error) {
    log('Backup failed:', error.message);
  }
}

// Run immediate backup on server startup
log('Running immediate database backup on server startup...');
backupDatabase();

// Set up cron job to run backup every day at 03:00 server local time
cron.schedule('0 3 * * *', () => {
  log('Running scheduled database backup...');
  backupDatabase();
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

  const now = getGMT8DateTimeString();
  db.run(
    'INSERT INTO tasks (title, description, created_at, updated_at) VALUES (?, ?, ?, ?)',
    [title, description || '', now, now],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.status(201).json({ id: this.lastID, title, description, status: 'todo', created_at: now, updated_at: now });
    }
  );
});

app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { title, description, status } = req.body;

  // First, get the current task to preserve existing values
  db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, task) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Use existing values if not provided in update (only update what's provided)
    const updateTitle = title !== undefined ? title : task.title;
    const updateDescription = description !== undefined ? description : task.description;
    const updateStatus = status !== undefined ? status : task.status;

    const now = getGMT8DateTimeString();
    db.run(
      'UPDATE tasks SET title = ?, description = ?, status = ?, updated_at = ? WHERE id = ?',
      [updateTitle, updateDescription, updateStatus, now, id],
      function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        if (this.changes === 0) {
          res.status(404).json({ error: 'Task not found' });
          return;
        }

        // Fetch the updated task to return it
        db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, row) => {
          if (err) {
            res.status(500).json({ error: err.message });
            return;
          }
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