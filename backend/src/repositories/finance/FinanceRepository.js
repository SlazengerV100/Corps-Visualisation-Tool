/**
 * @typedef {import('../../models/Corps.js').Corps} Corps
 * @typedef {import('../../models/FinancialYear.js').FinancialYear} FinancialYear
 * @typedef {import('../../models/MonthlyPoint.js').MonthlyPoint} MonthlyPoint
 */

/**
 * @typedef {Object} FinanceRepository
 * @property {() => FinancialYear[]} years
 * @property {() => Pick<Corps, 'id' | 'name'>[]} corps
 * @property {(centreId: string, year: FinancialYear) => number | null} tithing
 * @property {(centreId: string, year: FinancialYear) => MonthlyPoint[]} monthlyTithing
 * @property {(centreId: string, year: FinancialYear) => number | null} surplusDeficit
 */

export {}
