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

    const result = await db.execute('SELECT * FROM users WHERE id = ?', [this.id]);
    return result[0];
  }

  fromSQL(sqlRow) {
    Object.assign(this, sqlRow);
  }
}

export default User;
