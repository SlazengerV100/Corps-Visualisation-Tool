import type { FinancialYear } from './FinancialYear.ts'
import type { MetricDefinition } from './Metric.ts'

export interface Catalogue {
    metrics: MetricDefinition[]
    snapshots: { years: FinancialYear[], scoredYears: FinancialYear[] }
}
