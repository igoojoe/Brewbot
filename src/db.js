import MariaClient from 'mariasql';

class DB {
  constructor(host, user, pass) {
    this.client = new MariaClient({ host, user, pass });
  }
}

export default DB;
