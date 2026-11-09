import { describe, expect, test } from 'vitest'
import { projectFromSimilarCorps } from '../../src/services/similarCorps.ts'
import type { MetricName } from '../../src/models/Metric.ts'
import type { ProjectedPoint } from '../../src/models/Projection.ts'
import type { YearlyPoint } from '../../src/models/YearlyPoint.ts'

type History = Partial<Record<MetricName, Record<number, number>>>

const metricNames: MetricName[] = ['congregationalWorship', 'firstTimeDecisions', 'kidsChurch', 'youthDiscipleship', 'tithing', 'surplusDeficit']

const run = (from: number, values: number[]) => Object.fromEntries(values.map((value, i) => [from + i, value]))

const repeat = (value: number, times: number) => Array<number>(times).fill(value)

const yearlyByMetric = (corps: Record<string, History>) => new Map(metricNames.map(name => [name, new Map(
    Object.entries(corps).flatMap(([id, history]): [string, YearlyPoint[]][] => {
        const figures = history[name]
        return figures ? [[id, Object.entries(figures).map(([year, metric]) => ({ year: Number(year), metric }))]] : []
    })
)]))

const rounded = (points: ProjectedPoint[]) => points.map(p => ({ year: p.year, metric: Math.round(p.metric), low: Math.round(p.low), high: Math.round(p.high) }))

const steady = (metric: number) => [2026, 2027, 2028, 2029, 2030].map(year => ({ year, metric, low: metric, high: metric }))

// Johnsonville's latest three years mirror Hamilton's and Napier's earlier ones, after which both doubled
const history: Record<string, History> = {
    johnsonville: {
        congregationalWorship: run(2023, [50, 60, 70]),
        tithing: run(2023, [10000, 12000, 14000]),
        kidsChurch: run(2023, [0, 0, 0]),
        youthDiscipleship: run(2023, [10, 10, 10]),
        surplusDeficit: run(2023, [-500, -600, -700])
    },
    hamilton: {
        congregationalWorship: run(2013, [50, 60, 70, ...repeat(140, 5)]),
        tithing: run(2013, [10000, 12000, 14000, ...repeat(28000, 5)]),
        kidsChurch: run(2013, [20, 20, 20]),
        youthDiscipleship: run(2013, [10, 10, 10, ...repeat(0, 5)]),
        surplusDeficit: run(2013, [-500, -600, -700, ...repeat(-1400, 5)])
    },
    napier: {
        congregationalWorship: run(2010, [50, 60, 70, ...repeat(140, 5)]),
        tithing: run(2010, [10000, 12000, 14000, ...repeat(28000, 5)]),
        youthDiscipleship: run(2010, [10, 10, 10, ...repeat(20, 5)])
    },
    nelson: {
        congregationalWorship: run(2014, [51, 61, 71, ...repeat(142, 5)]),
        tithing: run(2014, [10100, 12100, 14100, ...repeat(28200, 5)]),
        surplusDeficit: run(2014, [-510, -610, -710, ...repeat(-1420, 5)])
    },
    auckland: {
        congregationalWorship: run(2014, [500, 520, 540, 540, 540]),
        tithing: run(2014, [200000, 210000, 220000, 220000, 220000])
    },
    // Labasa's history matches Hamilton's exactly, but in the Pacific
    labasa: {
        congregationalWorship: run(2013, [50, 60, 70, ...repeat(140, 5)]),
        tithing: run(2013, [10000, 12000, 14000, ...repeat(28000, 5)])
    },
    suva: {
        congregationalWorship: run(2023, [50, 60, 70]),
        tithing: run(2023, [10000, 12000, 14000])
    }
}

const pacific = new Set(['labasa', 'suva'])

const names = new Map([...Object.keys(history), 'wellington'].map(id => [id, { name: `${id} Corps`, region: pacific.has(id) ? 'Pacific' : 'New Zealand' }]))

describe('projectFromSimilarCorps', () => {
    const projection = projectFromSimilarCorps(yearlyByMetric(history), names, 3).get('johnsonville')

    test('should match the closest earlier windows, closest first, leaving out distant corps', () => {
        expect(projection?.year).toBe(2025)
        expect(projection?.matches.slice(0, 2)).toEqual(expect.arrayContaining([
            expect.objectContaining({ id: 'hamilton', name: 'hamilton Corps', year: 2015, similarity: 100 }),
            expect.objectContaining({ id: 'napier', name: 'napier Corps', year: 2012, similarity: 100 })
        ]))
        expect(projection?.matches[2]).toMatchObject({ id: 'nelson', year: 2016 })
        expect(projection?.matches[2].similarity).toBeLessThan(100)
        expect(projection?.matches).toHaveLength(3)
    })

    test('should project each metric but first-time decisions by the ratio its matches moved by', () => {
        expect(rounded(projection?.metrics.congregationalWorship.points ?? [])).toEqual(steady(140))
        expect(rounded(projection?.metrics.tithing.points ?? [])).toEqual(steady(28000))
        expect(projection?.metrics).not.toHaveProperty('firstTimeDecisions')
    })

    test('should match each metric on its own history, in every year of the window', () => {
        // Dunedin's worship mirrors Johnsonville's, but its tithing is far larger; Gisborne shares a single year of tithing
        const dunedin = {
            congregationalWorship: run(2014, [50, 60, 70, ...repeat(35, 5)]),
            tithing: run(2014, [1000000, 1200000, 1400000, ...repeat(1400000, 5)])
        }
        const gisborne = {
            congregationalWorship: run(2012, [50, 60, 70, ...repeat(140, 5)]),
            tithing: { 2014: 14000 }
        }
        const others = new Map([...names, ...['dunedin', 'gisborne'].map(id => [id, { name: `${id} Corps`, region: 'New Zealand' }] as const)])
        const metrics = projectFromSimilarCorps(yearlyByMetric({ ...history, dunedin, gisborne }), others, 3).get('johnsonville')?.metrics
        expect(metrics?.congregationalWorship.matches.map(m => m.id)).toContain('dunedin')
        expect(metrics?.tithing.matches.map(m => m.id)).not.toContain('dunedin')
        expect(metrics?.tithing.matches.map(m => m.id)).not.toContain('gisborne')
    })

    test('should give each metric\'s matches their window and what followed, on the corps\' years and scaled to its level', () => {
        const worship = projection?.metrics.congregationalWorship.matches.find(m => m.id === 'nelson')
        const surplusDeficit = projection?.metrics.surplusDeficit.matches.find(m => m.id === 'nelson')
        expect(worship?.points.map(p => p.year)).toEqual([2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030])
        expect(worship?.points.map(p => Math.round(p.metric))).toEqual([50, 60, 70, 140, 140, 140, 140, 140])
        expect(surplusDeficit?.points.map(p => Math.round(p.metric))).toEqual([-503, -601, -700, ...repeat(-1400, 5)])
    })

    test('should project surplus/deficit per worshipper of the projected worship', () => {
        expect(rounded(projection?.metrics.surplusDeficit.points ?? [])).toEqual(steady(-1400))
    })

    test('should treat a SAMIS zero as missing, neither matching, mismatching nor projecting', () => {
        expect(projection?.metrics.kidsChurch).toEqual({ matches: [], points: [] })
        // Only Napier has youth figures after its window, Hamilton's are blank, and one figure gives no margin for error
        expect(projection?.metrics.youthDiscipleship.points).toEqual([])
    })

    test('should match only corps in the same region', () => {
        expect(projection?.matches.map(m => m.id)).not.toContain('labasa')
        expect(projectFromSimilarCorps(yearlyByMetric(history), names, 3).get('suva')?.matches.map(m => m.id)).toEqual(['labasa'])
    })

    test('should match a corps\' own earlier years, but not those overlapping its latest window', () => {
        // Rotorua's latest three years repeat its first three; Taupō grows steadily, so its closest own window would overlap its latest
        const own = {
            rotorua: {
                congregationalWorship: { ...run(2010, [50, 60, 70, ...repeat(140, 5)]), ...run(2023, [50, 60, 70]) },
                tithing: { ...run(2010, [10000, 12000, 14000, ...repeat(28000, 5)]), ...run(2023, [10000, 12000, 14000]) }
            },
            taupo: { congregationalWorship: run(2015, Array.from({ length: 11 }, (_, i) => 100 + 10 * i)) }
        }
        const ownNames = new Map(Object.keys(own).map(id => [id, { name: `${id} Corps`, region: 'New Zealand' }]))
        const projections = projectFromSimilarCorps(yearlyByMetric(own), ownNames, 3)
        expect(projections.get('rotorua')?.matches[0]).toMatchObject({ id: 'rotorua', name: 'rotorua Corps', year: 2012, similarity: 100 })
        expect(projections.get('taupo')?.matches.find(m => m.id === 'taupo')?.year).toBe(2022)
    })

    test('should keep at most three matches', () => {
        const withAnotherMatch = { ...history, wellington: { ...history.hamilton } }
        const matches = projectFromSimilarCorps(yearlyByMetric(withAnotherMatch), names, 3).get('johnsonville')?.matches
        expect(matches?.map(m => m.id).toSorted()).toEqual(['hamilton', 'napier', 'wellington'])
    })

    test('should project nothing when no corps matches closely enough', () => {
        const auckland = projectFromSimilarCorps(yearlyByMetric(history), names, 3).get('auckland')
        expect(auckland?.matches).toEqual([])
        expect(Object.values(auckland?.metrics ?? {}).flatMap(m => [...m.matches, ...m.points])).toEqual([])
    })

    test('should leave out a corps without worship in every year of its latest window', () => {
        const projections = projectFromSimilarCorps(yearlyByMetric(history), names, 5)
        expect(projections.has('johnsonville')).toBe(false)
        expect(projections.get('hamilton')?.window).toBe(5)
    })
})
