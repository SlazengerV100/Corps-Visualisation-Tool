export const missionScenario = {
    alpha: { id: '100001', name: 'Alpha Corps' },
    beta: { id: '100002', name: 'Beta Corps' }
}

export function describeMissionStoreContract(loadStore) {
    describe('MissionStore contract', () => {
        let store

        beforeAll(async () => {
            store = await loadStore()
        })

        describe('years', () => {
            test('should list every financial year with data in ascending order', () => {
                expect(store.years()).toEqual([2023, 2024])
            })
        })

        describe('corps', () => {
            test('should list every corps including the last in the source', () => {
                expect(store.corps()).toEqual(expect.arrayContaining([missionScenario.alpha, missionScenario.beta]))
                expect(store.corps()).toHaveLength(2)
            })
        })

        describe('yearly', () => {
            test('should return each indicator for the financial year', () => {
                expect(store.yearly('100001', 2023)).toEqual({
                    congregationalWorship: 50,
                    firstTimeDecisions: 2,
                    kidsChurch: 10,
                    youthDiscipleship: 5
                })
            })

            test('should return null for an indicator with no data that year', () => {
                expect(store.yearly('100001', 2024)).toEqual({
                    congregationalWorship: 60,
                    firstTimeDecisions: 0,
                    kidsChurch: null,
                    youthDiscipleship: 6
                })
            })

            test('should return data for the last corps in the source', () => {
                expect(store.yearly('100002', 2024).congregationalWorship).toBe(20)
            })

            test('should return null when the corps has no data that year', () => {
                expect(store.yearly('100002', 2023)).toBeNull()
            })

            test('should return null for an unknown corps', () => {
                expect(store.yearly('999999', 2024)).toBeNull()
            })
        })

        describe('monthly', () => {
            test('should place July in the previous calendar year and order chronologically', () => {
                expect(store.monthly('100001', 2024, 'congregationalWorship')).toEqual([
                    { year: 2023, month: 7, metric: 55 },
                    { year: 2024, month: 6, metric: 65 }
                ])
            })

            test('should return an empty list when the indicator has no monthly data', () => {
                expect(store.monthly('100001', 2024, 'kidsChurch')).toEqual([])
            })

            test('should return an empty list for an unknown corps or year', () => {
                expect(store.monthly('999999', 2024, 'congregationalWorship')).toEqual([])
                expect(store.monthly('100001', 2020, 'congregationalWorship')).toEqual([])
            })
        })
    })
}
