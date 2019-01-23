module.exports = class ActionManager {

    constructor() {
        this.actions = [];
        this.socketIDs = [];
        this.lastExecutedAction = null;
    }

    getActions() {
        return this.actions;
    }

    clearActions() {
        if (this.actions.length === 0) return;
        this.actions.length = 0;
    }

    addAction(action) {
        this.actions.push(action);
    }

    hasVoted(socketID) {
        let hasVoted = false;
        this.socketIDs.forEach(id => {
            if (id === socketID) {
                hasVoted = true;
            }
        });
        return hasVoted;
    }

    voteActionOf(creatorID, socketID) {
        if (this.hasVoted(socketID)) return false;
        this.actions.forEach((action) => {
            if (action.getCreatorID() === creatorID) {
                action.addVote();
                this.socketIDs.push(socketID);
            }
        });
        return true;
    }

    bestAction() {
        if (this.actions.length === 0) return null;
        let bestAction = this.actions[0];
        for (let index = 1; index < this.actions.length; index++) {
            const action = this.actions[index];
            if (action.getVoteCount() > bestAction.getVoteCount()) {
                bestAction = action;
            }
        }
        // Vider la liste des sockets ID qui ont vote pour la prochaine session de vote
        this.socketIDs.length = 0;
        // Vider la liste des actions 
        this.socketIDs.length = 0;
        return bestAction;
    }

    saveLastExecutedAction(action) {
        this.lastExecutedAction = action;
    }

    getLastExecutedAction() {
        return this.lastExecutedAction;
    }

}