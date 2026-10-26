/**
 * @typedef {import('../../models/Corps.ts').Corps} Corps
 * @typedef {import('../../models/FinancialYear.ts').FinancialYear} FinancialYear
 * @typedef {import('../../models/MonthlyPoint.ts').MonthlyPoint} MonthlyPoint
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
