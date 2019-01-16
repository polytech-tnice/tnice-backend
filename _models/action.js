class Action {

    /** 
     * @param {enum} actionType 
     */
    constructor(actionType) {
        this.actionType = actionType;
    }

    getActionType() {
        return this.actionType;
    }

}

module.exports = class WindAction extends Action {
    constructor(actionType, speed, direction) {
        super(actionType);
        this.speed = speed;
        this.direction = direction;
    }
    getSpeed() {
        return this.speed;
    }
    getDirection() {
        return this.direction;
    }

    getJSON() {
        return JSON.stringify({
            actionType: this.actionType,
            speed: this.speed,
            direction: this.direction
        })
    }
}