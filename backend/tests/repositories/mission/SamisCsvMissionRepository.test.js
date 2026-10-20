import { SamisCsvMissionRepository } from '../../../src/repositories/mission/SamisCsvMissionRepository.js'
import { describeMissionRepositoryContract } from './missionRepositoryContract.js'

describe('SamisCsvMissionRepository', () => {
    describeMissionRepositoryContract(() => SamisCsvMissionRepository.load(process.env.DATA_FOLDER))

    describe('load', () => {
        test('should reject naming the export that cannot be read', async () => {
            await expect(SamisCsvMissionRepository.load('./missing-data')).rejects.toThrow('Territory_Indicators_Yr2000_2025.csv')
        })
    })
})
