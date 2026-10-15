import { AddressListCsvDirectory } from '../../stores/AddressListCsvDirectory.js'
import { describeCorpsDirectoryContract } from './contracts/corpsDirectoryContract.js'

describe('AddressListCsvDirectory', () => {
    describeCorpsDirectoryContract(() => AddressListCsvDirectory.load(process.env.DATA_FOLDER))

    describe('load', () => {
        test('should reject naming the export that cannot be read', async () => {
            await expect(AddressListCsvDirectory.load('./missing-data')).rejects.toThrow('Corps address list.csv')
        })
    })
})
