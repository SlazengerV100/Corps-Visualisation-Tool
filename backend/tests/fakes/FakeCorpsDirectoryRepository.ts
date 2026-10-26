import type { CorpsDirectoryRepository } from '../../src/repositories/directory/CorpsDirectoryRepository.ts'
import type { Corps } from '../../src/models/Corps.ts'

export class FakeCorpsDirectoryRepository implements CorpsDirectoryRepository {
    private readonly corpsList: Corps[]

    constructor({ corps }: { corps: Corps[] }) {
        this.corpsList = corps
    }

    all() {
        return this.corpsList
    }

    get(centreId: string) {
        return this.corpsList.find(c => c.id === centreId) ?? null
    }

    population(centreId: string, year: number) {
        return this.get(centreId)?.population.find(p => p.year === year)?.value ?? null
    }
}
