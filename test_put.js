const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./todo.db');

console.log('Testing PUT logic...');

// Simulate what happens in our PUT handler
const id = 1;
const reqBody = { status: 'inProgress' }; // This is what we're sending

console.log('Request body:', reqBody);

// First, get the current task to preserve existing values
db.get('SELECT * FROM tasks WHERE id = ?', [id], (err, task) => {
  if (err) {
    console.error('DB error:', err);
    return;
  }
  if (!task) {
    console.log('Task not found');
    return;
  }

  console.log('Current task:', task);

  // Use existing values if not provided in update (only update what's provided)
  const updateTitle = reqBody.title !== undefined ? reqBody.title : task.title;
  const updateDescription = reqBody.description !== undefined ? reqBody.description : task.description;
  const updateStatus = reqBody.status !== undefined ? reqBody.status : task.status;

  console.log('Updating with:', { updateTitle, updateDescription, updateStatus });
  console.log('Types:', {
    updateTitle: typeof updateTitle,
    updateDescription: typeof updateDescription,
    updateStatus: typeof updateStatus
  });

  // Check if any are null
  console.log('Null checks:', {
    titleNull: updateTitle === null,
    descriptionNull: updateDescription === null,
    statusNull: updateStatus === null
  });

  // Try the update
  db.run(
    'UPDATE tasks SET title = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [updateTitle, updateDescription, updateStatus, id],
    function(err) {
      if (err) {
        console.error('Update error:', err);
        return;
      }
      console.log('Update successful, changes:', this.changes);
    }
  );
});

db.close();