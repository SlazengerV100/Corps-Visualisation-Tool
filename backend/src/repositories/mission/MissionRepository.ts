/**
 * @typedef {import('../../models/Corps.ts').Corps} Corps
 * @typedef {import('../../models/FinancialYear.ts').FinancialYear} FinancialYear
 * @typedef {import('../../models/MissionIndicator.ts').MissionIndicator} MissionIndicator
 * @typedef {import('../../models/MissionIndicator.ts').MissionIndicators} MissionIndicators
 * @typedef {import('../../models/MonthlyPoint.ts').MonthlyPoint} MonthlyPoint
 */

/**
 * @typedef {Object} MissionRepository
 * @property {() => FinancialYear[]} years
 * @property {() => Pick<Corps, 'id' | 'name'>[]} corps
 * @property {(centreId: string, year: FinancialYear) => MissionIndicators | null} yearly
 * @property {(centreId: string, year: FinancialYear, indicator: MissionIndicator) => MonthlyPoint[]} monthly
 */

export {}
