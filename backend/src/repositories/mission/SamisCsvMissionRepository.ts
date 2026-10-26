import path from 'path'
import { getOrCreate, readCsv } from '../csv.ts'
import type { MissionRepository } from './MissionRepository.ts'
import type { FinancialYear } from '../../models/FinancialYear.ts'
import type { MissionIndicator, MissionIndicators } from '../../models/MissionIndicator.ts'
import type { MonthlyPoint } from '../../models/MonthlyPoint.ts'

const YEARLY_FILE = 'Territory_Indicators_Yr2000_2025.csv'
const MONTHLY_FILE = 'Territory_Indicators_Mth2000_2025.csv'

const INDICATORS = new Map<string, MissionIndicator>([
    ['01-Congregational Worship', 'congregationalWorship'],
    ['03A-First Time Decisions', 'firstTimeDecisions'],
    ['04-Kids Church', 'kidsChurch'],
    ['05-Youth Discipleship', 'youthDiscipleship']
])

const toFinancialYear = (endYear: string): FinancialYear | null => {
    const match = /^(\d{4})\/\d{2}$/.exec(endYear)
    return match ? parseInt(match[1], 10) + 1 : null
}

const toMonth = (periodCode: string): number | null => {
    const match = /^M\d{2}(\d{2})$/.exec(periodCode)
    const month = match ? parseInt(match[1], 10) : 0
    return month >= 1 && month <= 12 ? month : null
}

/**
 * MissionRepository backed by the SAMIS yearly and monthly indicator exports.
 */
export class SamisCsvMissionRepository implements MissionRepository {
    private readonly names: Map<string, string>
    private readonly yearlyByCorps: Map<string, Map<FinancialYear, MissionIndicators>>
    private readonly monthlyByCorps: Map<string, Map<FinancialYear, Map<MissionIndicator, MonthlyPoint[]>>>
    private readonly financialYears: FinancialYear[]

    /**
     * Read both indicator exports once from the data folder.
     * @returns Rejects naming the export that cannot be read
     */
    static async load(dataFolder: string): Promise<SamisCsvMissionRepository> {
        const [yearlyRows, monthlyRows] = await Promise.all([
            readCsv(path.join(dataFolder, YEARLY_FILE)),
            readCsv(path.join(dataFolder, MONTHLY_FILE))
        ])
        return new SamisCsvMissionRepository(yearlyRows, monthlyRows)
    }

    constructor(yearlyRows: Record<string, string>[], monthlyRows: Record<string, string>[]) {
        this.names = new Map()
        this.yearlyByCorps = new Map()
        this.monthlyByCorps = new Map()
        const years = new Set<FinancialYear>()

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

        this.financialYears = [...years].toSorted((a, b) => a - b)
    }

    years() {
        return this.financialYears
    }

    corps() {
        return [...this.names].map(([id, name]) => ({ id, name }))
    }

    yearly(centreId: string, year: FinancialYear) {
        return this.yearlyByCorps.get(centreId)?.get(year) ?? null
    }

    monthly(centreId: string, year: FinancialYear, indicator: MissionIndicator) {
        return this.monthlyByCorps.get(centreId)?.get(year)?.get(indicator) ?? []
    }
}
