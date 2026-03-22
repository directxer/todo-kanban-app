const express = require('express');
const app = express();

// Middleware to parse JSON and log everything
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('Headers:', req.headers['content-type']);
  console.log('Body:', req.body);
  console.log('---');
  next();
});

app.put('/api/tasks/:id', (req, res) => {
  console.log('PUT handler called');
  console.log('Params:', req.params);
  console.log('Body keys:', Object.keys(req.body));

  const { id } = req.params;
  const { title, description, status } = req.body;

  console.log('title:', title, '(typeof:', typeof title, ')');
  console.log('description:', description, '(typeof:', typeof description, ')');
  console.log('status:', status, '(typeof:', typeof status, ')');

  console.log('title !== undefined:', title !== undefined);
  console.log('description !== undefined:', description !== undefined);
  console.log('status !== undefined:', status !== undefined);

  res.json({ received: { title, description, status } });
});

app.listen(3003, () => {
  console.log('Debug server listening on port 3003');
});