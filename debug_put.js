const express = require('express');
const app = express();
app.use(express.json());

app.put('/test/:id', (req, res) => {
  console.log('Received params:', req.params);
  console.log('Received body:', req.body);
  console.log('Received body status:', req.body.status);
  console.log('Received body title:', req.body.title);
  console.log('Received body description:', req.body.description);
  console.log('title !== undefined:', req.body.title !== undefined);
  res.json({ received: req.body });
});

app.listen(3001, () => {
  console.log('Debug server running on port 3001');
});