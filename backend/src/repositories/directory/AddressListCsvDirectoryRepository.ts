import path from 'path'
import { isValid, parse } from 'date-fns'
import { readCsv } from '../csv.ts'
import type { CorpsDirectoryRepository } from './CorpsDirectoryRepository.ts'
import type { Corps } from '../../models/Corps.ts'

const ADDRESS_LIST_FILE = 'Corps address list.csv'

const POPULATION_COLUMNS = new Map([
    [2013, '2013 Population'],
    [2024, '2024 Estimate'],
    [2050, '2050 Projection']
])

const toCoordinate = (value: string): number | null => {
    const coordinate = parseFloat(value)
    return Number.isNaN(coordinate) ? null : coordinate
}

const toClosingDate = (value: string): Date | null => {
    const date = parse(value, 'dd/MM/yyyy', new Date())
    return isValid(date) ? date : null
}

/**
 * CorpsDirectoryRepository backed by the corps address list export.
 */
export class AddressListCsvDirectoryRepository implements CorpsDirectoryRepository {
    private readonly corpsById: Map<string, Corps>

    /**
     * Read the address list once from the data folder.
     * @returns Rejects naming the export when it cannot be read
     */
    static async load(dataFolder: string): Promise<AddressListCsvDirectoryRepository> {
        return new AddressListCsvDirectoryRepository(await readCsv(path.join(dataFolder, ADDRESS_LIST_FILE)))
    }

    constructor(rows: Record<string, string>[]) {
        this.corpsById = new Map(rows.map(row => [row.code, {
            id: row.code,
            name: row.name,
            area: row.division_name,
            address: row.address1,
            closingDate: toClosingDate(row.centre_close_date),
            city: row.city,
            lat: toCoordinate(row.latitude),
            lng: toCoordinate(row.longitude),
            population: [...POPULATION_COLUMNS].map(([year, column]) => ({ year, value: parseInt(row[column], 10) || 0 }))
        }]))
    }

    all() {
        return [...this.corpsById.values()]
    }

    get(centreId: string) {
        return this.corpsById.get(centreId) ?? null
    }

    population(centreId: string, year: number) {
        return this.corpsById.get(centreId)?.population.find(p => p.year === year)?.value ?? null
    }
}
