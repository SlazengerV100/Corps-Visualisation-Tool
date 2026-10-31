import { calculateGrowth, calculateSustainability } from '../utils/calculations.ts'
import { InvalidQueryError } from './InvalidQueryError.ts'
import { NotFoundError } from './NotFoundError.ts'
import type { MissionRepository } from '../repositories/mission/MissionRepository.ts'
import type { FinanceRepository } from '../repositories/finance/FinanceRepository.ts'
import type { CorpsDirectoryRepository } from '../repositories/directory/CorpsDirectoryRepository.ts'
import type { Catalogue } from '../models/Catalogue.ts'
import type { Corps } from '../models/Corps.ts'
import type { FinancialYear } from '../models/FinancialYear.ts'
import type { Granularity, MetricDefinition, MetricName } from '../models/Metric.ts'
import type { MissionIndicator } from '../models/MissionIndicator.ts'
import type { MonthlyPoint } from '../models/MonthlyPoint.ts'
import type { Snapshot, YearPair } from '../models/Snapshot.ts'
import type { YearlyPoint } from '../models/YearlyPoint.ts'

type YearlyFigure = (centreId: string, year: FinancialYear) => number | null

type MonthlySeries = (centreId: string, year: FinancialYear) => MonthlyPoint[]

interface Metric {
    definition: MetricDefinition
    yearlyByCorps: Map<string, YearlyPoint[]>
    monthly: MonthlySeries | null
}

const outOfRange = (years: FinancialYear[], year: FinancialYear | undefined) => year !== undefined && (years.length === 0 || year < years[0] || year > years[years.length - 1])

/**
 * Combines the mission, finance and directory repositories into the views the API serves, computed once at construction.
 */
export class CorpsInsights {
    private readonly metrics: Map<string, Metric>
    private readonly snapshotsByYear: Map<FinancialYear, Snapshot[]>
    private readonly catalogueView: Catalogue
    private readonly mappableCorps: Corps[]

    constructor(mission: MissionRepository, finance: FinanceRepository, directory: CorpsDirectoryRepository) {
        const monthlyAverage = (indicator: MissionIndicator): YearlyFigure => (centreId, year) => {
            const points = mission.monthly(centreId, year, indicator)
            return points.length ? points.reduce((sum, p) => sum + p.metric, 0) / points.length : null
        }

        const monthlyIndicator = (indicator: MissionIndicator): MonthlySeries => (centreId, year) => mission.monthly(centreId, year, indicator)

        const sources: { name: MetricName, label: string, yearly: YearlyFigure, monthly: MonthlySeries | null }[] = [
            {
                name: 'congregationalWorship',
                label: 'Congregational Worship',
                yearly: monthlyAverage('congregationalWorship'),
                monthly: monthlyIndicator('congregationalWorship')
            },
            {
                name: 'firstTimeDecisions',
                label: 'First Time Decisions',
                yearly: (centreId, year) => {
                    const indicators = mission.yearly(centreId, year)
                    return indicators && (indicators.congregationalWorship ?? 0) > 0 ? indicators.firstTimeDecisions ?? 0 : null
                },
                monthly: null
            },
            {
                name: 'kidsChurch',
                label: 'Kid\'s Church',
                yearly: monthlyAverage('kidsChurch'),
                monthly: monthlyIndicator('kidsChurch')
            },
            {
                name: 'youthDiscipleship',
                label: 'Youth Discipleship',
                yearly: monthlyAverage('youthDiscipleship'),
                monthly: monthlyIndicator('youthDiscipleship')
            },
            {
                name: 'tithing',
                label: 'Tithing',
                yearly: (centreId, year) => finance.tithing(centreId, year),
                monthly: (centreId, year) => finance.monthlyTithing(centreId, year)
            },
            {
                name: 'surplusDeficit',
                label: 'Surplus/Deficit',
                yearly: (centreId, year) => finance.surplusDeficit(centreId, year),
                monthly: null
            }
        ]

        const years = [...new Set([...mission.years(), ...finance.years()])].toSorted((a, b) => a - b)
        const centreIds = [...new Set([...mission.corps(), ...finance.corps()].map(c => c.id))]

        this.metrics = new Map(sources.map(source => {
            const yearlyByCorps = new Map<string, YearlyPoint[]>()
            const metricYears = new Set<FinancialYear>()
            for (const centreId of centreIds) {
                const points: YearlyPoint[] = []
                for (const year of years) {
                    const metric = source.yearly(centreId, year)
                    if (metric !== null) {
                        points.push({ year, metric })
                        metricYears.add(year)
                    }
                }
                if (points.length) {
                    yearlyByCorps.set(centreId, points)
                }
            }
            const granularities: Granularity[] = source.monthly ? ['year', 'month'] : ['year']
            return [source.name, {
                definition: {
                    name: source.name,
                    label: source.label,
                    granularities,
                    years: [...metricYears].toSorted((a, b) => a - b)
                },
                yearlyByCorps,
                monthly: source.monthly
            }]
        }))

        const financeYears = new Set(finance.years())

        this.snapshotsByYear = new Map()
        for (const year of mission.years()) {
            const snapshots: Snapshot[] = []
            for (const { id, name } of mission.corps()) {
                const current = mission.yearly(id, year)
                const previous = mission.yearly(id, year - 1)
                if (!current && !previous) {
                    continue
                }

                const pair = (indicator: MissionIndicator, missing: number | null): YearPair => ({
                    currentYear: current?.[indicator] ?? missing,
                    prevYear: previous?.[indicator] ?? missing
                })

                const worship = pair('congregationalWorship', null)
                const currentTithing = finance.tithing(id, year)
                const tithing = currentTithing === null ? null : { currentYear: currentTithing, prevYear: finance.tithing(id, year - 1) ?? 0 }

                const snapshot: Snapshot = {
                    id,
                    name,
                    year,
                    metrics: {
                        congregationalWorship: worship,
                        firstTimeDecisions: pair('firstTimeDecisions', 0),
                        kidsChurch: pair('kidsChurch', null),
                        youthDiscipleship: pair('youthDiscipleship', null),
                        tithing,
                        surplusDeficit: finance.surplusDeficit(id, year),
                        population: directory.population(id, year)
                    }
                }

                if (tithing && financeYears.has(year - 1) && worship.currentYear !== null && worship.prevYear !== null && worship.prevYear !== 0) {
                    const growth = calculateGrowth(snapshot.metrics)
                    if (growth !== null) {
                        const sustainability = calculateSustainability({ tithing, surplusDeficit: snapshot.metrics.surplusDeficit }, worship.currentYear)
                        snapshot.scores = {
                            growth: growth.score,
                            sustainability: sustainability.score,
                            size: worship.currentYear,
                            breakdown: { growth: growth.breakdown, sustainability: sustainability.breakdown }
                        }
                    }
                }

                snapshots.push(snapshot)
            }
            if (snapshots.length) {
                this.snapshotsByYear.set(year, snapshots)
            }
        }

        const snapshotYears = [...this.snapshotsByYear.keys()]

        this.catalogueView = {
            metrics: [...this.metrics.values()].map(m => m.definition),
            snapshots: {
                years: snapshotYears,
                scoredYears: snapshotYears.filter(y => this.snapshotsByYear.get(y)?.some(s => s.scores))
            }
        }

        this.mappableCorps = directory.all().filter(c => c.lat !== null && c.lng !== null)
    }

    /**
     * Every registered metric with its granularities and years, plus the years with snapshots and with scores.
     */
    catalogue(): Catalogue {
        return this.catalogueView
    }

    /**
     * Corps from the directory that have coordinates.
     */
    corps(): Corps[] {
        return this.mappableCorps
    }

    /**
     * One corps' points for a metric, by year or by month, optionally limited to one financial year.
     * @returns Throws InvalidQueryError for an invalid filter, NotFoundError when there is no data
     */
    series(centreId: string, metricName: string, { granularity = 'year', year }: { granularity?: Granularity, year?: FinancialYear } = {}): YearlyPoint[] | MonthlyPoint[] {
        const metric = this.metrics.get(metricName)
        if (!metric) {
            throw new InvalidQueryError(`Unknown metric ${metricName}`)
        }
        if (outOfRange(metric.definition.years, year)) {
            throw new InvalidQueryError(`${metricName} has no data for ${year}`)
        }

        let points: YearlyPoint[] | MonthlyPoint[]
        if (granularity === 'year') {
            points = (metric.yearlyByCorps.get(centreId) ?? []).filter(p => year === undefined || p.year === year)
        } else if (metric.monthly) {
            const monthly = metric.monthly
            points = (year === undefined ? metric.definition.years : [year]).flatMap(y => monthly(centreId, y))
        } else {
            throw new InvalidQueryError(`${metricName} has no ${granularity} data`)
        }

        if (!points.length) {
            throw new NotFoundError(`${metricName} is not available for corps ${centreId}`)
        }
        return points
    }

    /**
     * Per-corps records for every year, or one year, optionally only those with growth and sustainability scores.
     * @returns Throws InvalidQueryError for a year outside the snapshot years
     */
    snapshots({ year, scored = false }: { year?: FinancialYear, scored?: boolean } = {}): Snapshot[] {
        if (outOfRange(this.catalogueView.snapshots.years, year)) {
            throw new InvalidQueryError(`No snapshots for ${year}`)
        }
        const snapshots = year === undefined ? [...this.snapshotsByYear.values()].flat() : this.snapshotsByYear.get(year) ?? []
        return scored ? snapshots.filter(s => s.scores) : snapshots
    }
}
