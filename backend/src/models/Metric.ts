import type { FinancialYear } from './FinancialYear.ts'
import type { MissionIndicator } from './MissionIndicator.ts'

export type MetricName = MissionIndicator | 'tithing' | 'surplusDeficit'

export type Granularity = 'year' | 'month'

export type Unit = 'people' | 'decisions' | 'dollars'

export interface MetricDefinition {
    name: MetricName
    label: string
    unit: Unit
    granularities: Granularity[]
    years: FinancialYear[]
}
