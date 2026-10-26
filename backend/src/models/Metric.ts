import type { FinancialYear } from './FinancialYear.ts'
import type { MissionIndicator } from './MissionIndicator.ts'

export type MetricName = MissionIndicator | 'tithing' | 'surplusDeficit'

export type Granularity = 'year' | 'month'

export interface MetricDefinition {
    name: MetricName
    label: string
    granularities: Granularity[]
    years: FinancialYear[]
}
