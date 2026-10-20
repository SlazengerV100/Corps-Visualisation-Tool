/**
 * @typedef {import('../../domain/Corps.js').Corps} Corps
 */

/**
 * @typedef {Object} CorpsDirectory
 * @property {() => Corps[]} all
 * @property {(centreId: string) => Corps | null} get
 * @property {(centreId: string, year: number) => number | null} population
 */

export {}
