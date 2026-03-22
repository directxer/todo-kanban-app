const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./todo.db');

db.serialize(() => {
  db.all("SELECT * FROM tasks", [], (err, rows) => {
    if (err) {
      console.error(err);
    } else {
      console.log('Current tasks:', JSON.stringify(rows, null, 2));
    }
  });
});

db.close();