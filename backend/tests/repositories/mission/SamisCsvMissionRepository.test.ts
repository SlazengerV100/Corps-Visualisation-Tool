import { describe, expect, test } from 'vitest'
import { SamisCsvMissionRepository } from '../../../src/repositories/mission/SamisCsvMissionRepository.ts'
import { describeMissionRepositoryContract } from './missionRepositoryContract.ts'
import { dataFolder } from '../scenario.ts'

describe('SamisCsvMissionRepository', () => {
    describeMissionRepositoryContract(() => SamisCsvMissionRepository.load(dataFolder))

    describe('load', () => {
        test('should reject naming every export that cannot be read', async () => {
            const loading = SamisCsvMissionRepository.load('./missing-data')
            await expect(loading).rejects.toThrow('Territory_Indicators_Yr2000_2025.csv')
            await expect(loading).rejects.toThrow('Territory_Indicators_Mth2000_2025.csv')
        })
    })
})
