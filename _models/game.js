module.exports = class Game {

    /**
     * 
     * @param {string} name 
     * @param {array of Player object} players 
     */
    constructor(name, players) {
        this.name = name;
        this.players = players;
    }

    setActionManager(actionManager) {
        this.actionManager = actionManager;
    }

    setGameState(state) {
        this.state = state;
    }

    getActionManager() {
        return this.actionManager;
    }

    getName() {
        return this.name;
    }

    getPlayers() {
        return this.players;
    }

}