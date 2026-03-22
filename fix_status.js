const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./todo.db');

db.serialize(() => {
  // First, let's see what we have
  db.all("SELECT id, status FROM tasks", [], (err, rows) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log('Current status values:');
    rows.forEach(row => {
      console.log(`  ID ${row.id}: '${row.status}'`);
    });
  });

  // Now fix inconsistent status values - standardize on the exact case we use in frontend
  // Frontend expects: 'todo', 'inProgress', 'done'
  db.run("UPDATE tasks SET status = 'todo' WHERE LOWER(status) = 'todo'", (err) => {
    if (err) console.error(err);
  });

  db.run("UPDATE tasks SET status = 'inProgress' WHERE LOWER(status) = 'inprogress'", (err) => {
    if (err) console.error(err);
  });

  db.run("UPDATE tasks SET status = 'done' WHERE LOWER(status) = 'done'", (err) => {
    if (err) console.error(err);
  });

  // Verify the fix
  db.all("SELECT id, status FROM tasks ORDER BY id", [], (err, rows) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log('\nAfter fix:');
    rows.forEach(row => {
      console.log(`  ID ${row.id}: '${row.status}'`);
    });
  });
});

db.close();