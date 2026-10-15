export const financeScenario = {
    alpha: { id: '100001', name: 'Alpha Corps' },
    beta: { id: '100002', name: 'Beta Corps' }
}

export function describeFinanceStoreContract(loadStore) {
    describe('FinanceStore contract', () => {
        let store

        beforeAll(async () => {
            store = await loadStore()
        })

        describe('years', () => {
            test('should list every financial year with data in ascending order', () => {
                expect(store.years()).toEqual([2022, 2023, 2024])
            })
        })

        describe('corps', () => {
            test('should list every corps with tithing', () => {
                expect(store.corps()).toEqual(expect.arrayContaining([financeScenario.alpha, financeScenario.beta]))
                expect(store.corps()).toHaveLength(2)
            })
        })

        describe('tithing', () => {
            test('should total July to June into the financial year, counting a blank month as zero', () => {
                expect(store.tithing('100001', 2023)).toBe(300)
            })

            test('should keep months either side of the financial year out of it', () => {
                expect(store.tithing('100001', 2022)).toBe(50)
                expect(store.tithing('100001', 2024)).toBe(150)
            })

            test('should return null when the corps has no tithing that year', () => {
                expect(store.tithing('100002', 2023)).toBeNull()
                expect(store.tithing('999999', 2023)).toBeNull()
            })
        })

        describe('monthlyTithing', () => {
            test('should return each month of the financial year in chronological order', () => {
                expect(store.monthlyTithing('100001', 2023)).toEqual([
                    { year: 2022, month: 7, metric: 100 },
                    { year: 2022, month: 8, metric: 0 },
                    { year: 2023, month: 6, metric: 200 }
                ])
            })

            test('should return an empty list when there is no data', () => {
                expect(store.monthlyTithing('100002', 2023)).toEqual([])
                expect(store.monthlyTithing('999999', 2023)).toEqual([])
            })
        })

        describe('surplusDeficit', () => {
            test('should return the figure for the financial year', () => {
                expect(store.surplusDeficit('100001', 2023)).toBe(-1000.5)
                expect(store.surplusDeficit('100001', 2024)).toBe(2500)
            })

            test('should return null when the corps has no figure that year', () => {
                expect(store.surplusDeficit('100001', 2022)).toBeNull()
                expect(store.surplusDeficit('100002', 2024)).toBeNull()
                expect(store.surplusDeficit('999999', 2024)).toBeNull()
            })
        })
    })
}
