import { TechOneCsvFinanceStore } from '../../../src/stores/finance/TechOneCsvFinanceStore.js'
import { describeFinanceStoreContract } from './financeStoreContract.js'

describe('TechOneCsvFinanceStore', () => {
    describeFinanceStoreContract(() => TechOneCsvFinanceStore.load(process.env.DATA_FOLDER))

    describe('load', () => {
        test('should reject naming the export that cannot be read', async () => {
            await expect(TechOneCsvFinanceStore.load('./missing-data')).rejects.toThrow('Territorial_Tithing_2000_2025.csv')
        })
    })

    describe('surplusDeficit', () => {
        test('should use the location the corps tithed under that year, not an earlier one', async () => {
            const store = await TechOneCsvFinanceStore.load(process.env.DATA_FOLDER)
            expect(store.surplusDeficit('100001', 2024)).toBe(2500)
        })
    })
})
