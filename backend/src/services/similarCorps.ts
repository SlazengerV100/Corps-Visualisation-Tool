import type { FinancialYear } from '../models/FinancialYear.ts'
import type { MetricName } from '../models/Metric.ts'
import type { Match, MetricProjection, ProjectedMetricName, ProjectedPoint, Projection } from '../models/Projection.ts'
import type { YearlyPoint } from '../models/YearlyPoint.ts'

// A window of years is matched on, fitted, and projected as many years ahead
export const windowYearOptions = [5]
export const defaultWindowYears = 5
const maxMatches = 3
// A placeholder until the threshold is tuned against real matches
const minSimilarity = 50
// SAMIS cannot tell a figure left blank from a real zero, so its zeros count as missing
const samisMetrics = new Set<MetricName>(['congregationalWorship', 'firstTimeDecisions', 'kidsChurch', 'youthDiscipleship'])
// Student's t 90th percentile by degrees of freedom, for an 80% prediction interval; the normal distribution's beyond the table
const tFor80 = new Map([[1, 3.078], [2, 1.886], [3, 1.638], [4, 1.533], [5, 1.476], [6, 1.440], [7, 1.415], [8, 1.397]])
const zFor80 = 1.282

/**
 * Whether a metric is projected; first-time decisions only inform the overall matches.
 */
export const isProjected = (name: MetricName): name is ProjectedMetricName => name !== 'firstTimeDecisions'

type Figures = Map<MetricName, Map<string, Map<FinancialYear, number>>>

type Corps = Map<string, { name: string, region: string | null }>

export type TrendIndex = Map<string, Map<MetricName, Map<FinancialYear, number>>>

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
 * Fit a straight line by least squares.
 * @returns The slope, and the half-width of the 80% prediction interval at a given x, which is zero from fewer than three points
 */
const fitLine = (points: { x: number, y: number }[]) => {
    const n = points.length
    const meanX = points.reduce((sum, p) => sum + p.x, 0) / n
    const meanY = points.reduce((sum, p) => sum + p.y, 0) / n
    const sxx = points.reduce((sum, p) => sum + (p.x - meanX) ** 2, 0)
    const slope = points.reduce((sum, p) => sum + (p.x - meanX) * (p.y - meanY), 0) / sxx
    const intercept = meanY - slope * meanX
    const degrees = n - 2
    const scatter = degrees > 0 ? Math.sqrt(points.reduce((sum, p) => sum + (p.y - intercept - slope * p.x) ** 2, 0) / degrees) : 0
    const t = tFor80.get(degrees) ?? zFor80
    return {
        slope,
        halfWidth: (x: number) => t * scatter * Math.sqrt(1 + 1 / n + (x - meanX) ** 2 / sxx)
    }
}

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
 * Project each metric from the trend of the corps' own latest window of years, and find the corps whose earlier windows most resemble it, across all metrics and on each metric alone.
 * Similar corps are compared against their region's index, so a year counts by how a corps stood against everyone else then, and are shown alongside rather than used in the projection.
 * @param yearlyByMetric - Each metric's yearly figures by centre code
 * @param corps - Each corps' name and region by centre code; a corps only matches corps in its own region
 * @param windowYears - How many years a window covers, ending in the corps' latest year of worship, and how many years ahead to project
 * @param index - Each region's index, from trendIndex; a year or metric missing from it counts as 1
 * @returns A projection for each corps with worship in every year of its latest window, with no points for a metric missing from any year of it
 */
export function projectFromSimilarCorps(yearlyByMetric: Map<MetricName, Map<string, YearlyPoint[]>>, corps: Corps, windowYears: number, index: TrendIndex): Map<string, Projection> {
    const figures = recorded(yearlyByMetric)
    const figure = (name: MetricName, id: string, year: FinancialYear) => figures.get(name)?.get(id)?.get(year) ?? null
    const indexed = (name: MetricName, id: string, year: FinancialYear) => {
        const value = figure(name, id, year)
        return value === null ? null : value / (index.get(corps.get(id)?.region ?? '')?.get(name)?.get(year) ?? 1)
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

    // Only a window followed by worship in each of as many years as it covers shows what followed for the whole projection; this also keeps a corps' own from overlapping its latest
    const followedThrough = windows.filter(w => Array.from({ length: windowYears }, (_, i) => w.end + 1 + i).every(year => worship.get(w.id)?.has(year)))

    const projections = new Map<string, Projection>()
    for (const target of windows.filter(w => w.end === latestYear.get(w.id))) {
        const region = corps.get(target.id)?.region ?? null
        // An earlier window from a corps in the same region
        const candidates = region === null ? [] : followedThrough.filter(candidate =>
            candidate.end < target.end && corps.get(candidate.id)?.region === region
        )
        const windowOf = (name: MetricName) => Array.from({ length: windowYears }, (_, i) => target.end - windowYears + 1 + i).map(year => ({ x: year, value: figure(name, target.id, year) }))

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

        // A match's window and what followed, moved onto the target's years and scaled to its level at the end of the window; surplus/deficit scales by worship
        const followed = (match: WeightedMatch, name: ProjectedMetricName): YearlyPoint[] => {
            const scaleBy = name === 'surplusDeficit' ? 'congregationalWorship' : name
            const base = figure(scaleBy, target.id, target.end)
            const from = figure(scaleBy, match.id, match.end)
            if (base === null || from === null || from <= 0) {
                return []
            }
            const points: YearlyPoint[] = []
            for (let ahead = 1 - windowYears; ahead <= windowYears; ahead++) {
                const value = figure(name, match.id, match.end + ahead)
                if (value !== null) {
                    points.push({ year: target.end + ahead, metric: value * base / from })
                }
            }
            return points
        }
        const matchedOn = (name: ProjectedMetricName) => closestOn([name]).map(m => ({ ...describe(m), points: followed(m, name) }))

        // A line through the log of the corps' figure in every year of its window, carried on from its latest figure, banded by the fit's prediction interval
        const proportional = (name: ProjectedMetricName): ProjectedPoint[] => {
            const window = windowOf(name)
            const latest = window[window.length - 1].value
            if (latest === null || window.some(p => p.value === null || p.value <= 0)) {
                return []
            }
            const fit = fitLine(window.map(p => ({ x: p.x, y: Math.log(p.value ?? 1) })))
            return Array.from({ length: windowYears }, (_, i) => {
                const year = target.end + 1 + i
                const metric = latest * Math.exp(fit.slope * (year - target.end))
                const margin = fit.halfWidth(year)
                return { year, metric, low: metric * Math.exp(-margin), high: metric * Math.exp(margin) }
            })
        }

        // Surplus/deficit per worshipper, fitted as is since it can be zero or negative, applied to the projected worship
        const worshipPoints = proportional('congregationalWorship')
        const perWorshipper = (): ProjectedPoint[] => {
            const surplusDeficits = windowOf('surplusDeficit')
            const worshippers = windowOf('congregationalWorship')
            const window = surplusDeficits.map((p, i) => ({ x: p.x, value: p.value === null || worshippers[i].value === null ? null : p.value / (worshippers[i].value ?? 1) }))
            const latest = window[window.length - 1].value
            if (latest === null || window.some(p => p.value === null)) {
                return []
            }
            const fit = fitLine(window.map(p => ({ x: p.x, y: p.value ?? 0 })))
            return worshipPoints.map(({ year, metric: worshippersThen }) => {
                const metric = (latest + fit.slope * (year - target.end)) * worshippersThen
                const margin = fit.halfWidth(year) * worshippersThen
                return { year, metric, low: metric - margin, high: metric + margin }
            })
        }

        projections.set(target.id, {
            window: windowYears,
            year: target.end,
            matches: closestOn(metricNames).map(describe),
            metrics: {
                congregationalWorship: { matches: matchedOn('congregationalWorship'), points: worshipPoints },
                kidsChurch: { matches: matchedOn('kidsChurch'), points: proportional('kidsChurch') },
                youthDiscipleship: { matches: matchedOn('youthDiscipleship'), points: proportional('youthDiscipleship') },
                tithing: { matches: matchedOn('tithing'), points: proportional('tithing') },
                surplusDeficit: { matches: matchedOn('surplusDeficit'), points: perWorshipper() }
            } satisfies Record<ProjectedMetricName, MetricProjection>
        })
    }
    return projections
}
