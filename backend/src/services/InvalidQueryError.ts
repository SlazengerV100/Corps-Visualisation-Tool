export class InvalidQueryError extends Error {
    /**
     * @param {string} message
     */
    constructor(message) {
        super(message)
        this.name = 'InvalidQueryError'
    }
}
