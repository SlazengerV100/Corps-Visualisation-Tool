/**
 * @typedef {import('./FinancialYear.js').FinancialYear} FinancialYear
 * @typedef {import('./Metric.js').MetricDefinition} MetricDefinition
 */

/**
 * @typedef {Object} Catalogue
 * @property {MetricDefinition[]} metrics
 * @property {{ years: FinancialYear[], scoredYears: FinancialYear[] }} snapshots
 */

export {}
