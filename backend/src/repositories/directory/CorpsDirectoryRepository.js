/**
 * @typedef {import('../../models/Corps.js').Corps} Corps
 */

/**
 * @typedef {Object} CorpsDirectoryRepository
 * @property {() => Corps[]} all
 * @property {(centreId: string) => Corps | null} get
 * @property {(centreId: string, year: number) => number | null} population
 */

export {}
