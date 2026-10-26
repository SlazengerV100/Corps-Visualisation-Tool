import { describe, expect, test } from 'vitest'
import { AddressListCsvDirectoryRepository } from '../../../src/repositories/directory/AddressListCsvDirectoryRepository.ts'
import { describeCorpsDirectoryRepositoryContract } from './corpsDirectoryRepositoryContract.ts'

describe('AddressListCsvDirectoryRepository', () => {
    describeCorpsDirectoryRepositoryContract(() => AddressListCsvDirectoryRepository.load(process.env.DATA_FOLDER))

    describe('load', () => {
        test('should reject naming the export that cannot be read', async () => {
            await expect(AddressListCsvDirectoryRepository.load('./missing-data')).rejects.toThrow('Corps address list.csv')
        })
    })
})
