module.exports = class Game {

    /**
     * 
     * @param {string} name 
     * @param {array of Player object} players 
     */
    constructor(name, players) {
        this.name = name;
        this.players = players;
        this.playerOneScore = 0;
        this.playerTwoScore = 0;
    }

    setActionManager(actionManager) {
        this.actionManager = actionManager;
    }

    setGameState(state) {
        this.state = state;
    }

    getGameState() {
        return this.state;
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