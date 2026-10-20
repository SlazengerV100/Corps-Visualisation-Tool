import { CorpsInsights } from '../../src/services/CorpsInsights.js'
import { InvalidQueryError } from '../../src/services/InvalidQueryError.js'
import { NotFoundError } from '../../src/services/NotFoundError.js'
import { calculateGrowth, calculateSustainability } from '../../src/utils/calculations.js'
import { FakeMissionStore } from '../fakes/FakeMissionStore.js'
import { FakeFinanceStore } from '../fakes/FakeFinanceStore.js'
import { FakeCorpsDirectory } from '../fakes/FakeCorpsDirectory.js'

const alpha = { id: '100001', name: 'Alpha Corps' }
const beta = { id: '100002', name: 'Beta Corps' }
const gamma = { id: '100003', name: 'Gamma Corps' }
const delta = { id: '100004', name: 'Delta Corps' }
const epsilon = { id: '100005', name: 'Epsilon Corps' }

const indicators = (congregationalWorship, firstTimeDecisions, kidsChurch, youthDiscipleship) =>
    ({ congregationalWorship, firstTimeDecisions, kidsChurch, youthDiscipleship })

const alphaListing = {
    ...alpha,
    area: 'Area Officer - North',
    address: '1 Main Street',
    closingDate: null,
    city: 'Kaitaia',
    lat: -35.1,
    lng: 173.2,
    population: [{ year: 2024, value: 1200 }]
}

const insights = new CorpsInsights(
    new FakeMissionStore({
        corps: [alpha, beta, gamma, delta, epsilon],
        yearly: {
            [alpha.id]: { 2023: indicators(100, 3, 10, 5), 2024: indicators(110, null, null, 6) },
            [beta.id]: { 2024: indicators(0, 4, null, null) },
            [gamma.id]: { 2022: indicators(40, 1, null, null) },
            [delta.id]: { 2023: indicators(0, 0, null, null), 2024: indicators(20, 0, null, null) },
            [epsilon.id]: { 2022: indicators(50, 0, null, null), 2023: indicators(60, 0, null, null) }
        },
        monthly: {
            [alpha.id]: {
                2023: { congregationalWorship: [{ year: 2022, month: 7, metric: 90 }, { year: 2023, month: 6, metric: 110 }] },
                2024: { congregationalWorship: [{ year: 2023, month: 7, metric: 100 }, { year: 2024, month: 6, metric: 120 }] }
            }
        }
    }),
    new FakeFinanceStore({
        corps: [alpha, beta, delta, epsilon],
        tithing: {
            [alpha.id]: { 2023: 50000, 2024: 60000 },
            [beta.id]: { 2024: 1000 },
            [delta.id]: { 2024: 500 },
            [epsilon.id]: { 2023: 700 }
        },
        monthlyTithing: {
            [alpha.id]: { 2024: [{ year: 2023, month: 7, metric: 30000 }, { year: 2024, month: 6, metric: 30000 }] }
        },
        surplusDeficit: { [alpha.id]: { 2024: 0 } }
    }),
    new FakeCorpsDirectory({
        corps: [alphaListing, { ...alphaListing, ...beta, lat: null, lng: null, population: [] }]
    })
)

describe('CorpsInsights', () => {
    describe('catalogue', () => {
        test('should list every metric with its granularities and the years it has data', () => {
            const metrics = insights.catalogue().metrics
            expect(metrics.map(m => m.name)).toEqual([
                'congregationalWorship', 'firstTimeDecisions', 'kidsChurch', 'youthDiscipleship', 'tithing', 'surplusDeficit'
            ])
            expect(metrics[0]).toEqual({
                name: 'congregationalWorship',
                label: 'Congregational Worship',
                granularities: ['year', 'month'],
                years: [2023, 2024]
            })
            expect(metrics[1]).toMatchObject({ granularities: ['year'], years: [2022, 2023, 2024] })
            expect(metrics[5]).toMatchObject({ granularities: ['year'], years: [2024] })
        })

        test('should list the years with snapshots and the years with scores', () => {
            expect(insights.catalogue().snapshots).toEqual({ years: [2022, 2023, 2024], scoredYears: [2024] })
        })
    })

    describe('corps', () => {
        test('should list only corps with coordinates', () => {
            expect(insights.corps()).toEqual([alphaListing])
        })
    })

    describe('series', () => {
        test('should average the monthly values into each financial year', () => {
            expect(insights.series(alpha.id, 'congregationalWorship')).toEqual([
                { year: 2023, metric: 100 },
                { year: 2024, metric: 110 }
            ])
        })

        test('should count missing first time decisions as zero only in years with worship', () => {
            expect(insights.series(alpha.id, 'firstTimeDecisions')).toEqual([
                { year: 2023, metric: 3 },
                { year: 2024, metric: 0 }
            ])
            expect(() => insights.series(beta.id, 'firstTimeDecisions')).toThrow(NotFoundError)
        })

        test('should keep a surplus/deficit of zero', () => {
            expect(insights.series(alpha.id, 'surplusDeficit')).toEqual([{ year: 2024, metric: 0 }])
        })

        test('should filter to one financial year', () => {
            expect(insights.series(alpha.id, 'congregationalWorship', { year: 2024 })).toEqual([{ year: 2024, metric: 110 }])
        })

        test('should return the months of one financial year', () => {
            expect(insights.series(alpha.id, 'tithing', { granularity: 'month', year: 2024 })).toEqual([
                { year: 2023, month: 7, metric: 30000 },
                { year: 2024, month: 6, metric: 30000 }
            ])
        })

        test('should return every month in date order without a year filter', () => {
            expect(insights.series(alpha.id, 'congregationalWorship', { granularity: 'month' }).map(p => `${p.year}-${p.month}`))
                .toEqual(['2022-7', '2023-6', '2023-7', '2024-6'])
        })

        test('should reject an unknown metric, an unsupported granularity or a year outside the data', () => {
            expect(() => insights.series(alpha.id, 'attendance')).toThrow(InvalidQueryError)
            expect(() => insights.series(alpha.id, 'surplusDeficit', { granularity: 'month' })).toThrow(InvalidQueryError)
            expect(() => insights.series(alpha.id, 'congregationalWorship', { year: 2030 })).toThrow(InvalidQueryError)
        })

        test('should report a corps without data as not found', () => {
            expect(() => insights.series('999999', 'congregationalWorship')).toThrow(NotFoundError)
        })
    })

    describe('snapshots', () => {
        test('should combine mission, finance and directory figures with scores for one year', () => {
            const worship = { currentYear: 110, prevYear: 100 }
            const tithing = { currentYear: 60000, prevYear: 50000 }
            expect(insights.snapshots({ year: 2024 }).find(s => s.id === alpha.id)).toEqual({
                ...alpha,
                year: 2024,
                metrics: {
                    congregationalWorship: worship,
                    firstTimeDecisions: { currentYear: 0, prevYear: 3 },
                    kidsChurch: { currentYear: null, prevYear: 10 },
                    youthDiscipleship: { currentYear: 6, prevYear: 5 },
                    tithing,
                    surplusDeficit: 0,
                    population: 1200
                },
                scores: {
                    growth: calculateGrowth({ congregationalWorship: worship }),
                    sustainability: calculateSustainability({ tithing }, 110),
                    size: 110
                }
            })
        })

        test('should show tithing without a surplus/deficit figure and default the previous year to zero', () => {
            const snapshot = insights.snapshots({ year: 2024 }).find(s => s.id === beta.id)
            expect(snapshot.metrics.tithing).toEqual({ currentYear: 1000, prevYear: 0 })
            expect(snapshot.metrics.surplusDeficit).toBeNull()
        })

        test('should leave a corps unscored when the previous year has no or zero worship', () => {
            const snapshots = insights.snapshots({ year: 2024 })
            expect(snapshots.find(s => s.id === beta.id)).not.toHaveProperty('scores')
            expect(snapshots.find(s => s.id === delta.id)).not.toHaveProperty('scores')
        })

        test('should leave the first year of finance data unscored, having no previous year of tithing', () => {
            expect(insights.snapshots({ year: 2023 }).find(s => s.id === epsilon.id)).not.toHaveProperty('scores')
        })

        test('should include a corps the year after its last data, but not later', () => {
            expect(insights.snapshots({ year: 2023 }).map(s => s.id)).toContain(gamma.id)
            expect(insights.snapshots({ year: 2024 }).map(s => s.id)).not.toContain(gamma.id)
        })

        test('should return every year without a year filter, and only scored records when asked', () => {
            expect(insights.snapshots()).toHaveLength(10)
            expect(insights.snapshots({ scored: true }).map(s => `${s.id}-${s.year}`)).toEqual([`${alpha.id}-2024`])
        })

        test('should reject a year outside the snapshot years', () => {
            expect(() => insights.snapshots({ year: 2030 })).toThrow(InvalidQueryError)
        })
    })
})
