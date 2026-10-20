/**
 * @typedef {import('../../models/Corps.js').Corps} Corps
 * @typedef {import('../../models/FinancialYear.js').FinancialYear} FinancialYear
 * @typedef {import('../../models/MissionIndicator.js').MissionIndicator} MissionIndicator
 * @typedef {import('../../models/MissionIndicator.js').MissionIndicators} MissionIndicators
 * @typedef {import('../../models/MonthlyPoint.js').MonthlyPoint} MonthlyPoint
 */

/**
 * @typedef {Object} MissionStore
 * @property {() => FinancialYear[]} years
 * @property {() => Pick<Corps, 'id' | 'name'>[]} corps
 * @property {(centreId: string, year: FinancialYear) => MissionIndicators | null} yearly
 * @property {(centreId: string, year: FinancialYear, indicator: MissionIndicator) => MonthlyPoint[]} monthly
 */

export {}
