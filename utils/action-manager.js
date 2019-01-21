module.exports = class ActionManager {

    constructor() {
        this.actions = [];
        this.socketIDs = [];
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

}