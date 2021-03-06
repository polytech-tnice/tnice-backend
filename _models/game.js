module.exports = class Game {

    /**
     * 
     * @param {string} name 
     * @param {array of Player object} players 
     */
    constructor(name, players) {
        this.name = name;
        this.players = players;
        this.connectedClientIDs = [];
        this.playerOneScore = 0;
        this.playerTwoScore = 0;
    }

    /**
     * Set the action phase manager to the Game object
     * @param {ActionPhaseManager} action_phase_manager 
     */
    setActionPhaseManager(action_phase_manager) {
        this.apm = action_phase_manager;
    }

    /**
     * Get the action phase manager of the Game object
     */
    getActionPhaseManager() {
        return this.apm;
    }

    setActionManager(actionManager) {
        this.actionManager = actionManager;
    }

    setActionPhaseStep(step) {
        this.step = step;
    }

    getActionManager() {
        return this.step;
    }

    setGameState(state) {
        this.status = state;
    }

    getGameState() {
        return this.status;
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

    getConnectedClientIDs() {
        return this.connectedClientIDs;
    }

}