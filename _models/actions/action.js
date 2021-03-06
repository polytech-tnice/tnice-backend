class Action {

    /** 
     * @param {enum} actionType 
     */
    constructor(actionType, creatorID) {
        this.actionType = actionType;
        this.creatorID = creatorID;
        this.voteCount = 0;
    }

    getActionType() {
        return this.actionType;
    }

    getCreatorID() {
        return this.creatorID;
    }

    getVoteCount() {
        return this.voteCount;
    }

    addVote() {
        this.voteCount += 1;
    }

}

module.exports = class WindAction extends Action {
    constructor(actionType, creator, speed, direction) {
        super(actionType, creator);
        this.speed = speed;
        this.direction = direction;
    }
    getSpeed() {
        return this.speed;
    }
    getDirection() {
        return this.direction;
    }

    getObject() {
        return {
            actionType: this.actionType,
            speed: this.speed,
            direction: this.direction,
            creatorID: this.creatorID
        }
    }
}