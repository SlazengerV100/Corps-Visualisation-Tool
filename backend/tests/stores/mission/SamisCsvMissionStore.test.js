import { SamisCsvMissionStore } from '../../../src/stores/mission/SamisCsvMissionStore.js'
import { describeMissionStoreContract } from './missionStoreContract.js'

describe('SamisCsvMissionStore', () => {
    describeMissionStoreContract(() => SamisCsvMissionStore.load(process.env.DATA_FOLDER))

    describe('load', () => {
        test('should reject naming the export that cannot be read', async () => {
            await expect(SamisCsvMissionStore.load('./missing-data')).rejects.toThrow('Territory_Indicators_Yr2000_2025.csv')
        })
    })
})
