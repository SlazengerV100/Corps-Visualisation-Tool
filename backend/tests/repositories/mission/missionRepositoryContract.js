import { alpha, beta, unknownId, byId } from '../scenario.js'

export function describeMissionRepositoryContract(loadRepository) {
    describe('MissionRepository contract', () => {
        let repository

        beforeAll(async () => {
            repository = await loadRepository()
        })

        describe('years', () => {
            test('should list every financial year with data in ascending order', () => {
                expect(repository.years()).toEqual([2023, 2024])
            })
        })

        describe('corps', () => {
            test('should list every corps including the last in the source', () => {
                expect([...repository.corps()].sort(byId)).toEqual([alpha, beta])
            })
        })

        describe('yearly', () => {
            test('should return each indicator for the financial year', () => {
                expect(repository.yearly(alpha.id, 2023)).toEqual({
                    congregationalWorship: 50,
                    firstTimeDecisions: 2,
                    kidsChurch: 10,
                    youthDiscipleship: 5
                })
            })

            test('should return null for an indicator with no data that year', () => {
                expect(repository.yearly(alpha.id, 2024)).toEqual({
                    congregationalWorship: 60,
                    firstTimeDecisions: 0,
                    kidsChurch: null,
                    youthDiscipleship: 6
                })
            })

            test('should return data for the last corps in the source', () => {
                expect(repository.yearly(beta.id, 2024).congregationalWorship).toBe(20)
            })

            test('should return null when the corps has no data that year', () => {
                expect(repository.yearly(beta.id, 2023)).toBeNull()
            })

            test('should return null for an unknown corps', () => {
                expect(repository.yearly(unknownId, 2024)).toBeNull()
            })
        })

        describe('monthly', () => {
            test('should place July in the previous calendar year and order chronologically', () => {
                expect(repository.monthly(alpha.id, 2024, 'congregationalWorship')).toEqual([
                    { year: 2023, month: 7, metric: 55 },
                    { year: 2024, month: 6, metric: 65 }
                ])
            })

            test('should return an empty list when the indicator has no monthly data', () => {
                expect(repository.monthly(alpha.id, 2024, 'kidsChurch')).toEqual([])
            })

            test('should return an empty list for an unknown corps or year', () => {
                expect(repository.monthly(unknownId, 2024, 'congregationalWorship')).toEqual([])
                expect(repository.monthly(alpha.id, 2020, 'congregationalWorship')).toEqual([])
            })
        })
    })
}
