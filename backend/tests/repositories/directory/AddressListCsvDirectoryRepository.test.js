import { AddressListCsvDirectoryRepository } from '../../../src/repositories/directory/AddressListCsvDirectoryRepository.js'
import { describeCorpsDirectoryRepositoryContract } from './corpsDirectoryRepositoryContract.js'

describe('AddressListCsvDirectoryRepository', () => {
    describeCorpsDirectoryRepositoryContract(() => AddressListCsvDirectoryRepository.load(process.env.DATA_FOLDER))

    describe('load', () => {
        test('should reject naming the export that cannot be read', async () => {
            await expect(AddressListCsvDirectoryRepository.load('./missing-data')).rejects.toThrow('Corps address list.csv')
        })
    })
})
