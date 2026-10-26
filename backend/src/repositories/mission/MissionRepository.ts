import type { Corps } from '../../models/Corps.ts'
import type { FinancialYear } from '../../models/FinancialYear.ts'
import type { MissionIndicator, MissionIndicators } from '../../models/MissionIndicator.ts'
import type { MonthlyPoint } from '../../models/MonthlyPoint.ts'

export interface MissionRepository {
    years(): FinancialYear[]
    corps(): Pick<Corps, 'id' | 'name'>[]
    yearly(centreId: string, year: FinancialYear): MissionIndicators | null
    monthly(centreId: string, year: FinancialYear, indicator: MissionIndicator): MonthlyPoint[]
}
