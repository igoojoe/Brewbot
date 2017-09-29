import request from 'request-promise-native';
import DB from '../db';

class User {
  get uid() {
    return this.id;
  }

  set uid(newId) {
    this.id = parseInt(newId, 10);
  }

  async lookup() {
    if (typeof this.id !== 'number') {
      return new Error('ID not valid');
    }

    const db = new DB();
    const dbResult = await db.execute('SELECT * FROM users WHERE id = ?', [this.id]);
    const result = dbResult[0][0];
    this.fromSQL(result);

    return result;
  }

  async lookupSlack() {
    if (typeof this.slack_id.length < 8) {
      return new Error('ID not valid');
    }

    const db = new DB();
    const dbResult = await db.execute('SELECT * FROM users WHERE slack_id = ?', [this.slack_id]);
    const result = dbResult[0][0];
    this.fromSQL(result);
    
    return result;
  }

  async addTeam() {
    const db = new DB();
    if (typeof this.team !== 'number') {
      const teamQ = await db.execute('SELECT * FROM teams WHERE slack_id = ?', [this.team]);

      if (teamQ[0].length < 1) {
        const addTeamQ = await db.execute('INSERT INTO teams (slack_id) VALUES (?)', [this.team]);
        console.log(addTeamQ);
        return addTeamQ[0].insertId;
      }

      return teamQ[0][0].id;
    }

    return this.team;
  }

  async addToDB() {
    const db = new DB();

    const teamId = await this.addTeam();
    this.team = teamId;
    console.log(teamId);

    const exists = await db.execute('SELECT * FROM users WHERE slack_id = ?', [this.slack_id]);
    if (exists[0].length < 1) {
      // User does not exist, create in db
      const create = await db.execute('INSERT INTO `users` (`id`, `slack_id`, `team`, `name`) VALUES (NULL, ?, ?, ?)', [this.slack_id, this.team, this.name]);
      this.id = create[0].insertId;
      return this;
    }

    return exists;
  }

  async sync() {
    let result = null;

    if (this.id) {
      result = await this.lookup();
    } else if (this.slack_id) {
      result = await this.lookupSlack();
    }

    if (!result) {
      return this.addToDB();
    }
    
    return result;
  }

  fromSQL(sqlRow) {
    Object.assign(this, sqlRow);
  }

  async sendMessage(data) {
    const im = await request({
      method: 'POST',
      uri: 'https://slack.com/api/im.open',
      form: {
        token: process.env.TOKEN,
        user: this.slack_id,
      },
    });

    const imParsed = JSON.parse(im);

    if (imParsed.ok) {
      const imID = imParsed.channel.id;

      let messageData = data;
      if (messageData.attachments) {
        messageData.attachments = JSON.stringify(messageData.attachments);
      }

      /*await request({
        method: 'POST',
        uri: 'https://slack.com/api/chat.postMessage',
        form: {
          token: process.env.TOKEN,
          channel: imID,
          ...messageData,
        },
      });*/
    }
  }
}

export default User;