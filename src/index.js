import express from 'express';
import bodyParser from 'body-parser';
import request from 'request-promise-native';
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

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true,
}));

app.get('/', (req, res) => {
  res.send('Hello world!');
});

app.post('/request-round', (req, res) => {
  const data = JSON.parse(req.body.payload);
  const drink = data.actions[0].selected_options[0].value;
  res.send(`Got: ${drink}`);
});

app.get('/user/:id', (req, res) => {
  const user = new User();
  user.uid = req.params.id;
  user.lookup().then((row) => {
    res.send(row);
    console.log(user);
  }).catch((err) => {
    console.error(err);
    res.send(err.message);
  });
});

/**
 * Gets a list of users in the current team
 * @returns {User[]} Array of Users
 */
async function getUsers() {
  const body = await request({
    method: 'POST',
    uri: 'https://slack.com/api/users.list',
    form: {
      token: process.env.TOKEN,
      presence: true,
    },
  });
  const usersraw = JSON.parse(body);
  const users = [];

  if (usersraw.ok) {
    for (let i = 0; i < usersraw.members.length; i++) {
      const user = usersraw.members[i];
      if (user.presence === 'active' && user.name.indexOf('bot') < 0) {
        const userObj = new User();
        userObj.name = user.name;
        userObj.slack_id = user.id;
        userObj.team = user.team_id;

        users.push(userObj.sync()); // push promise, resolve later
      }
    }
  }

  return Promise.all(users);
}

app.get('/team/users', (req, res) => {
  getUsers().then((users) => {
    console.log(users);
    res.send(users);
  }).catch(err => res.send(err));
});

app.get('/user/:slack/sendMenu', (req, res) => {
  const user = new User();
  user.slack_id = req.params.slack;
  user.lookup().then(() => {
    user.sendDrinkRequest();
    res.sendStatus(200);
  }).catch((err) => {
    console.log(err);
    res.status(500).send(err.message);
  });
});

// Start brewbot on port 3000
app.listen(process.env.API_PORT, () => {
  console.log(`☕️  Brewbot now available on port ${process.env.API_PORT}`);
});
