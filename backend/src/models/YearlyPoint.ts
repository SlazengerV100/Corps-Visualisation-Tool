import type { FinancialYear } from './FinancialYear.ts'

export interface YearlyPoint {
    year: FinancialYear
    metric: number
}
