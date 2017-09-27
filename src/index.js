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
  let users = [];
  
  if (usersraw.ok) {
    for (let i = 0; i < usersraw.members.length; i++) {
      const user = usersraw.members[i];
      if (user.presence === 'active' && user.name.indexOf('bot') < 0) {
        let userObj = new User();
        userObj.name = user.name;
        userObj.slack_id = user.id;
        userObj.team = user.team_id;

        await userObj.sync();

        if (user.name == 'joe') {
          userObj.sendMessage({
            text: 'Pick a drink',
            response_type: 'ephemeral',
            attachments: [
              {
                text: 'Select your drink',
                fallback: 'It looks like your device doesn\'t support our fancy menu technology',
                color: '#3AA3E3',
                attachment_type: 'default',
                callback_id: 'request-round',
                actions: [
                  {
                    name: 'drink-list',
                    text: 'Pick a drink...',
                    type: 'select',
                    options: [
                      {
                        text: 'Tea',
                        value: 'tea'
                      },
                      {
                        text: 'Coffee',
                        value: 'coffee'
                      }
                    ]
                  }
                ]
              }
            ]
          });
        }

        users.push(userObj);
      }
    }
  }

  return users;
}

app.get('/team/users', (req, res) => {
  getUsers().then(users => res.send(users)).catch(err => res.send(err));
});

// Start brewbot on port 3000
app.listen(process.env.API_PORT, () => {
  console.log(`☕️  Brewbot now available on port ${process.env.API_PORT}`);
});
