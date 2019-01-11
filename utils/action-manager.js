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
        console.log('DEBUG - Action pushed in action manager\'s list!')
        this.actions.push(action);
    }

}