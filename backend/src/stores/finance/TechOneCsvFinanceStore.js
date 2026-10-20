import path from 'path'
import { getOrCreate, readCsv } from '../csv.js'

/**
 * @typedef {import('./FinanceStore.js').FinanceStore} FinanceStore
 * @typedef {import('../../domain/FinancialYear.js').FinancialYear} FinancialYear
 * @typedef {import('../../domain/MonthlyPoint.js').MonthlyPoint} MonthlyPoint
 */

/**
 * @typedef {Object} TithingYear
 * @property {string} location
 * @property {number} total
 * @property {MonthlyPoint[]} months
 */

const TITHING_FILE = 'Territorial_Tithing_2000_2025.csv'
const SURPLUS_DEFICIT_FILE = 'Surplus-Deficit Summary.csv'

/**
 * @param {string} period
 * @returns {{ year: number, month: number } | null}
 */
const toCalendarMonth = (period) => {
    const match = /^M(\d{2})(\d{2})$/.exec(period)
    if (!match) {
        return null
    }
    const month = parseInt(match[2], 10)
    return month >= 1 && month <= 12 ? { year: 2000 + parseInt(match[1], 10), month } : null
}

/**
 * @param {string} column
 * @returns {FinancialYear | null}
 */
const toSurplusDeficitYear = (column) => {
    const match = /^(\d{2})GLA$/.exec(column)
    return match ? 2000 + parseInt(match[1], 10) : null
}

/**
 * FinanceStore backed by the TechOne tithing and surplus/deficit exports.
 * @implements {FinanceStore}
 */
export class TechOneCsvFinanceStore {
    /**
     * Read both finance exports once from the data folder.
     * @param {string} dataFolder
     * @returns {Promise<TechOneCsvFinanceStore>} Rejects naming the export that cannot be read
     */
    static async load(dataFolder) {
        const [tithingRows, surplusDeficitRows] = await Promise.all([
            readCsv(path.join(dataFolder, TITHING_FILE)),
            readCsv(path.join(dataFolder, SURPLUS_DEFICIT_FILE))
        ])
        return new TechOneCsvFinanceStore(tithingRows, surplusDeficitRows)
    }

    /**
     * @param {Record<string, string>[]} tithingRows
     * @param {Record<string, string>[]} surplusDeficitRows
     */
    constructor(tithingRows, surplusDeficitRows) {
        /** @type {Map<string, { name: string, year: FinancialYear }>} */
        this.names = new Map()
        /** @type {Map<string, Map<FinancialYear, TithingYear>>} */
        this.tithingByCorps = new Map()
        /** @type {Map<string, Map<FinancialYear, number>>} */
        this.surplusDeficitByLocation = new Map()
        /** @type {Set<FinancialYear>} */
        const years = new Set()

        for (const row of tithingRows) {
            const period = toCalendarMonth(row.M_period)
            if (!period) {
                continue
            }
            const year = period.month >= 7 ? period.year + 1 : period.year
            const metric = parseFloat(row.mth_value) || 0
            years.add(year)

            const known = this.names.get(row.code)
            if (!known || known.year < year) {
                this.names.set(row.code, { name: row.name.trim(), year })
            }

            const tithing = getOrCreate(getOrCreate(this.tithingByCorps, row.code, () => new Map()), year, () => ({
                location: row.location,
                total: 0,
                months: []
            }))
            tithing.total += metric
            tithing.months.push({ ...period, metric })
        }

        for (const byYear of this.tithingByCorps.values()) {
            for (const tithing of byYear.values()) {
                tithing.months.sort((a, b) => a.year - b.year || a.month - b.month)
            }
        }

        for (const row of surplusDeficitRows) {
            for (const [column, value] of Object.entries(row)) {
                const year = toSurplusDeficitYear(column)
                if (!year || value === '') {
                    continue
                }
                years.add(year)
                getOrCreate(this.surplusDeficitByLocation, row.Location, () => new Map()).set(year, parseFloat(value) || 0)
            }
        }

        /** @type {FinancialYear[]} */
        this.financialYears = [...years].sort((a, b) => a - b)
    }

    years() {
        return this.financialYears
    }

    corps() {
        return [...this.names].map(([id, { name }]) => ({ id, name }))
    }

    /**
     * @param {string} centreId
     * @param {FinancialYear} year
     */
    tithing(centreId, year) {
        return this.tithingByCorps.get(centreId)?.get(year)?.total ?? null
    }

    /**
     * @param {string} centreId
     * @param {FinancialYear} year
     */
    monthlyTithing(centreId, year) {
        return this.tithingByCorps.get(centreId)?.get(year)?.months ?? []
    }

    /**
     * @param {string} centreId
     * @param {FinancialYear} year
     */
    surplusDeficit(centreId, year) {
        const location = this.tithingByCorps.get(centreId)?.get(year)?.location
        return location === undefined ? null : this.surplusDeficitByLocation.get(location)?.get(year) ?? null
    }
}
