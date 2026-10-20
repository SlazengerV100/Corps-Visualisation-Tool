/**
 * @typedef {import('../../domain/Corps.js').Corps} Corps
 * @typedef {import('../../domain/FinancialYear.js').FinancialYear} FinancialYear
 * @typedef {import('../../domain/MissionIndicator.js').MissionIndicator} MissionIndicator
 * @typedef {import('../../domain/MissionIndicator.js').MissionIndicators} MissionIndicators
 * @typedef {import('../../domain/MonthlyPoint.js').MonthlyPoint} MonthlyPoint
 */

/**
 * @typedef {Object} MissionStore
 * @property {() => FinancialYear[]} years
 * @property {() => Pick<Corps, 'id' | 'name'>[]} corps
 * @property {(centreId: string, year: FinancialYear) => MissionIndicators | null} yearly
 * @property {(centreId: string, year: FinancialYear, indicator: MissionIndicator) => MonthlyPoint[]} monthly
 */

export {}
