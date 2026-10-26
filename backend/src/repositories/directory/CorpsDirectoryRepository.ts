import type { Corps } from '../../models/Corps.ts'

export interface CorpsDirectoryRepository {
    all(): Corps[]
    get(centreId: string): Corps | null
    population(centreId: string, year: number): number | null
}
