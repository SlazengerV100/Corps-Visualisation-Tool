import { calculateGrowth, calculateSustainability } from '../utils/calculations.js'
import { InvalidQueryError } from './InvalidQueryError.js'
import { NotFoundError } from './NotFoundError.js'

/**
 * @typedef {import('../stores/mission/MissionStore.js').MissionStore} MissionStore
 * @typedef {import('../stores/finance/FinanceStore.js').FinanceStore} FinanceStore
 * @typedef {import('../stores/directory/CorpsDirectory.js').CorpsDirectory} CorpsDirectory
 * @typedef {import('../domain/Catalogue.js').Catalogue} Catalogue
 * @typedef {import('../domain/Corps.js').Corps} Corps
 * @typedef {import('../domain/FinancialYear.js').FinancialYear} FinancialYear
 * @typedef {import('../domain/Metric.js').Granularity} Granularity
 * @typedef {import('../domain/Metric.js').MetricDefinition} MetricDefinition
 * @typedef {import('../domain/Metric.js').MetricName} MetricName
 * @typedef {import('../domain/MissionIndicator.js').MissionIndicator} MissionIndicator
 * @typedef {import('../domain/MissionIndicator.js').MissionIndicators} MissionIndicators
 * @typedef {import('../domain/MonthlyPoint.js').MonthlyPoint} MonthlyPoint
 * @typedef {import('../domain/Snapshot.js').Snapshot} Snapshot
 * @typedef {import('../domain/Snapshot.js').YearPair} YearPair
 * @typedef {import('../domain/YearlyPoint.js').YearlyPoint} YearlyPoint
 */

/**
 * @typedef {Object} Metric
 * @property {MetricDefinition} definition
 * @property {Map<string, YearlyPoint[]>} yearlyByCorps
 * @property {((centreId: string, year: FinancialYear) => MonthlyPoint[]) | null} monthly
 */

/**
 * @param {FinancialYear[]} years
 * @param {FinancialYear | undefined} year
 */
const outOfRange = (years, year) => year !== undefined && (years.length === 0 || year < years[0] || year > years[years.length - 1])

/**
 * Combines the mission, finance and directory stores into the views the API serves, computed once at construction.
 */
export class CorpsInsights {
    /**
     * @param {MissionStore} mission
     * @param {FinanceStore} finance
     * @param {CorpsDirectory} directory
     */
    constructor(mission, finance, directory) {
        /**
         * @param {MissionIndicator} indicator
         * @returns {(centreId: string, year: FinancialYear) => number | null}
         */
        const monthlyAverage = (indicator) => (centreId, year) => {
            const points = mission.monthly(centreId, year, indicator)
            return points.length ? points.reduce((sum, p) => sum + p.metric, 0) / points.length : null
        }

        /**
         * @param {MissionIndicator} indicator
         * @returns {(centreId: string, year: FinancialYear) => MonthlyPoint[]}
         */
        const monthlyIndicator = (indicator) => (centreId, year) => mission.monthly(centreId, year, indicator)

        /** @type {{ name: MetricName, label: string, yearly: (centreId: string, year: FinancialYear) => number | null, monthly: ((centreId: string, year: FinancialYear) => MonthlyPoint[]) | null }[]} */
        const sources = [
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

        const years = [...new Set([...mission.years(), ...finance.years()])].sort((a, b) => a - b)
        const centreIds = [...new Set([...mission.corps(), ...finance.corps()].map(c => c.id))]

        /** @type {Map<string, Metric>} */
        this.metrics = new Map(sources.map(source => {
            /** @type {Map<string, YearlyPoint[]>} */
            const yearlyByCorps = new Map()
            /** @type {Set<FinancialYear>} */
            const metricYears = new Set()
            for (const centreId of centreIds) {
                /** @type {YearlyPoint[]} */
                const points = []
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
            /** @type {Granularity[]} */
            const granularities = source.monthly ? ['year', 'month'] : ['year']
            return [source.name, {
                definition: {
                    name: source.name,
                    label: source.label,
                    granularities,
                    years: [...metricYears].sort((a, b) => a - b)
                },
                yearlyByCorps,
                monthly: source.monthly
            }]
        }))

        const financeYears = new Set(finance.years())

        /** @type {Map<FinancialYear, Snapshot[]>} */
        this.snapshotsByYear = new Map()
        for (const year of mission.years()) {
            /** @type {Snapshot[]} */
            const snapshots = []
            for (const { id, name } of mission.corps()) {
                const current = mission.yearly(id, year)
                const previous = mission.yearly(id, year - 1)
                if (!current && !previous) {
                    continue
                }

                /**
                 * @param {MissionIndicator} indicator
                 * @param {number | null} missing
                 * @returns {YearPair}
                 */
                const pair = (indicator, missing) => ({
                    currentYear: current?.[indicator] ?? missing,
                    prevYear: previous?.[indicator] ?? missing
                })

                const worship = pair('congregationalWorship', null)
                const currentTithing = finance.tithing(id, year)
                const tithing = currentTithing === null ? null : { currentYear: currentTithing, prevYear: finance.tithing(id, year - 1) ?? 0 }

                /** @type {Snapshot} */
                const snapshot = {
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
                    const growth = calculateGrowth({ congregationalWorship: worship })
                    if (growth !== null) {
                        snapshot.scores = {
                            growth,
                            sustainability: calculateSustainability({ tithing }, worship.currentYear),
                            size: worship.currentYear
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

        /** @type {Catalogue} */
        this.catalogueView = {
            metrics: [...this.metrics.values()].map(m => m.definition),
            snapshots: {
                years: snapshotYears,
                scoredYears: snapshotYears.filter(y => this.snapshotsByYear.get(y)?.some(s => s.scores))
            }
        }

        /** @type {Corps[]} */
        this.mappableCorps = directory.all().filter(c => c.lat !== null && c.lng !== null)
    }

    /**
     * Every registered metric with its granularities and years, plus the years with snapshots and with scores.
     * @returns {Catalogue}
     */
    catalogue() {
        return this.catalogueView
    }

    /**
     * Corps from the directory that have coordinates.
     * @returns {Corps[]}
     */
    corps() {
        return this.mappableCorps
    }

    /**
     * One corps' points for a metric, by year or by month, optionally limited to one financial year.
     * @param {string} centreId
     * @param {string} metricName
     * @param {{ granularity?: Granularity, year?: FinancialYear }} [filters]
     * @returns {YearlyPoint[] | MonthlyPoint[]} Throws InvalidQueryError for an invalid filter, NotFoundError when there is no data
     */
    series(centreId, metricName, { granularity = 'year', year } = {}) {
        const metric = this.metrics.get(metricName)
        if (!metric) {
            throw new InvalidQueryError(`Unknown metric ${metricName}`)
        }
        if (outOfRange(metric.definition.years, year)) {
            throw new InvalidQueryError(`${metricName} has no data for ${year}`)
        }

        /** @type {YearlyPoint[] | MonthlyPoint[]} */
        let points
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
     * @param {{ year?: FinancialYear, scored?: boolean }} [filters]
     * @returns {Snapshot[]} Throws InvalidQueryError for a year outside the snapshot years
     */
    snapshots({ year, scored = false } = {}) {
        if (outOfRange(this.catalogueView.snapshots.years, year)) {
            throw new InvalidQueryError(`No snapshots for ${year}`)
        }
        const snapshots = year === undefined ? [...this.snapshotsByYear.values()].flat() : this.snapshotsByYear.get(year) ?? []
        return scored ? snapshots.filter(s => s.scores) : snapshots
    }
}
