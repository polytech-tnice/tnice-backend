const ActionPhaseHelper = require('./action-phase-helper');
const ActionTypeEnum = require('../_models/actions/action-phase-step');

module.exports = class ActionPhaseManager {
    constructor(currentStep, startDate) {
        this.step = currentStep;
        this.start = startDate;
    }

    timeSpent(date) {
        const dif = this.start - date;
        const seconds_spent = dif / 1000;
        return Math.abs(seconds_spent);
    }

    remainingTime(date) {
        if (this.step === ActionTypeEnum.WAITING) return -1;
        const timeSpent = this.timeSpent(date);
        const stepDuration = ActionPhaseHelper.Duration(this.step);
        return stepDuration - timeSpent;
    }

    updateActionPhase(step) {
        this.step = step;
        this.start = new Date();
    }
}