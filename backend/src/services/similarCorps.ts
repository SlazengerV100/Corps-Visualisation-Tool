import type { FinancialYear } from '../models/FinancialYear.ts'
import type { MetricName } from '../models/Metric.ts'
import type { Match, MetricProjection, ProjectedMetricName, ProjectedPoint, Projection } from '../models/Projection.ts'
import type { YearlyPoint } from '../models/YearlyPoint.ts'

// A window of years is matched on, and projected as many years ahead
export const windowYearOptions = [2, 4, 6, 8, 10]
export const defaultWindowYears = 4
const maxMatches = 3
// A placeholder until the threshold is tuned against real matches
const minSimilarity = 50
// A margin for error needs at least two figures to spread across
const minFigures = 2
// SAMIS cannot tell a figure left blank from a real zero, so its zeros count as missing
const samisMetrics = new Set<MetricName>(['congregationalWorship', 'firstTimeDecisions', 'kidsChurch', 'youthDiscipleship'])

/**
 * Whether a metric is projected; first-time decisions only inform the overall matches.
 */
export const isProjected = (name: MetricName): name is ProjectedMetricName => name !== 'firstTimeDecisions'

interface Window {
    id: string
    end: FinancialYear
    features: Map<MetricName, (number | null)[]>
}

interface WeightedMatch extends Window {
    weight: number
}

/**
 * Match each corps' latest window of years to the closest earlier windows, its own included, across all metrics and on each metric alone, and project each metric by what followed its own matches.
 * @param yearlyByMetric - Each metric's yearly figures by centre code
 * @param corps - Each corps' name and region by centre code; a corps only matches corps in its own region
 * @param windowYears - How many years a window covers, ending in the corps' latest year of worship, and how many years ahead to project
 * @returns A projection for each corps with worship in every year of its latest window, with no points for a metric nothing matched closely enough on
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

        // A match's window and what followed, moved onto the target's years and scaled to its level; surplus/deficit scales by worship
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

        // Each metric is matched on its own history and moves by the ratio its matches moved by; first-time decisions only inform the overall matches
        const byRatio = (name: ProjectedMetricName): MetricProjection => {
            const matches = closestOn([name])
            const base = figure(name, target.id, target.end)
            return {
                matches: matches.map(m => ({ ...describe(m), points: followed(m, name) })),
                points: base === null ? [] : project(matches, target, (match, year) => {
                    const from = figure(name, match.id, match.end)
                    const to = figure(name, match.id, year)
                    return from === null || from <= 0 || to === null ? null : base * to / from
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
