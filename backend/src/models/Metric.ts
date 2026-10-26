/**
 * @typedef {import('./FinancialYear.ts').FinancialYear} FinancialYear
 * @typedef {import('./MissionIndicator.ts').MissionIndicator} MissionIndicator
 */

/**
 * @typedef {MissionIndicator | 'tithing' | 'surplusDeficit'} MetricName
 */

/**
 * @typedef {'year' | 'month'} Granularity
 */

/**
 * @typedef {Object} MetricDefinition
 * @property {MetricName} name
 * @property {string} label
 * @property {Granularity[]} granularities
 * @property {FinancialYear[]} years
 */

export {}
