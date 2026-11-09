import type { FinancialYear } from '../models/FinancialYear.ts'
import type { MetricName } from '../models/Metric.ts'
import type { Match, ProjectedPoint, Projection } from '../models/Projection.ts'
import type { YearlyPoint } from '../models/YearlyPoint.ts'

export const windowYearOptions = [1, 2, 3, 4, 5]
export const defaultWindowYears = 3
const maxMatches = 3
// A placeholder until the threshold is tuned against real matches
const minSimilarity = 50
const horizonYears = 5
// A margin for error needs at least two figures to spread across
const minFigures = 2
// SAMIS cannot tell a figure left blank from a real zero, so its zeros count as missing
const samisMetrics = new Set<MetricName>(['congregationalWorship', 'firstTimeDecisions', 'kidsChurch', 'youthDiscipleship'])

interface Window {
    id: string
    end: FinancialYear
    features: (number | null)[]
}

interface WeightedMatch extends Window {
    weight: number
}

/**
 * Match each corps' latest window of years to the closest earlier windows of other corps, and project every metric by what followed them.
 * @param yearlyByMetric - Each metric's yearly figures by centre code
 * @param corps - Each corps' name and region by centre code; a corps only matches others in its own region
 * @param windowYears - How many years a window covers, ending in the corps' latest year of worship
 * @returns A projection for each corps with worship in every year of its latest window, with no points when nothing matched closely enough
 */
export function projectFromSimilarCorps(yearlyByMetric: Map<MetricName, Map<string, YearlyPoint[]>>, corps: Map<string, { name: string, region: string | null }>, windowYears: number): Map<string, Projection> {
    const figures = new Map([...yearlyByMetric].map(([name, byCorps]) => [name, new Map([...byCorps].map(([id, points]) => [
        id,
        new Map(points.filter(p => !(samisMetrics.has(name) && p.metric === 0)).map(p => [p.year, p.metric]))
    ]))]))
    const figure = (name: MetricName, id: string, year: FinancialYear) => figures.get(name)?.get(id)?.get(year) ?? null
    const metricNames = [...figures.keys()]

    // asinh compresses large figures like a log while keeping zeros and deficits, then each metric is standardised so all weigh alike
    const scales = new Map(metricNames.map(name => {
        const values = [...figures.get(name)?.values() ?? []].flatMap(byYear => [...byYear.values()].map(Math.asinh))
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length
        const spread = Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length)
        return [name, { mean, spread: spread || 1 }]
    }))
    const standardised = (name: MetricName, id: string, year: FinancialYear) => {
        const value = figure(name, id, year)
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
                windows.push({ id, end, features: metricNames.flatMap(name => years.map(year => standardised(name, id, year))) })
            }
        }
    }

    // Root mean square over the figures both windows have; worship is always among them
    const distance = (a: Window, b: Window) => {
        let sum = 0
        let count = 0
        a.features.forEach((value, i) => {
            const other = b.features[i]
            if (value !== null && other !== null) {
                sum += (value - other) ** 2
                count++
            }
        })
        return Math.sqrt(sum / count)
    }

    const project = (matches: WeightedMatch[], target: Window, sample: (match: WeightedMatch, year: FinancialYear) => number | null, canBeNegative: boolean): ProjectedPoint[] => {
        const points: ProjectedPoint[] = []
        for (let ahead = 1; ahead <= horizonYears; ahead++) {
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

    const projections = new Map<string, Projection>()
    for (const target of windows.filter(w => w.end === latestYear.get(w.id))) {
        const region = corps.get(target.id)?.region ?? null
        const closest = new Map<string, WeightedMatch>()
        for (const candidate of windows) {
            // Only an earlier window with a later year, from another corps in the same region, shows what followed
            if (candidate.id === target.id || candidate.end >= target.end || candidate.end === latestYear.get(candidate.id) || region === null || corps.get(candidate.id)?.region !== region) {
                continue
            }
            const weight = 100 / (1 + distance(target, candidate))
            if (weight >= minSimilarity && weight > (closest.get(candidate.id)?.weight ?? 0)) {
                closest.set(candidate.id, { ...candidate, weight })
            }
        }
        const matches = [...closest.values()].toSorted((a, b) => b.weight - a.weight).slice(0, maxMatches)

        // Each metric moves by the ratio its match moved by, except surplus/deficit, which follows the match's figure per worshipper
        const byRatio = (name: MetricName) => {
            const base = figure(name, target.id, target.end)
            return base === null ? [] : project(matches, target, (match, year) => {
                const from = figure(name, match.id, match.end)
                const to = figure(name, match.id, year)
                return from === null || from <= 0 || to === null ? null : base * to / from
            }, false)
        }
        const projectedWorship = byRatio('congregationalWorship')
        const metrics: Record<MetricName, ProjectedPoint[]> = {
            congregationalWorship: projectedWorship,
            firstTimeDecisions: byRatio('firstTimeDecisions'),
            kidsChurch: byRatio('kidsChurch'),
            youthDiscipleship: byRatio('youthDiscipleship'),
            tithing: byRatio('tithing'),
            surplusDeficit: project(matches, target, (match, year) => {
                const surplusDeficit = figure('surplusDeficit', match.id, year)
                const matchWorship = figure('congregationalWorship', match.id, year)
                const targetWorship = projectedWorship.find(p => p.year === year - match.end + target.end)
                return surplusDeficit === null || matchWorship === null || !targetWorship ? null : surplusDeficit / matchWorship * targetWorship.metric
            }, true)
        }

        projections.set(target.id, {
            window: windowYears,
            year: target.end,
            matches: matches.map((m): Match => ({ id: m.id, name: corps.get(m.id)?.name ?? m.id, year: m.end, similarity: Math.round(m.weight) })),
            metrics
        })
    }
    return projections
}
