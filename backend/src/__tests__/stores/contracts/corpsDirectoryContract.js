export function describeCorpsDirectoryContract(loadDirectory) {
    describe('CorpsDirectory contract', () => {
        let directory

        beforeAll(async () => {
            directory = await loadDirectory()
        })

        describe('all', () => {
            test('should list every corps', () => {
                expect(directory.all().map(c => c.id).sort()).toEqual(['100001', '100002'])
            })
        })

        describe('get', () => {
            test('should return the corps reference data', () => {
                expect(directory.get('100001')).toEqual({
                    id: '100001',
                    name: 'Alpha Corps',
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
                const beta = directory.get('100002')
                expect(beta.closingDate).toEqual(new Date(2014, 11, 23))
                expect(beta.lat).toBeNull()
                expect(beta.lng).toBeNull()
            })

            test('should return null for an unknown corps', () => {
                expect(directory.get('999999')).toBeNull()
            })
        })

        describe('population', () => {
            test('should return the population for a year with a figure', () => {
                expect(directory.population('100001', 2024)).toBe(1200)
            })

            test('should return null for a year or corps without a figure', () => {
                expect(directory.population('100001', 2030)).toBeNull()
                expect(directory.population('999999', 2024)).toBeNull()
            })
        })
    })
}
