import path from 'path'
import { getOrCreate, readCsv } from '../csv.ts'
import type { FinanceRepository } from './FinanceRepository.ts'
import type { FinancialYear } from '../../models/FinancialYear.ts'
import type { MonthlyPoint } from '../../models/MonthlyPoint.ts'

interface TithingYear {
    location: string
    total: number
    months: MonthlyPoint[]
}

const TITHING_FILE = 'Territorial_Tithing_2000_2025.csv'
const SURPLUS_DEFICIT_FILE = 'Surplus-Deficit Summary.csv'

const toCalendarMonth = (period: string): { year: number, month: number } | null => {
    const match = /^M(\d{2})(\d{2})$/.exec(period)
    if (!match) {
        return null
    }
    const month = parseInt(match[2], 10)
    return month >= 1 && month <= 12 ? { year: 2000 + parseInt(match[1], 10), month } : null
}

const toSurplusDeficitYear = (column: string): FinancialYear | null => {
    const match = /^(\d{2})GLA$/.exec(column)
    return match ? 2000 + parseInt(match[1], 10) : null
}

/**
 * FinanceRepository backed by the TechOne tithing and surplus/deficit exports.
 */
export class TechOneCsvFinanceRepository implements FinanceRepository {
    private readonly names: Map<string, { name: string, year: FinancialYear }>
    private readonly tithingByCorps: Map<string, Map<FinancialYear, TithingYear>>
    private readonly surplusDeficitByLocation: Map<string, Map<FinancialYear, number>>
    private readonly financialYears: FinancialYear[]

    /**
     * Read both finance exports once from the data folder.
     * @returns Rejects naming the export that cannot be read
     */
    static async load(dataFolder: string): Promise<TechOneCsvFinanceRepository> {
        const [tithingRows, surplusDeficitRows] = await Promise.all([
            readCsv(path.join(dataFolder, TITHING_FILE)),
            readCsv(path.join(dataFolder, SURPLUS_DEFICIT_FILE))
        ])
        return new TechOneCsvFinanceRepository(tithingRows, surplusDeficitRows)
    }

    constructor(tithingRows: Record<string, string>[], surplusDeficitRows: Record<string, string>[]) {
        this.names = new Map()
        this.tithingByCorps = new Map()
        this.surplusDeficitByLocation = new Map()
        const years = new Set<FinancialYear>()

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

        this.financialYears = [...years].toSorted((a, b) => a - b)
    }

    years() {
        return this.financialYears
    }

    corps() {
        return [...this.names].map(([id, { name }]) => ({ id, name }))
    }

    tithing(centreId: string, year: FinancialYear) {
        return this.tithingByCorps.get(centreId)?.get(year)?.total ?? null
    }

    monthlyTithing(centreId: string, year: FinancialYear) {
        return this.tithingByCorps.get(centreId)?.get(year)?.months ?? []
    }

    surplusDeficit(centreId: string, year: FinancialYear) {
        const location = this.tithingByCorps.get(centreId)?.get(year)?.location
        return location === undefined ? null : this.surplusDeficitByLocation.get(location)?.get(year) ?? null
    }
}
