import fs from 'fs'
import csv from 'csv-parser'

/**
 * Read every row of a CSV file, with any byte-order mark stripped from the headers.
 * @returns Rejects naming the file when it cannot be read
 */
export function readCsv(filePath: string): Promise<Record<string, string>[]> {
    return new Promise((resolve, reject) => {
        const rows: Record<string, string>[] = []
        fs.createReadStream(filePath)
            .on('error', err => reject(new Error(`Failed to read ${filePath}: ${err.message}`)))
            .pipe(csv({ mapHeaders: ({ header }) => header.replace(/^﻿/, '') }))
            .on('data', (row: Record<string, string>) => rows.push(row))
            .on('end', () => resolve(rows))
            .on('error', err => reject(new Error(`Failed to parse ${filePath}: ${err.message}`)))
    })
}

/**
 * Read several CSV files, waiting for every read to finish.
 * @returns Rejects naming every file that cannot be read
 */
export async function readCsvs(filePaths: string[]): Promise<Record<string, string>[][]> {
    const results = await Promise.allSettled(filePaths.map(readCsv))
    const failures = results.flatMap(r => r.status === 'rejected' ? [r.reason instanceof Error ? r.reason.message : String(r.reason)] : [])
    if (failures.length) {
        throw new Error(failures.join('\n'))
    }
    return results.flatMap(r => r.status === 'fulfilled' ? [r.value] : [])
}

export const getOrCreate = <K, V>(map: Map<K, V>, key: K, create: () => NoInfer<V>): V => {
    let value = map.get(key)
    if (value === undefined) {
        value = create()
        map.set(key, value)
    }
    return value
}
