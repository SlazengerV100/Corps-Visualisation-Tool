import { describe, expect, test } from 'vitest'
import { SamisCsvMissionRepository } from '../../../src/repositories/mission/SamisCsvMissionRepository.ts'
import { describeMissionRepositoryContract } from './missionRepositoryContract.ts'
import { dataFolder } from '../scenario.ts'

describe('SamisCsvMissionRepository', () => {
    describeMissionRepositoryContract(() => SamisCsvMissionRepository.load(dataFolder))

    describe('load', () => {
        test('should reject naming the export that cannot be read', async () => {
            await expect(SamisCsvMissionRepository.load('./missing-data')).rejects.toThrow('Territory_Indicators_Yr2000_2025.csv')
        })
    })
})
