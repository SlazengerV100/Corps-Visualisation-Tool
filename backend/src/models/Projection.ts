import type { FinancialYear } from './FinancialYear.ts'
import type { MetricName } from './Metric.ts'
import type { YearlyPoint } from './YearlyPoint.ts'

export type ProjectedMetricName = Exclude<MetricName, 'firstTimeDecisions'>

export interface Match {
    id: string
    name: string
    year: FinancialYear
    similarity: number
}

export interface MetricMatch extends Match {
    points: YearlyPoint[]
}

export interface ProjectedPoint {
    year: FinancialYear
    metric: number
    low: number
    high: number
}

export interface MetricProjection {
    matches: MetricMatch[]
    points: ProjectedPoint[]
}

export interface Projection {
    window: number
    year: FinancialYear
    matches: Match[]
    metrics: Record<ProjectedMetricName, MetricProjection>
}
