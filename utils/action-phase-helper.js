module.exports = class ActionPhaseHelper {

    /**
     * Return the duration of a step (in seconds)
     * @param {ActionPhaseStep} step 
     */
    static Duration(step) {
        switch (step) {
            // CREATION duration is 20 seconds
            case 1: return 20;
            // VOTE duration is 5 seconds
            case 2: return 5;
            // RESULTS duration is 5 seconds
            case 3: return 5;
            // WAITING duration is undefined (depending on the game)
            case 4: return -1;
        }
    }
    
}