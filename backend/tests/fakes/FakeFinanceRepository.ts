import type { FinanceRepository } from '../../src/repositories/finance/FinanceRepository.ts'
import type { Corps } from '../../src/models/Corps.ts'
import type { FinancialYear } from '../../src/models/FinancialYear.ts'
import type { MonthlyPoint } from '../../src/models/MonthlyPoint.ts'

type ByCorpsAndYear<T> = Record<string, Record<FinancialYear, T>>

export class FakeFinanceRepository implements FinanceRepository {
    private readonly corpsList: Pick<Corps, 'id' | 'name'>[]
    private readonly tithingData: ByCorpsAndYear<number>
    private readonly monthlyTithingData: ByCorpsAndYear<MonthlyPoint[]>
    private readonly surplusDeficitData: ByCorpsAndYear<number>

    constructor({ corps, tithing = {}, monthlyTithing = {}, surplusDeficit = {} }: {
        corps: Pick<Corps, 'id' | 'name'>[]
        tithing?: ByCorpsAndYear<number>
        monthlyTithing?: ByCorpsAndYear<MonthlyPoint[]>
        surplusDeficit?: ByCorpsAndYear<number>
    }) {
        this.corpsList = corps
        this.tithingData = tithing
        this.monthlyTithingData = monthlyTithing
        this.surplusDeficitData = surplusDeficit
    }

    years() {
        const years = [this.tithingData, this.surplusDeficitData].flatMap(byCorps => Object.values(byCorps)).flatMap(byYear => Object.keys(byYear))
        return [...new Set(years.map(Number))].toSorted((a, b) => a - b)
    }

    corps() {
        return this.corpsList
    }

    tithing(centreId: string, year: FinancialYear) {
        return this.tithingData[centreId]?.[year] ?? null
    }

    monthlyTithing(centreId: string, year: FinancialYear) {
        return this.monthlyTithingData[centreId]?.[year] ?? []
    }

    surplusDeficit(centreId: string, year: FinancialYear) {
        return this.surplusDeficitData[centreId]?.[year] ?? null
    }
}
