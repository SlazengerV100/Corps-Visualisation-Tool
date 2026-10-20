import { alpha, beta, unknownId, byId } from '../scenario.js'

export function describeCorpsDirectoryContract(loadDirectory) {
    describe('CorpsDirectory contract', () => {
        let directory

        beforeAll(async () => {
            directory = await loadDirectory()
        })

        describe('all', () => {
            test('should list every corps', () => {
                expect([...directory.all()].sort(byId).map(c => c.id)).toEqual([alpha.id, beta.id])
            })
        })

        describe('get', () => {
            test('should return the corps reference data', () => {
                expect(directory.get(alpha.id)).toEqual({
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
                const corps = directory.get(beta.id)
                expect(corps.closingDate).toEqual(new Date(2014, 11, 23))
                expect(corps.lat).toBeNull()
                expect(corps.lng).toBeNull()
            })

            test('should return null for an unknown corps', () => {
                expect(directory.get(unknownId)).toBeNull()
            })
        })

        describe('population', () => {
            test('should return the population for a year with a figure', () => {
                expect(directory.population(alpha.id, 2024)).toBe(1200)
            })

            test('should return null for a year or corps without a figure', () => {
                expect(directory.population(alpha.id, 2030)).toBeNull()
                expect(directory.population(unknownId, 2024)).toBeNull()
            })
        })
    })
}
