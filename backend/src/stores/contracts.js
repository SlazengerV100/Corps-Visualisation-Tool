/**
 * @typedef {number} FinancialYear
 */

/**
 * @typedef {'congregationalWorship' | 'firstTimeDecisions' | 'kidsChurch' | 'youthDiscipleship'} MissionIndicator
 */

/**
 * @typedef {Object} MonthlyPoint
 * @property {number} year
 * @property {number} month
 * @property {number} metric
 */

/**
 * @typedef {Object} CorpsName
 * @property {string} id
 * @property {string} name
 */

/**
 * @typedef {Object} MissionIndicators
 * @property {number | null} congregationalWorship
 * @property {number | null} firstTimeDecisions
 * @property {number | null} kidsChurch
 * @property {number | null} youthDiscipleship
 */

/**
 * @typedef {Object} MissionStore
 * @property {() => FinancialYear[]} years
 * @property {() => CorpsName[]} corps
 * @property {(centreId: string, year: FinancialYear) => MissionIndicators | null} yearly
 * @property {(centreId: string, year: FinancialYear, indicator: MissionIndicator) => MonthlyPoint[]} monthly
 */

/**
 * @typedef {Object} FinanceStore
 * @property {() => FinancialYear[]} years
 * @property {() => CorpsName[]} corps
 * @property {(centreId: string, year: FinancialYear) => number | null} tithing
 * @property {(centreId: string, year: FinancialYear) => MonthlyPoint[]} monthlyTithing
 * @property {(centreId: string, year: FinancialYear) => number | null} surplusDeficit
 */

/**
 * @typedef {Object} Population
 * @property {number} year
 * @property {number} value
 */

/**
 * @typedef {Object} Corps
 * @property {string} id
 * @property {string} name
 * @property {string} area
 * @property {string} address
 * @property {string} city
 * @property {Date | null} closingDate
 * @property {number | null} lat
 * @property {number | null} lng
 * @property {Population[]} population
 */

/**
 * @typedef {Object} CorpsDirectory
 * @property {() => Corps[]} all
 * @property {(centreId: string) => Corps | null} get
 * @property {(centreId: string, year: number) => number | null} population
 */

export {}
