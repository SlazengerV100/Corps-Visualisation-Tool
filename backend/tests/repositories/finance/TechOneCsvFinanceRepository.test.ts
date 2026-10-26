import { describe, expect, test } from 'vitest'
import { TechOneCsvFinanceRepository } from '../../../src/repositories/finance/TechOneCsvFinanceRepository.ts'
import { describeFinanceRepositoryContract } from './financeRepositoryContract.ts'

describe('TechOneCsvFinanceRepository', () => {
    describeFinanceRepositoryContract(() => TechOneCsvFinanceRepository.load(process.env.DATA_FOLDER))

    describe('load', () => {
        test('should reject naming the export that cannot be read', async () => {
            await expect(TechOneCsvFinanceRepository.load('./missing-data')).rejects.toThrow('Territorial_Tithing_2000_2025.csv')
        })
    })

    describe('surplusDeficit', () => {
        test('should use the location the corps tithed under that year, not an earlier one', async () => {
            const repository = await TechOneCsvFinanceRepository.load(process.env.DATA_FOLDER)
            expect(repository.surplusDeficit('100001', 2024)).toBe(2500)
        })
    })
})
