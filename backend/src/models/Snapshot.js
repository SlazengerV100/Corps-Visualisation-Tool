/**
 * @typedef {import('./FinancialYear.js').FinancialYear} FinancialYear
 */

/**
 * @typedef {Object} YearPair
 * @property {number | null} currentYear
 * @property {number | null} prevYear
 */

/**
 * @typedef {Object} TithingPair
 * @property {number} currentYear
 * @property {number} prevYear
 */

/**
 * @typedef {Object} Scores
 * @property {number} growth
 * @property {number} sustainability
 * @property {number} size
 */

/**
 * @typedef {Object} SnapshotMetrics
 * @property {YearPair} congregationalWorship
 * @property {YearPair} firstTimeDecisions
 * @property {YearPair} kidsChurch
 * @property {YearPair} youthDiscipleship
 * @property {TithingPair | null} tithing
 * @property {number | null} surplusDeficit
 * @property {number | null} population
 */

/**
 * @typedef {Object} Snapshot
 * @property {string} id
 * @property {string} name
 * @property {FinancialYear} year
 * @property {SnapshotMetrics} metrics
 * @property {Scores} [scores]
 */

export {}
