module.exports = class Client {
  /**
   *
   * @param {SocketIO} socket
   * @param {enum} clientName
   */
  constructor(socket, clientName) {
    this.id = socket.client.id;
    this.socket = socket;
    this.name = clientName;
  }

  getId() {
    return this.id;
  }

  getSocket() {
    return this.socket;
  }

  getName() {
    return this.name;
  }
};
