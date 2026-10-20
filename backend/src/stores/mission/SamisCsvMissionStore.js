import path from 'path'
import { getOrCreate, readCsv } from '../csv.js'

/**
 * @typedef {import('./MissionStore.js').MissionStore} MissionStore
 * @typedef {import('../../models/FinancialYear.js').FinancialYear} FinancialYear
 * @typedef {import('../../models/MissionIndicator.js').MissionIndicator} MissionIndicator
 * @typedef {import('../../models/MissionIndicator.js').MissionIndicators} MissionIndicators
 * @typedef {import('../../models/MonthlyPoint.js').MonthlyPoint} MonthlyPoint
 */

const YEARLY_FILE = 'Territory_Indicators_Yr2000_2025.csv'
const MONTHLY_FILE = 'Territory_Indicators_Mth2000_2025.csv'

/** @type {Map<string, MissionIndicator>} */
const INDICATORS = new Map([
    ['01-Congregational Worship', 'congregationalWorship'],
    ['03A-First Time Decisions', 'firstTimeDecisions'],
    ['04-Kids Church', 'kidsChurch'],
    ['05-Youth Discipleship', 'youthDiscipleship']
])

/**
 * @param {string} endYear
 * @returns {FinancialYear | null}
 */
const toFinancialYear = (endYear) => {
    const match = /^(\d{4})\/\d{2}$/.exec(endYear)
    return match ? parseInt(match[1], 10) + 1 : null
}

/**
 * @param {string} periodCode
 * @returns {number | null}
 */
const toMonth = (periodCode) => {
    const match = /^M\d{2}(\d{2})$/.exec(periodCode)
    const month = match ? parseInt(match[1], 10) : 0
    return month >= 1 && month <= 12 ? month : null
}

/**
 * MissionStore backed by the SAMIS yearly and monthly indicator exports.
 * @implements {MissionStore}
 */
export class SamisCsvMissionStore {
    /**
     * Read both indicator exports once from the data folder.
     * @param {string} dataFolder
     * @returns {Promise<SamisCsvMissionStore>} Rejects naming the export that cannot be read
     */
    static async load(dataFolder) {
        const [yearlyRows, monthlyRows] = await Promise.all([
            readCsv(path.join(dataFolder, YEARLY_FILE)),
            readCsv(path.join(dataFolder, MONTHLY_FILE))
        ])
        return new SamisCsvMissionStore(yearlyRows, monthlyRows)
    }

    /**
     * @param {Record<string, string>[]} yearlyRows
     * @param {Record<string, string>[]} monthlyRows
     */
    constructor(yearlyRows, monthlyRows) {
        /** @type {Map<string, string>} */
        this.names = new Map()
        /** @type {Map<string, Map<FinancialYear, MissionIndicators>>} */
        this.yearlyByCorps = new Map()
        /** @type {Map<string, Map<FinancialYear, Map<MissionIndicator, MonthlyPoint[]>>>} */
        this.monthlyByCorps = new Map()
        /** @type {Set<FinancialYear>} */
        const years = new Set()

        for (const row of yearlyRows) {
            const indicator = INDICATORS.get(row.indicator)
            const year = toFinancialYear(row.end_year)
            if (!indicator || !year) {
                continue
            }
            this.names.set(row.centre_code, row.centre_name)
            years.add(year)
            const byYear = getOrCreate(this.yearlyByCorps, row.centre_code, () => new Map())
            const indicators = getOrCreate(byYear, year, () => ({
                congregationalWorship: null,
                firstTimeDecisions: null,
                kidsChurch: null,
                youthDiscipleship: null
            }))
            indicators[indicator] = parseFloat(row.averages)
        }

        for (const row of monthlyRows) {
            const indicator = INDICATORS.get(row.indicator)
            const year = toFinancialYear(row.end_year)
            const month = toMonth(row.period_code)
            if (!indicator || !year || !month) {
                continue
            }
            this.names.set(row.centre_code, row.centre_name)
            years.add(year)
            const byYear = getOrCreate(this.monthlyByCorps, row.centre_code, () => new Map())
            const byIndicator = getOrCreate(byYear, year, () => new Map())
            getOrCreate(byIndicator, indicator, () => []).push({
                year: month >= 7 ? year - 1 : year,
                month,
                metric: parseFloat(row.averages)
            })
        }

        for (const byYear of this.monthlyByCorps.values()) {
            for (const byIndicator of byYear.values()) {
                for (const points of byIndicator.values()) {
                    points.sort((a, b) => a.year - b.year || a.month - b.month)
                }
            }
        }

        /** @type {FinancialYear[]} */
        this.financialYears = [...years].sort((a, b) => a - b)
    }

    years() {
        return this.financialYears
    }

    corps() {
        return [...this.names].map(([id, name]) => ({ id, name }))
    }

    /**
     * @param {string} centreId
     * @param {FinancialYear} year
     */
    yearly(centreId, year) {
        return this.yearlyByCorps.get(centreId)?.get(year) ?? null
    }

    /**
     * @param {string} centreId
     * @param {FinancialYear} year
     * @param {MissionIndicator} indicator
     */
    monthly(centreId, year, indicator) {
        return this.monthlyByCorps.get(centreId)?.get(year)?.get(indicator) ?? []
    }
}
