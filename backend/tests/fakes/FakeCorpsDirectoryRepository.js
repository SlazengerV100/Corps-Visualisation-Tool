export class FakeCorpsDirectoryRepository {
    constructor({ corps }) {
        this.corpsList = corps
    }

    all() {
        return this.corpsList
    }

    get(centreId) {
        return this.corpsList.find(c => c.id === centreId) ?? null
    }

    population(centreId, year) {
        return this.get(centreId)?.population.find(p => p.year === year)?.value ?? null
    }
}
