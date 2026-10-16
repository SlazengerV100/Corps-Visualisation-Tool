import request from 'supertest'
import { createApp, createInsights } from '../../app.js'

describe('API', () => {
    let app

    beforeAll(async () => {
        app = createApp(await createInsights(process.env.DATA_FOLDER))
    })

    describe('createInsights', () => {
        test('should reject naming the source that cannot be read', async () => {
            await expect(createInsights('./missing-data')).rejects.toThrow('.csv')
        })

        test('should reject without a data folder', async () => {
            await expect(createInsights(undefined)).rejects.toThrow('DATA_FOLDER')
        })
    })

    describe('GET /health', () => {
        test('should report OK once the data has loaded', async () => {
            const res = await request(app).get('/health')
            expect(res.status).toBe(200)
            expect(res.body.status).toBe('OK')
        })
    })

    describe('GET /api/catalogue', () => {
        test('should list every metric and the snapshot years', async () => {
            const res = await request(app).get('/api/catalogue')
            expect(res.status).toBe(200)
            expect(res.body.metrics).toHaveLength(6)
            expect(res.body.snapshots).toEqual({ years: [2023, 2024], scoredYears: [2024] })
        })
    })

    describe('GET /api/corps', () => {
        test('should list corps with coordinates', async () => {
            const res = await request(app).get('/api/corps')
            expect(res.status).toBe(200)
            expect(res.body.map(c => c.id)).toEqual(['100001'])
        })
    })

    describe('GET /api/corps/:centreId/series/:metric', () => {
        test('should return the yearly series by default', async () => {
            const res = await request(app).get('/api/corps/100001/series/congregationalWorship')
            expect(res.status).toBe(200)
            expect(res.body).toEqual([{ year: 2024, metric: 60 }])
        })

        test('should return the months of one financial year', async () => {
            const res = await request(app).get('/api/corps/100001/series/tithing?granularity=month&year=2023')
            expect(res.status).toBe(200)
            expect(res.body.map(p => `${p.year}-${p.month}`)).toEqual(['2022-7', '2022-8', '2023-6'])
        })

        test.each([
            ['an unknown granularity', '/api/corps/100001/series/tithing?granularity=week'],
            ['a malformed year', '/api/corps/100001/series/tithing?year=24'],
            ['a year outside the data', '/api/corps/100001/series/tithing?year=2030'],
            ['an unknown metric', '/api/corps/100001/series/attendance'],
            ['a granularity the metric lacks', '/api/corps/100001/series/surplusDeficit?granularity=month']
        ])('should reject %s with a 400', async (_, path) => {
            const res = await request(app).get(path)
            expect(res.status).toBe(400)
            expect(res.body).toEqual({ error: expect.any(String) })
        })

        test('should return a 404 for a corps without data', async () => {
            const res = await request(app).get('/api/corps/999999/series/tithing')
            expect(res.status).toBe(404)
            expect(res.body).toEqual({ error: expect.any(String) })
        })
    })

    describe('GET /api/snapshots', () => {
        test('should return every year without filters', async () => {
            const res = await request(app).get('/api/snapshots')
            expect(res.status).toBe(200)
            expect(res.body.map(s => `${s.id}-${s.year}`)).toEqual(['100001-2023', '100001-2024', '100002-2024'])
        })

        test('should return only scored records for one year', async () => {
            const res = await request(app).get('/api/snapshots?year=2024&scored=true')
            expect(res.status).toBe(200)
            expect(res.body).toHaveLength(1)
            expect(res.body[0]).toMatchObject({ id: '100001', year: 2024, scores: { size: 60 } })
        })

        test.each([
            ['a malformed scored flag', '/api/snapshots?scored=yes'],
            ['a year outside the data', '/api/snapshots?year=2030']
        ])('should reject %s with a 400', async (_, path) => {
            const res = await request(app).get(path)
            expect(res.status).toBe(400)
        })
    })
})
