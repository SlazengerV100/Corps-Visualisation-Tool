export class FakeMissionRepository {
    constructor({ corps, yearly = {}, monthly = {} }) {
        this.corpsList = corps
        this.yearlyData = yearly
        this.monthlyData = monthly
    }

    years() {
        const years = [...Object.values(this.yearlyData), ...Object.values(this.monthlyData)].flatMap(byYear => Object.keys(byYear))
        return [...new Set(years.map(Number))].sort((a, b) => a - b)
    }

    corps() {
        return this.corpsList
    }

    yearly(centreId, year) {
        return this.yearlyData[centreId]?.[year] ?? null
    }

    monthly(centreId, year, indicator) {
        return this.monthlyData[centreId]?.[year]?.[indicator] ?? []
    }
}
