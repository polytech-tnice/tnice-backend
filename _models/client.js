module.exports = class Client {
  /**
   *
   * @param {string} socketId
   * @param {enum} clientName
   */
  constructor(socketId, clientName) {
    this.id = socketId;
    this.name = clientName;
  }

  getClientId() {
    return this.id;
  }

  getName() {
    return this.name;
  }
};
