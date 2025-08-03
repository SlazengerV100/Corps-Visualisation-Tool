const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Mock endpoint to fetch churches data
app.get('/api/churches', (req, res) => {
  // In a real application, this would fetch from a database
  const churchesData = require('./data/churchesData');
  res.json(churchesData);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
}); 