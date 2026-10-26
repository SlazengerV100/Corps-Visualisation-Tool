/**
 * @typedef {import('./FinancialYear.ts').FinancialYear} FinancialYear
 * @typedef {import('./Metric.ts').MetricDefinition} MetricDefinition
 */

/**
 * @typedef {Object} Catalogue
 * @property {MetricDefinition[]} metrics
 * @property {{ years: FinancialYear[], scoredYears: FinancialYear[] }} snapshots
 */

export {}
