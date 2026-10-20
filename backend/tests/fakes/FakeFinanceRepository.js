export class FakeFinanceRepository {
    constructor({ corps, tithing = {}, monthlyTithing = {}, surplusDeficit = {} }) {
        this.corpsList = corps
        this.tithingData = tithing
        this.monthlyTithingData = monthlyTithing
        this.surplusDeficitData = surplusDeficit
    }

    years() {
        const years = [this.tithingData, this.surplusDeficitData].flatMap(byCorps => Object.values(byCorps)).flatMap(byYear => Object.keys(byYear))
        return [...new Set(years.map(Number))].sort((a, b) => a - b)
    }

    corps() {
        return this.corpsList
    }

    tithing(centreId, year) {
        return this.tithingData[centreId]?.[year] ?? null
    }

    monthlyTithing(centreId, year) {
        return this.monthlyTithingData[centreId]?.[year] ?? []
    }

    surplusDeficit(centreId, year) {
        return this.surplusDeficitData[centreId]?.[year] ?? null
    }
}
