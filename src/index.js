import express from 'express';
import dotenv from 'dotenv';

// load config
dotenv.config();

// init express
const app = express();

app.get('/', (req, res) => {
  res.send('Hello world!');
});

// Start brewbot on port 3000
app.listen(process.env.API_PORT, () => {
  console.log(`☕️  Brewbot now available on port ${process.env.API_PORT}`);
});
