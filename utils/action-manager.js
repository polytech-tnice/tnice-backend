module.exports = class ActionManager {

    constructor() {
        this.actions = [];
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

}