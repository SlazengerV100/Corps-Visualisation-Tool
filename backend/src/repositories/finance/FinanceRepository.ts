import type { Corps } from '../../models/Corps.ts'
import type { FinancialYear } from '../../models/FinancialYear.ts'
import type { MonthlyPoint } from '../../models/MonthlyPoint.ts'

export interface FinanceRepository {
    years(): FinancialYear[]
    corps(): Pick<Corps, 'id' | 'name'>[]
    tithing(centreId: string, year: FinancialYear): number | null
    monthlyTithing(centreId: string, year: FinancialYear): MonthlyPoint[]
    surplusDeficit(centreId: string, year: FinancialYear): number | null
}
