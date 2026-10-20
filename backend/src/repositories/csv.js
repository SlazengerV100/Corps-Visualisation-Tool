import fs from 'fs'
import csv from 'csv-parser'

/**
 * Read every row of a CSV file, with any byte-order mark stripped from the headers.
 * @param {string} filePath
 * @returns {Promise<Record<string, string>[]>} Rejects naming the file when it cannot be read
 */
export function readCsv(filePath) {
    return new Promise((resolve, reject) => {
        /** @type {Record<string, string>[]} */
        const rows = []
        fs.createReadStream(filePath)
            .on('error', err => reject(new Error(`Failed to read ${filePath}: ${err.message}`)))
            .pipe(csv({ mapHeaders: ({ header }) => header.replace(/^﻿/, '') }))
            .on('data', row => rows.push(row))
            .on('end', () => resolve(rows))
            .on('error', err => reject(new Error(`Failed to parse ${filePath}: ${err.message}`)))
    })
}

/**
 * @template K, V
 * @param {Map<K, V>} map
 * @param {K} key
 * @param {() => NoInfer<V>} create
 * @returns {V}
 */
export const getOrCreate = (map, key, create) => {
    let value = map.get(key)
    if (value === undefined) {
        value = create()
        map.set(key, value)
    }
    return value
}
