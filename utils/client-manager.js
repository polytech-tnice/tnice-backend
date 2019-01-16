module.exports = class ClientManager {
  constructor() {
    this.clients = [];
  }

  getClients() {
    return this.clients;
  }

  getClientsOfType(type) {
    return this.clients.filter(aClient => aClient.name === type);
  }

  clearClients() {
    if (this.clients.length === 0) return;
    this.clients = [];
  }

  addClient(client) {
    this.clients.push(client);
  }

  removeClient(clientId) {
    this.clients = this.clients.filter(aClient => aClient.id !== clientId);
  }
};
