import { InvalidQueryError } from '../services/InvalidQueryError.ts'

/**
 * Read an optional financial year from a query parameter.
 * @param {unknown} value
 * @returns {number | undefined} Throws InvalidQueryError when the value is not a four-digit year
 */
export function parseYear(value) {
    if (value === undefined) {
        return undefined
    }
    if (typeof value !== 'string' || !/^\d{4}$/.test(value)) {
        throw new InvalidQueryError(`Invalid year ${JSON.stringify(value)}`)
    }
    return parseInt(value, 10)
}
