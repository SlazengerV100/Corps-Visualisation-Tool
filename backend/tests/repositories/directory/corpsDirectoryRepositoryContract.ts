import { beforeAll, describe, expect, test } from 'vitest'
import { alpha, beta, unknownId, byId } from '../scenario.ts'
import type { CorpsDirectoryRepository } from '../../../src/repositories/directory/CorpsDirectoryRepository.ts'

export function describeCorpsDirectoryRepositoryContract(loadRepository: () => Promise<CorpsDirectoryRepository>) {
    describe('CorpsDirectoryRepository contract', () => {
        let repository: CorpsDirectoryRepository

        beforeAll(async () => {
            repository = await loadRepository()
        })

        describe('all', () => {
            test('should list every corps', () => {
                expect(repository.all().toSorted(byId).map(c => c.id)).toEqual([alpha.id, beta.id])
            })
        })

        describe('get', () => {
            test('should return the corps reference data', () => {
                expect(repository.get(alpha.id)).toEqual({
                    ...alpha,
                    area: 'Area Officer - North',
                    address: '1 Main Street',
                    city: 'Kaitaia',
                    closingDate: null,
                    lat: -35.1,
                    lng: 173.2,
                    population: [
                        { year: 2013, value: 1000 },
                        { year: 2024, value: 1200 },
                        { year: 2050, value: 1500 }
                    ]
                })
            })

            test('should return the closing date and null coordinates when missing', () => {
                const corps = repository.get(beta.id)
                expect(corps?.closingDate).toEqual(new Date(2014, 11, 23))
                expect(corps?.lat).toBeNull()
                expect(corps?.lng).toBeNull()
            })

            test('should return null for an unknown corps', () => {
                expect(repository.get(unknownId)).toBeNull()
            })
        })

        describe('population', () => {
            test('should return the population for a year with a figure', () => {
                expect(repository.population(alpha.id, 2024)).toBe(1200)
            })

            test('should return null for a year or corps without a figure', () => {
                expect(repository.population(alpha.id, 2030)).toBeNull()
                expect(repository.population(unknownId, 2024)).toBeNull()
            })
        })
    })
}
