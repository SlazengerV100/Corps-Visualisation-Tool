import type { FinancialYear } from './FinancialYear.ts'

export interface YearPair {
    currentYear: number | null
    prevYear: number | null
}

export interface TithingPair {
    currentYear: number
    prevYear: number
}

export interface ChangeBreakdown {
    band: number
    nominal: number
    percentage: number
}

export interface GrowthBreakdown {
    congregationalWorship: ChangeBreakdown
    firstTimeDecisions: number
    kidsChurch: ChangeBreakdown | null
    youthDiscipleship: ChangeBreakdown | null
}

export interface SustainabilityBreakdown {
    tithing: ChangeBreakdown
    surplusDeficit: number | null
}

export interface Scores {
    growth: number
    sustainability: number
    size: number
    breakdown: {
        growth: GrowthBreakdown
        sustainability: SustainabilityBreakdown
    }
}

export interface SnapshotMetrics {
    congregationalWorship: YearPair
    firstTimeDecisions: YearPair
    kidsChurch: YearPair
    youthDiscipleship: YearPair
    tithing: TithingPair | null
    surplusDeficit: number | null
    population: number | null
}

export interface Snapshot {
    id: string
    name: string
    year: FinancialYear
    metrics: SnapshotMetrics
    scores?: Scores
}
