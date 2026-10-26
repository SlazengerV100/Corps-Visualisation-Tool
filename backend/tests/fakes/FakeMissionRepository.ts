import type { MissionRepository } from '../../src/repositories/mission/MissionRepository.ts'
import type { Corps } from '../../src/models/Corps.ts'
import type { FinancialYear } from '../../src/models/FinancialYear.ts'
import type { MissionIndicator, MissionIndicators } from '../../src/models/MissionIndicator.ts'
import type { MonthlyPoint } from '../../src/models/MonthlyPoint.ts'

type ByCorpsAndYear<T> = Record<string, Record<FinancialYear, T>>

export class FakeMissionRepository implements MissionRepository {
    private readonly corpsList: Pick<Corps, 'id' | 'name'>[]
    private readonly yearlyData: ByCorpsAndYear<MissionIndicators>
    private readonly monthlyData: ByCorpsAndYear<Partial<Record<MissionIndicator, MonthlyPoint[]>>>

    constructor({ corps, yearly = {}, monthly = {} }: {
        corps: Pick<Corps, 'id' | 'name'>[]
        yearly?: ByCorpsAndYear<MissionIndicators>
        monthly?: ByCorpsAndYear<Partial<Record<MissionIndicator, MonthlyPoint[]>>>
    }) {
        this.corpsList = corps
        this.yearlyData = yearly
        this.monthlyData = monthly
    }

    years() {
        const years = [...Object.values(this.yearlyData), ...Object.values(this.monthlyData)].flatMap(byYear => Object.keys(byYear))
        return [...new Set(years.map(Number))].toSorted((a, b) => a - b)
    }

    corps() {
        return this.corpsList
    }

    yearly(centreId: string, year: FinancialYear) {
        return this.yearlyData[centreId]?.[year] ?? null
    }

    monthly(centreId: string, year: FinancialYear, indicator: MissionIndicator) {
        return this.monthlyData[centreId]?.[year]?.[indicator] ?? []
    }
}
