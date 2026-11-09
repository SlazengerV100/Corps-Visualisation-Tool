import { describe, expect, test } from 'vitest'
import { TechOneCsvFinanceRepository } from '../../../src/repositories/finance/TechOneCsvFinanceRepository.ts'
import { describeFinanceRepositoryContract } from './financeRepositoryContract.ts'
import { dataFolder } from '../scenario.ts'

describe('TechOneCsvFinanceRepository', () => {
    describeFinanceRepositoryContract(() => TechOneCsvFinanceRepository.load(dataFolder))

    describe('load', () => {
        test('should reject naming every export that cannot be read', async () => {
            const loading = TechOneCsvFinanceRepository.load('./missing-data')
            await expect(loading).rejects.toThrow('Territorial_Tithing_2000_2025.csv')
            await expect(loading).rejects.toThrow('Surplus-Deficit Summary.csv')
        })
    })

    describe('surplusDeficit', () => {
        test('should use the location the corps tithed under that year, not an earlier one', async () => {
            const repository = await TechOneCsvFinanceRepository.load(dataFolder)
            expect(repository.surplusDeficit('100001', 2024)).toBe(2500)
        })
    })
})
