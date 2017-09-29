import request from 'request-promise-native';
import DB from '../db';

/** Class representing a user */
class User {
  get uid() {
    return this.id;
  }

  set uid(newId) {
    this.id = parseInt(newId, 10);
  }

  /**
   * Gets the user data from the database. Requires this.id or this.slack_id set
   * @returns {Promise<User>} User object with the data, same as this
   */
  async lookup() {
    let result = null;

    if (this.id) {
      result = await this.lookup(this.id);
    } else if (this.slack_id) {
      result = await this.lookupSlack(this.slack_id);
    }

    return result;
  }

  /**
   * Get user data from database by row ID
   * @param {number} id - ID of database row
   * @returns {Promise<User>} User object with the data, same as this
   */
  async lookupID(id) {
    if (typeof id !== 'number') {
      return new Error('ID not valid');
    }

    const db = new DB();
    const dbResult = await db.execute('SELECT * FROM users WHERE id = ?', [id]);
    const result = dbResult[0][0];

    if (result) {
      return this.fromSQL(result);
    }

    return new Error(`User with ID ${id} not found`);
  }

  /**
   * Get user data from database by Slack ID
   * @param {string} slackId - User's Slack ID
   * @returns {Promise<User>} User object with the data, same as this
   */
  async lookupSlack(slackId) {
    if (typeof slackId.length < 8) {
      return new Error('ID not valid');
    }

    const db = new DB();
    const dbResult = await db.execute('SELECT * FROM users WHERE slack_id = ?', [slackId]);
    const result = dbResult[0][0];
    return this.fromSQL(result);
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

  /**
   * Adds the current user to the database if needed
   * @returns {Promise<User>} User object with the data
   */
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

    return this.fromSQL(exists[0][0]);
  }

  /**
   * Gets user data from database if exists, adds if it doesn't.
   * A combination of {@link User#lookup} and {@link User#addToDB}
   * @returns {Promise<User>} User object with the data
   */
  async sync() {
    const result = await this.lookup();

    if (!result) {
      return this.addToDB();
    }

    return result;
  }

  /**
   * Converts a SQL row into a User object
   * @param {BinaryRow} sqlRow - Row returned from an SQL query
   * @returns {User} this
   */
  fromSQL(sqlRow) {
    return Object.assign(this, sqlRow);
  }

  /**
   * Sends a direct message to the user
   * @param {Object} data - Slack message data
   */
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

      const messageData = data;
      if (messageData.attachments) {
        messageData.attachments = JSON.stringify(messageData.attachments);
      }

      console.log(messageData);

      await request({
        method: 'POST',
        uri: 'https://slack.com/api/chat.postMessage',
        form: {
          //token: process.env.TOKEN,
          channel: imID,
          ...messageData,
        },
      });
    }
  }

  /**
   * Sends a menu of drinks for the user to pick from
   */
  async sendDrinkRequest() {
    const message = {
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
    };

    return this.sendMessage(message);
  }
}

export default User;