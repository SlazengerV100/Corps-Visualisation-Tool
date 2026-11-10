import type { FinancialYear } from '../models/FinancialYear.ts'
import type { MetricName } from '../models/Metric.ts'
import type { Match, MetricProjection, ProjectedMetricName, ProjectedPoint, Projection } from '../models/Projection.ts'
import type { YearlyPoint } from '../models/YearlyPoint.ts'

// A window of years is matched on, and projected as many years ahead
export const windowYearOptions = [5]
export const defaultWindowYears = 5
const maxMatches = 3
// A placeholder until the threshold is tuned against real matches
const minSimilarity = 50
// A projection averages at least two matches' figures
const minFigures = 2
// SAMIS cannot tell a figure left blank from a real zero, so its zeros count as missing
const samisMetrics = new Set<MetricName>(['congregationalWorship', 'firstTimeDecisions', 'kidsChurch', 'youthDiscipleship'])
// Projected by the ratio their matches moved by; surplus/deficit can be zero or negative, so it follows worship instead
const ratioMetrics = ['congregationalWorship', 'kidsChurch', 'youthDiscipleship', 'tithing'] as const
// The cone holds the middle 80% of how far past projections were from what happened
const coneQuantiles = { low: 0.1, high: 0.9 }

/**
 * Whether a metric is projected; first-time decisions only inform the overall matches.
 */
export const isProjected = (name: MetricName): name is ProjectedMetricName => name !== 'firstTimeDecisions'

type Figures = Map<MetricName, Map<string, Map<FinancialYear, number>>>

type Corps = Map<string, { name: string, region: string | null }>

export type TrendIndex = Map<string, Map<MetricName, Map<FinancialYear, number>>>

export type BacktestErrors = Map<ProjectedMetricName, Map<number, number[]>>

interface Window {
    id: string
    end: FinancialYear
    features: Map<MetricName, (number | null)[]>
}

interface WeightedMatch extends Window {
    weight: number
}

const recorded = (yearlyByMetric: Map<MetricName, Map<string, YearlyPoint[]>>): Figures =>
    new Map([...yearlyByMetric].map(([name, byCorps]) => [name, new Map([...byCorps].map(([id, points]) => [
        id,
        new Map(points.filter(p => !(samisMetrics.has(name) && p.metric === 0)).map(p => [p.year, p.metric]))
    ]))]))

/**
 * Index each region's figures year on year by the change in their total across the corps recorded in both years, so corps opening or closing don't move it.
 * @returns An index for every metric but surplus/deficit, which can be zero or negative; a year no corps shares with the one before keeps that year's index
 */
export function trendIndex(yearlyByMetric: Map<MetricName, Map<string, YearlyPoint[]>>, corps: Corps): TrendIndex {
    const figures = recorded(yearlyByMetric)
    const regions = [...new Set([...corps.values()].flatMap(c => c.region === null ? [] : [c.region]))]
    return new Map(regions.map(region => [region, new Map([...figures].filter(([name]) => name !== 'surplusDeficit').map(([name, byCorps]) => {
        const inRegion = [...byCorps].filter(([id]) => corps.get(id)?.region === region).map(([, byYear]) => byYear)
        const years = inRegion.flatMap(byYear => [...byYear.keys()])
        const index = new Map<FinancialYear, number>()
        if (!years.length) {
            return [name, index]
        }
        let level = 1
        for (let year = Math.min(...years); year <= Math.max(...years); year++) {
            let now = 0
            let before = 0
            for (const byYear of inRegion) {
                const current = byYear.get(year)
                const previous = byYear.get(year - 1)
                if (current !== undefined && previous !== undefined) {
                    now += current
                    before += previous
                }
            }
            if (before > 0 && now > 0) {
                level *= now / before
            }
            index.set(year, level)
        }
        return [name, index]
    }))]))
}

/**
 * Match each corps' latest window of years to the closest earlier windows, its own included, across all metrics and on each metric alone, and project each metric by what followed its own matches.
 * Figures are compared and moved relative to their region's index, which is held at its latest level into the future.
 * @param yearlyByMetric - Each metric's yearly figures by centre code
 * @param corps - Each corps' name and region by centre code; a corps only matches corps in its own region
 * @param windowYears - How many years a window covers, ending in the corps' latest year of worship, and how many years ahead to project
 * @param index - Each region's index, from trendIndex; a year or metric missing from it counts as 1
 * @returns A projection for each corps with worship in every year of its latest window, with no points for a metric nothing matched closely enough on, banded by the matches' weighted spread
 */
export function projectFromSimilarCorps(yearlyByMetric: Map<MetricName, Map<string, YearlyPoint[]>>, corps: Corps, windowYears: number, index: TrendIndex): Map<string, Projection> {
    const figures = recorded(yearlyByMetric)
    const figure = (name: MetricName, id: string, year: FinancialYear) => figures.get(name)?.get(id)?.get(year) ?? null
    const indexAt = (name: MetricName, id: string, year: FinancialYear) => index.get(corps.get(id)?.region ?? '')?.get(name)?.get(year) ?? 1
    const indexed = (name: MetricName, id: string, year: FinancialYear) => {
        const value = figure(name, id, year)
        return value === null ? null : value / indexAt(name, id, year)
    }
    const metricNames = [...figures.keys()]

    // asinh compresses large figures like a log while keeping zeros and deficits, then each metric is standardised so all weigh alike
    const scales = new Map(metricNames.map(name => {
        const values = [...figures.get(name) ?? []].flatMap(([id, byYear]) => [...byYear.keys()].map(year => Math.asinh(indexed(name, id, year) ?? 0)))
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length
        const spread = Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length)
        return [name, { mean, spread: spread || 1 }]
    }))
    const standardised = (name: MetricName, id: string, year: FinancialYear) => {
        const value = indexed(name, id, year)
        const scale = scales.get(name)
        return value === null || !scale ? null : (Math.asinh(value) - scale.mean) / scale.spread
    }

    const worship = figures.get('congregationalWorship') ?? new Map<string, Map<FinancialYear, number>>()
    const latestYear = new Map([...worship].map(([id, byYear]) => [id, Math.max(...byYear.keys())]))
    const windows: Window[] = []
    for (const [id, byYear] of worship) {
        for (const end of byYear.keys()) {
            const years = Array.from({ length: windowYears }, (_, i) => end - windowYears + 1 + i)
            if (years.every(year => byYear.has(year))) {
                windows.push({ id, end, features: new Map(metricNames.map(name => [name, years.map(year => standardised(name, id, year))])) })
            }
        }
    }

    // Root mean square over the given metrics' figures both windows have, or no distance when they share fewer than asked
    const distance = (a: Window, b: Window, names: MetricName[], minShared: number) => {
        let sum = 0
        let count = 0
        for (const name of names) {
            const others = b.features.get(name) ?? []
            a.features.get(name)?.forEach((value, i) => {
                const other = others[i]
                if (value !== null && other !== null) {
                    sum += (value - other) ** 2
                    count++
                }
            })
        }
        return count >= Math.max(minShared, 1) ? Math.sqrt(sum / count) : null
    }

    const project = (matches: WeightedMatch[], target: Window, sample: (match: WeightedMatch, year: FinancialYear) => number | null, canBeNegative: boolean): ProjectedPoint[] => {
        const points: ProjectedPoint[] = []
        for (let ahead = 1; ahead <= windowYears; ahead++) {
            const samples = matches.flatMap(match => {
                const value = sample(match, match.end + ahead)
                return value === null ? [] : [{ weight: match.weight, value }]
            })
            if (samples.length < minFigures) {
                continue
            }
            const total = samples.reduce((sum, s) => sum + s.weight, 0)
            const mean = samples.reduce((sum, s) => sum + s.weight * s.value, 0) / total
            const spread = Math.sqrt(samples.reduce((sum, s) => sum + s.weight * (s.value - mean) ** 2, 0) / total)
            points.push({ year: target.end + ahead, metric: mean, low: canBeNegative ? mean - spread : Math.max(mean - spread, 0), high: mean + spread })
        }
        return points
    }

    // Only a window followed by worship in each of as many years as it covers shows what followed for the whole projection; this also keeps a corps' own from overlapping its latest
    const followedThrough = windows.filter(w => Array.from({ length: windowYears }, (_, i) => w.end + 1 + i).every(year => worship.get(w.id)?.has(year)))

    const projections = new Map<string, Projection>()
    for (const target of windows.filter(w => w.end === latestYear.get(w.id))) {
        const region = corps.get(target.id)?.region ?? null
        // An earlier window from a corps in the same region
        const candidates = region === null ? [] : followedThrough.filter(candidate =>
            candidate.end < target.end && corps.get(candidate.id)?.region === region
        )

        // Across all metrics, worship guarantees a full window of shared figures; on one metric alone, both windows need it in every year
        const closestOn = (names: MetricName[]) => {
            const minShared = names.length === 1 ? windowYears : 1
            const closest = new Map<string, WeightedMatch>()
            for (const candidate of candidates) {
                const apart = distance(target, candidate, names, minShared)
                const weight = apart === null ? 0 : 100 / (1 + apart)
                if (weight >= minSimilarity && weight > (closest.get(candidate.id)?.weight ?? 0)) {
                    closest.set(candidate.id, { ...candidate, weight })
                }
            }
            return [...closest.values()].toSorted((a, b) => b.weight - a.weight).slice(0, maxMatches)
        }

        const describe = (match: WeightedMatch): Match => ({ id: match.id, name: corps.get(match.id)?.name ?? match.id, year: match.end, similarity: Math.round(match.weight) })

        // How far a match moved relative to its region's index, from the end of its window to a year ahead or behind it
        const relativeChange = (name: MetricName, match: WeightedMatch, year: FinancialYear) => {
            const from = indexed(name, match.id, match.end)
            const to = indexed(name, match.id, year)
            return from === null || from <= 0 || to === null ? null : to / from
        }

        // A match's window and what followed, moved onto the target's years and its region's index, held at its latest level ahead, and scaled to its level; surplus/deficit scales by worship
        const followed = (match: WeightedMatch, name: ProjectedMetricName): YearlyPoint[] => {
            const scaleBy = name === 'surplusDeficit' ? 'congregationalWorship' : name
            const base = figure(scaleBy, target.id, target.end)
            const from = indexed(scaleBy, match.id, match.end)
            if (base === null || from === null || from <= 0) {
                return []
            }
            const points: YearlyPoint[] = []
            for (let ahead = 1 - windowYears; ahead <= windowYears; ahead++) {
                const value = figure(name, match.id, match.end + ahead)
                if (value !== null) {
                    const targetIndex = indexAt(scaleBy, target.id, Math.min(target.end + ahead, target.end)) / indexAt(scaleBy, target.id, target.end)
                    points.push({ year: target.end + ahead, metric: value / indexAt(scaleBy, match.id, match.end + ahead) / from * base * targetIndex })
                }
            }
            return points
        }

        // Each metric is matched on its own history and moves by the ratio its matches moved by; first-time decisions only inform the overall matches
        const byRatio = (name: ProjectedMetricName): MetricProjection => {
            const matches = closestOn([name])
            const base = figure(name, target.id, target.end)
            return {
                matches: matches.map(m => ({ ...describe(m), points: followed(m, name) })),
                points: base === null ? [] : project(matches, target, (match, year) => {
                    const change = relativeChange(name, match, year)
                    return change === null ? null : base * change
                }, false)
            }
        }

        // Surplus/deficit follows its matches' figure per worshipper, applied to the projected worship
        const projectedWorship = byRatio('congregationalWorship')
        const surplusDeficitMatches = closestOn(['surplusDeficit'])
        const surplusDeficit: MetricProjection = {
            matches: surplusDeficitMatches.map(m => ({ ...describe(m), points: followed(m, 'surplusDeficit') })),
            points: project(surplusDeficitMatches, target, (match, year) => {
                const figureThen = figure('surplusDeficit', match.id, year)
                const matchWorship = figure('congregationalWorship', match.id, year)
                const targetWorship = projectedWorship.points.find(p => p.year === year - match.end + target.end)
                return figureThen === null || matchWorship === null || !targetWorship ? null : figureThen / matchWorship * targetWorship.metric
            }, true)
        }

        projections.set(target.id, {
            window: windowYears,
            year: target.end,
            matches: closestOn(metricNames).map(describe),
            metrics: {
                congregationalWorship: projectedWorship,
                kidsChurch: byRatio('kidsChurch'),
                youthDiscipleship: byRatio('youthDiscipleship'),
                tithing: byRatio('tithing'),
                surplusDeficit
            }
        })
    }
    return projections
}

/**
 * Project from the data as it stood at the end of each past year, and record how far each projection was from what happened.
 * @returns Every miss by metric and years ahead; worship-type figures as the log of actual over projected, surplus/deficit as the difference per projected worshipper
 */
export function backtestErrors(yearlyByMetric: Map<MetricName, Map<string, YearlyPoint[]>>, corps: Corps, windowYears: number, index: TrendIndex): BacktestErrors {
    const figures = recorded(yearlyByMetric)
    const figure = (name: MetricName, id: string, year: FinancialYear) => figures.get(name)?.get(id)?.get(year) ?? null
    const years = [...figures.get('congregationalWorship')?.values() ?? []].flatMap(byYear => [...byYear.keys()])
    const errors: BacktestErrors = new Map()
    const record = (name: ProjectedMetricName, ahead: number, error: number) => {
        const byAhead = errors.get(name) ?? new Map<number, number[]>()
        byAhead.set(ahead, [...byAhead.get(ahead) ?? [], error])
        errors.set(name, byAhead)
    }
    if (!years.length) {
        return errors
    }

    for (let asOf = Math.min(...years); asOf < Math.max(...years); asOf++) {
        const knownThen = new Map([...yearlyByMetric].map(([name, byCorps]) => [name, new Map([...byCorps].map(([id, points]) => [id, points.filter(p => p.year <= asOf)]))]))
        for (const [id, projection] of projectFromSimilarCorps(knownThen, corps, windowYears, index)) {
            if (projection.year !== asOf) {
                continue
            }
            for (const name of ratioMetrics) {
                for (const point of projection.metrics[name].points) {
                    const actual = figure(name, id, point.year)
                    if (actual !== null && actual > 0 && point.metric > 0) {
                        record(name, point.year - asOf, Math.log(actual / point.metric))
                    }
                }
            }
            for (const point of projection.metrics.surplusDeficit.points) {
                const actual = figure('surplusDeficit', id, point.year)
                const worshippers = projection.metrics.congregationalWorship.points.find(p => p.year === point.year)?.metric
                if (actual !== null && worshippers) {
                    record('surplusDeficit', point.year - asOf, (actual - point.metric) / worshippers)
                }
            }
        }
    }
    return errors
}

/**
 * Widen each projected year to the middle 80% of how far past projections that many years ahead were from what happened.
 * @returns The projections with each band replaced where the backtest has misses for that metric and year ahead, and left as the matches' spread where it has none
 */
export function withBacktestCones(projections: Map<string, Projection>, errors: BacktestErrors): Map<string, Projection> {
    const sorted = new Map([...errors].map(([name, byAhead]) => [name, new Map([...byAhead].map(([ahead, misses]) => [ahead, misses.toSorted((a, b) => a - b)]))]))

    return new Map([...projections].map(([id, projection]) => {
        const worshipAt = (year: FinancialYear) => projection.metrics.congregationalWorship.points.find(p => p.year === year)?.metric
        const cone = (name: ProjectedMetricName, point: ProjectedPoint): ProjectedPoint => {
            const misses = sorted.get(name)?.get(point.year - projection.year)
            if (!misses?.length) {
                return point
            }
            const [low, high] = [coneQuantiles.low, coneQuantiles.high].map(q => misses[Math.round(q * (misses.length - 1))])
            if (name !== 'surplusDeficit') {
                return { ...point, low: point.metric * Math.exp(low), high: point.metric * Math.exp(high) }
            }
            const worshippers = worshipAt(point.year)
            return worshippers === undefined ? point : { ...point, low: point.metric + low * worshippers, high: point.metric + high * worshippers }
        }
        const coned = (name: ProjectedMetricName): MetricProjection => ({
            ...projection.metrics[name],
            points: projection.metrics[name].points.map(point => cone(name, point))
        })
        return [id, {
            ...projection,
            metrics: {
                congregationalWorship: coned('congregationalWorship'),
                kidsChurch: coned('kidsChurch'),
                youthDiscipleship: coned('youthDiscipleship'),
                tithing: coned('tithing'),
                surplusDeficit: coned('surplusDeficit')
            }
        }]
    }))
}
