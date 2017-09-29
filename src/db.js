import MySQL from 'mysql2/promise';

/** Database connection singleton */
class DB {
  static instance;

  /**
   * Array returned by database, contains results requested
   * @typedef {Array<BinaryRow>} RowArray
   */

  /**
   * Array containing information about the columns used in the query
   * @typedef {Array<Object>} ColumnArray
   */

  /**
   * Array containing the rows and columns requested
   * @typedef {Array<RowArray, ColumnArray>} QueryResult
   */

  /**
   * Gets existing instance, creates one if it doesn't exist
   */
  constructor() {
    if (this.instance) {
      return this.instance;
    }

    this.instance = this;
  }

  /**
   * Spawns a MySQL pool with a max of 10 connections.
   * Only call this once
   * @returns {Promise}
   */
  async connect() {
    this.client = await MySQL.createPool({
      connectionLimit: 10,
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });
  }

  /**
   * Runs a raw SQL query
   * @param {string} sql - query string
   * @returns {Promise<QueryResult>}
   */
  async query(sql) {
    if (this.client === undefined) {
      await this.connect();
    }

    return this.client.query(sql);
  }

  /**
   * Prepares and executes a query
   * @param {string} sql - query string with ? to indicate parameters
   * @param {Array<*>} params - array of values to use as parameters
   * @returns {Promise<QueryResult>}
   */
  async execute(sql, params) {
    if (this.client === undefined) {
      await this.connect();
    }

    return this.client.execute(sql, params);
  }
}

export default DB;
