module.exports = class ClientManager {
  constructor() {
    this.clients = [];
  }

  getClients() {
    return this.clients;
  }

  clearClients() {
    if (this.clients.length === 0) return;
    this.clients.length = 0;
  }

  addClient(client) {
    this.clients.push(client);
  }

  removeClient(clientId) {
    this.clients = this.clients.filter(aClient => aClient.id !== clientId);
  }
};
