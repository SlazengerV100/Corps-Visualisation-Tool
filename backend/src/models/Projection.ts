import type { FinancialYear } from './FinancialYear.ts'
import type { MetricName } from './Metric.ts'

export type ProjectedMetricName = Exclude<MetricName, 'firstTimeDecisions'>

export interface Match {
    id: string
    name: string
    year: FinancialYear
    similarity: number
}

export interface ProjectedPoint {
    year: FinancialYear
    metric: number
    low: number
    high: number
}

export interface Projection {
    window: number
    year: FinancialYear
    matches: Match[]
    metrics: Record<ProjectedMetricName, ProjectedPoint[]>
}
