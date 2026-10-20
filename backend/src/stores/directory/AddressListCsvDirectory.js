import path from 'path'
import { isValid, parse } from 'date-fns'
import { readCsv } from '../readCsv.js'

/**
 * @typedef {import('./CorpsDirectory.js').CorpsDirectory} CorpsDirectory
 * @typedef {import('../../domain/Corps.js').Corps} Corps
 */

const ADDRESS_LIST_FILE = 'Corps address list.csv'

const POPULATION_COLUMNS = new Map([
    [2013, '2013 Population'],
    [2024, '2024 Estimate'],
    [2050, '2050 Projection']
])

/**
 * @param {string} value
 * @returns {number | null}
 */
const toCoordinate = (value) => {
    const coordinate = parseFloat(value)
    return Number.isNaN(coordinate) ? null : coordinate
}

/**
 * @param {string} value
 * @returns {Date | null}
 */
const toClosingDate = (value) => {
    const date = parse(value, 'dd/MM/yyyy', new Date())
    return isValid(date) ? date : null
}

/**
 * CorpsDirectory backed by the corps address list export.
 * @implements {CorpsDirectory}
 */
export class AddressListCsvDirectory {
    /**
     * Read the address list once from the data folder.
     * @param {string} dataFolder
     * @returns {Promise<AddressListCsvDirectory>} Rejects naming the export when it cannot be read
     */
    static async load(dataFolder) {
        return new AddressListCsvDirectory(await readCsv(path.join(dataFolder, ADDRESS_LIST_FILE)))
    }

    /**
     * @param {Record<string, string>[]} rows
     */
    constructor(rows) {
        /** @type {Map<string, Corps>} */
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

    /**
     * @param {string} centreId
     */
    get(centreId) {
        return this.corpsById.get(centreId) ?? null
    }

    /**
     * @param {string} centreId
     * @param {number} year
     */
    population(centreId, year) {
        return this.corpsById.get(centreId)?.population.find(p => p.year === year)?.value ?? null
    }
}
