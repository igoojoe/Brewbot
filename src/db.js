import MySQL from 'mysql2/promise';

class DB {
  static instance;

  constructor() {
    if (this.instance) {
      return this.instance;
    }

    this.instance = this;
  }

  async connect() {
    this.client = await MySQL.createPool({
      connectionLimit: 10,
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });
  }

  async query(sql) {
    if (this.client === undefined) {
      await this.connect();
    }

    return this.client.query(sql);
  }

  async execute(sql, params) {
    if (this.client === undefined) {
      await this.connect();
    }

    return this.client.execute(sql, params);
  }
}

export default DB;
