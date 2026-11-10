import { describe, expect, test } from 'vitest'
import { projectFromSimilarCorps, trendIndex } from '../../src/services/similarCorps.ts'
import type { TrendIndex } from '../../src/services/similarCorps.ts'
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

// No national trend, so the matching tests see figures as recorded
const flat: TrendIndex = new Map()

const inNewZealand =(ids: string[]) => new Map(ids.map(id => [id, { name: `${id} Corps`, region: 'New Zealand' }]))

const rounded = (points: ProjectedPoint[]) => points.map(p => ({ year: p.year, metric: Math.round(p.metric), low: Math.round(p.low), high: Math.round(p.high) }))

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
    const projection = projectFromSimilarCorps(yearlyByMetric(history), names, 3, flat).get('johnsonville')

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

    test('should project each metric but first-time decisions from the corps\' own trend, whatever its matches did', () => {
        // Tauranga grew 25% a year, in a perfectly straight line on a log scale, so its band has no width
        const tauranga = {
            congregationalWorship: run(2023, [40, 50, 62.5]),
            tithing: run(2023, [8000, 10000, 12500])
        }
        const metrics = projectFromSimilarCorps(yearlyByMetric({ ...history, tauranga }), new Map([...names, ...inNewZealand(['tauranga'])]), 3, flat).get('tauranga')?.metrics
        expect(rounded(metrics?.congregationalWorship.points ?? [])).toEqual([
            { year: 2026, metric: 78, low: 78, high: 78 },
            { year: 2027, metric: 98, low: 98, high: 98 },
            { year: 2028, metric: 122, low: 122, high: 122 }
        ])
        expect(rounded(metrics?.tithing.points ?? []).map(p => p.metric)).toEqual([15625, 19531, 24414])
        expect(projection?.metrics).not.toHaveProperty('firstTimeDecisions')
    })

    test('should band each year by the fit\'s 80% prediction interval, widening the further ahead', () => {
        const uneven = { congregationalWorship: run(2023, [100, 80, 110]) }
        const points = projectFromSimilarCorps(yearlyByMetric({ uneven }), inNewZealand(['uneven']), 3, flat).get('uneven')?.metrics.congregationalWorship.points ?? []
        const widths = points.map(p => Math.log(p.high / p.low))
        expect(points).toHaveLength(3)
        expect(points.every(p => p.low < p.metric && p.metric < p.high)).toBe(true)
        expect(widths).toEqual(widths.toSorted((a, b) => a - b))
        expect(widths[0]).toBeLessThan(widths[2])
    })

    test('should still project from the corps\' own trend when no corps matches closely enough', () => {
        const auckland = projectFromSimilarCorps(yearlyByMetric(history), names, 3, flat).get('auckland')
        expect(auckland?.matches).toEqual([])
        expect(auckland?.metrics.congregationalWorship.points).toHaveLength(3)
    })

    test('should project surplus/deficit from its trend per worshipper, applied to the projected worship', () => {
        // Kerikeri's worship holds at 100 while its deficit per worshipper deepens by $1 a year
        const kerikeri = { congregationalWorship: run(2023, [100, 100, 100]), surplusDeficit: run(2023, [-1000, -1100, -1200]) }
        const points = projectFromSimilarCorps(yearlyByMetric({ kerikeri }), inNewZealand(['kerikeri']), 3, flat).get('kerikeri')?.metrics.surplusDeficit.points ?? []
        expect(rounded(points)).toEqual([
            { year: 2026, metric: -1300, low: -1300, high: -1300 },
            { year: 2027, metric: -1400, low: -1400, high: -1400 },
            { year: 2028, metric: -1500, low: -1500, high: -1500 }
        ])
    })

    test('should project a metric only with a figure in every year of the window', () => {
        const kaikohe = { congregationalWorship: run(2023, [50, 60, 70]), tithing: { 2023: 10000, 2025: 14000 } }
        const metrics = projectFromSimilarCorps(yearlyByMetric({ kaikohe }), inNewZealand(['kaikohe']), 3, flat).get('kaikohe')?.metrics
        expect(metrics?.tithing.points).toEqual([])
        expect(metrics?.congregationalWorship.points).toHaveLength(3)
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
        const metrics = projectFromSimilarCorps(yearlyByMetric({ ...history, dunedin, gisborne }), others, 3, flat).get('johnsonville')?.metrics
        expect(metrics?.congregationalWorship.matches.map(m => m.id)).toContain('dunedin')
        expect(metrics?.tithing.matches.map(m => m.id)).not.toContain('dunedin')
        expect(metrics?.tithing.matches.map(m => m.id)).not.toContain('gisborne')
    })

    test('should give each metric\'s matches their window and as many years after, on the corps\' years and scaled to its level', () => {
        const worship = projection?.metrics.congregationalWorship.matches.find(m => m.id === 'nelson')
        const surplusDeficit = projection?.metrics.surplusDeficit.matches.find(m => m.id === 'nelson')
        expect(worship?.points.map(p => p.year)).toEqual([2023, 2024, 2025, 2026, 2027, 2028])
        expect(worship?.points.map(p => Math.round(p.metric))).toEqual([50, 60, 70, 140, 140, 140])
        expect(surplusDeficit?.points.map(p => Math.round(p.metric))).toEqual([-503, -601, -700, ...repeat(-1400, 3)])
    })

    test('should treat a SAMIS zero as missing, neither matching, mismatching nor projecting', () => {
        expect(projection?.metrics.kidsChurch).toEqual({ matches: [], points: [] })
    })

    test('should match only corps in the same region', () => {
        expect(projection?.matches.map(m => m.id)).not.toContain('labasa')
        expect(projectFromSimilarCorps(yearlyByMetric(history), names, 3, flat).get('suva')?.matches.map(m => m.id)).toEqual(['labasa'])
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
        const projections = projectFromSimilarCorps(yearlyByMetric(own), ownNames, 3, flat)
        expect(projections.get('rotorua')?.matches[0]).toMatchObject({ id: 'rotorua', name: 'rotorua Corps', year: 2012, similarity: 100 })
        expect(projections.get('taupo')?.matches.find(m => m.id === 'taupo')?.year).toBe(2022)
    })

    test('should match only windows followed by worship in as many years as they cover', () => {
        // Whanganui's latest years but one mirror Johnsonville's, with a single year after them
        const whanganui = { congregationalWorship: run(2022, [50, 60, 70, 140]), tithing: run(2022, [10000, 12000, 14000, 28000]) }
        const others = new Map([...names, ['whanganui', { name: 'whanganui Corps', region: 'New Zealand' }]])
        const matched = projectFromSimilarCorps(yearlyByMetric({ ...history, whanganui }), others, 3, flat).get('johnsonville')
        expect(matched?.matches.map(m => m.id)).not.toContain('whanganui')
        expect(matched?.metrics.congregationalWorship.matches.map(m => m.id)).not.toContain('whanganui')
    })

    test('should keep at most three matches', () => {
        const withAnotherMatch = { ...history, wellington: { ...history.hamilton } }
        const matches = projectFromSimilarCorps(yearlyByMetric(withAnotherMatch), names, 3, flat).get('johnsonville')?.matches
        expect(matches?.map(m => m.id).toSorted()).toEqual(['hamilton', 'napier', 'wellington'])
    })

    test('should leave out a corps without worship in every year of its latest window', () => {
        const projections = projectFromSimilarCorps(yearlyByMetric(history), names, 5, flat)
        expect(projections.has('johnsonville')).toBe(false)
        expect(projections.get('hamilton')?.window).toBe(5)
    })

    test('should match corps on how they stood against their region\'s index, leaving the projection to the corps\' own trend', () => {
        // Everyone doubled from 2016, so Porirua today stands against the nation as Masterton did before then
        const doubled = {
            porirua: { congregationalWorship: run(2023, [100, 120, 140]) },
            masterton: { congregationalWorship: run(2013, [50, 60, 70, 140, 140, 140]) }
        }
        const index: TrendIndex = new Map([['New Zealand', new Map([['congregationalWorship', new Map(
            Array.from({ length: 20 }, (_, i) => [2010 + i, 2010 + i >= 2016 ? 2 : 1])
        )]])]])
        const corps = inNewZealand(Object.keys(doubled))
        const against = projectFromSimilarCorps(yearlyByMetric(doubled), corps, 3, index).get('porirua')?.metrics.congregationalWorship
        const asRecorded = projectFromSimilarCorps(yearlyByMetric(doubled), corps, 3, flat).get('porirua')?.metrics.congregationalWorship
        expect(against?.matches[0]).toMatchObject({ id: 'masterton', similarity: 100 })
        expect(asRecorded?.matches[0]?.similarity ?? 0).toBeLessThan(100)
        expect(against?.matches[0].points.map(p => Math.round(p.metric))).toEqual([100, 120, 140, 280, 280, 280])
        expect(against?.points).toEqual(asRecorded?.points)
    })
})

describe('trendIndex', () => {
    test('should chain each year\'s change in total across the corps recorded in both years', () => {
        // Kapiti opens and Foxton closes, which would move a plain total but not the index; Ōtaki's last zero is missing, not a year
        const corps = {
            otaki: { congregationalWorship: run(2020, [100, 90, 81, 0]), surplusDeficit: run(2020, [-100, 0, 100]) },
            waikanae: { congregationalWorship: run(2020, [100, 110, 99]) },
            kapiti: { congregationalWorship: run(2022, [500]) },
            foxton: { congregationalWorship: run(2020, [300]) }
        }
        const index = trendIndex(yearlyByMetric(corps), inNewZealand(Object.keys(corps))).get('New Zealand')
        const worship = index?.get('congregationalWorship')
        expect([...worship ?? []].map(([year, level]) => [year, Math.round(level * 1000) / 1000])).toEqual([[2020, 1], [2021, 1], [2022, 0.9]])
        expect(index?.has('surplusDeficit')).toBe(false)
    })
})
