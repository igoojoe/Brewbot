import express from 'express';
import dotenv from 'dotenv';
import DB from './db';
import User from './models/user';

// load config
dotenv.config();

// init express
const app = express();

const db = new DB();

try {
  db.connect();
} catch (err) {
  console.log(err);
}

app.get('/', (req, res) => {
  res.send('Hello world!');
});

app.get('/user/:id', (req, res) => {
  const user = new User();
  user.uid = req.params.id;
  user.lookup().then(row => res.send(row)).catch((err) => {
    console.error(err);
    res.send(err.message);
  });
});

// Start brewbot on port 3000
app.listen(process.env.API_PORT, () => {
  console.log(`☕️  Brewbot now available on port ${process.env.API_PORT}`);
});
