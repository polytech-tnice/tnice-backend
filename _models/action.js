module.exports = class Action {

    /** 
     * @param {enum} actionType 
     * @param {any} parameters 
     */
    constructor(actionType, parameters) {
        this.actionType = actionType;
        this.parameters = parameters;
    }

    getActionType() {
        return this.actionType;
    }

    getParameters() {
        return this.parameters;
    }

}