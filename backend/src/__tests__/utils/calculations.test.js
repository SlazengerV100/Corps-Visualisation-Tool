import { 
  getGrowthBand, 
  getSustainabilityBand, 
  calculateNominalChange,
  calculateNominalSustainability,
  calculatePercentageChange,
  calculateGrowth,
  calculateSustainability,
  updateCurrentCorps
} from '../../utils/calculations.js'

describe('Calculation Utilities', () => {
  describe('getGrowthBand', () => {
    test('should return minBand (30) for small congregations', () => {
      expect(getGrowthBand(20)).toBe(30)
      expect(getGrowthBand(25)).toBe(30)
      expect(getGrowthBand(0)).toBe(30)
      expect(getGrowthBand(-10)).toBe(30)
    })

    test('should return maxBand (70) for large congregations', () => {
      expect(getGrowthBand(250)).toBe(70)
      expect(getGrowthBand(300)).toBe(70)
      expect(getGrowthBand(200)).toBe(70)
    })

    test('should calculate proportional band for medium congregations', () => {
      // Test exact middle value (112.5)
      const middleValue = (25 + 200) / 2
      const result = getGrowthBand(middleValue)
      expect(result).toBeCloseTo(50, 0) // Should be around 50 for middle value

      // Test quarter value (68.75)
      const quarterValue = 25 + (200 - 25) * 0.25
      const quarterResult = getGrowthBand(quarterValue)
      expect(quarterResult).toBeCloseTo(40, 0) // Should be around 40

      // Test three-quarter value (156.25)
      const threeQuarterValue = 25 + (200 - 25) * 0.75
      const threeQuarterResult = getGrowthBand(threeQuarterValue)
      expect(threeQuarterResult).toBeCloseTo(60, 0) // Should be around 60
    })

    test('should handle edge cases correctly', () => {
      expect(getGrowthBand(25.1)).toBeGreaterThan(30)
      expect(getGrowthBand(199.9)).toBeLessThan(70)
    })

    test('should return a number for all inputs', () => {
      expect(typeof getGrowthBand(100)).toBe('number')
      expect(typeof getGrowthBand(0)).toBe('number')
      expect(typeof getGrowthBand(1000)).toBe('number')
    })
  })

  describe('getSustainabilityBand', () => {
    test('should return minBand (30) for low tithing per person', () => {
      expect(getSustainabilityBand(400)).toBe(30)
      expect(getSustainabilityBand(500)).toBe(30)
      expect(getSustainabilityBand(0)).toBe(30)
      expect(getSustainabilityBand(-100)).toBe(30)
    })

    test('should return maxBand (70) for high tithing per person', () => {
      expect(getSustainabilityBand(2500)).toBe(70)
      expect(getSustainabilityBand(3000)).toBe(70)
      expect(getSustainabilityBand(2000)).toBe(70)
    })

    test('should calculate proportional band for medium tithing', () => {
      // Test exact middle value (1250)
      const middleValue = (500 + 2000) / 2
      const result = getSustainabilityBand(middleValue)
      expect(result).toBeCloseTo(50, 0) // Should be around 50 for middle value

      // Test quarter value (875)
      const quarterValue = 500 + (2000 - 500) * 0.25
      const quarterResult = getSustainabilityBand(quarterValue)
      expect(quarterResult).toBeCloseTo(40, 0) // Should be around 40

      // Test three-quarter value (1625)
      const threeQuarterValue = 500 + (2000 - 500) * 0.75
      const threeQuarterResult = getSustainabilityBand(threeQuarterValue)
      expect(threeQuarterResult).toBeCloseTo(60, 0) // Should be around 60
    })

    test('should handle edge cases correctly', () => {
      expect(getSustainabilityBand(500.1)).toBeGreaterThan(30)
      expect(getSustainabilityBand(1999.9)).toBeLessThan(70)
    })

    test('should return a number for all inputs', () => {
      expect(typeof getSustainabilityBand(1000)).toBe('number')
      expect(typeof getSustainabilityBand(0)).toBe('number')
      expect(typeof getSustainabilityBand(5000)).toBe('number')
    })
  })

  describe('calculateNominalChange', () => {
    test('should calculate positive nominal change', () => {
      const result = calculateNominalChange(100, 120)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThanOrEqual(15) // Should be capped at maxPointsChange
    })

    test('should calculate negative nominal change', () => {
      const result = calculateNominalChange(120, 100)
      expect(result).toBeLessThan(0)
      expect(result).toBeGreaterThanOrEqual(-15) // Should be capped at -maxPointsChange
    })

    test('should cap at maxPointsChange (15) for large increases', () => {
      const result = calculateNominalChange(100, 1000)
      expect(result).toBe(15)
    })

    test('should cap at negative maxPointsChange (-15) for large decreases', () => {
      const result = calculateNominalChange(1000, 100)
      expect(result).toBe(-15)
    })

    test('should return 0 for no change', () => {
      const result = calculateNominalChange(100, 100)
      expect(result).toBe(0)
    })

    test('should handle edge cases', () => {
      expect(calculateNominalChange(0, 0)).toBe(0)
      expect(calculateNominalChange(0, 100)).toBe(15) // Should cap at 15
      expect(calculateNominalChange(100, 0)).toBe(-15) // Should cap at -15
    })

    test('should return a number for all inputs', () => {
      expect(typeof calculateNominalChange(100, 120)).toBe('number')
      expect(typeof calculateNominalChange(0, 0)).toBe('number')
    })
  })

  describe('calculateNominalSustainability', () => {
    test('should calculate positive nominal sustainability change', () => {
      const result = calculateNominalSustainability(1000, 1200)
      expect(result).toBeGreaterThan(0)
      expect(result).toBeLessThanOrEqual(15) // Should be capped at maxPointsChange
    })

    test('should calculate negative nominal sustainability change', () => {
      const result = calculateNominalSustainability(1200, 1000)
      expect(result).toBeLessThan(0)
      expect(result).toBeGreaterThanOrEqual(-15) // Should be capped at -maxPointsChange
    })

    test('should cap at maxPointsChange (15) for more than $40,000 increase', () => {
      const result = calculateNominalSustainability(1000, 41000)
      expect(result).toBe(15)
    })

    test('should cap at negative maxPointsChange (-15) for more than $40,000 decrease', () => {
      const result = calculateNominalSustainability(100000, 60000)
      expect(result).toBe(-15)
    })

    test('should return 0 for no change', () => {
      const result = calculateNominalSustainability(1000, 1000)
      expect(result).toBe(0)
    })

    test('should return a number for all inputs', () => {
      expect(typeof calculateNominalSustainability(1000, 1200)).toBe('number')
      expect(typeof calculateNominalSustainability(0, 0)).toBe('number')
    })
  })

  describe('calculatePercentageChange', () => {
    test('should calculate positive percentage change', () => {
      expect(calculatePercentageChange(100, 120)).toBe(0.2)
      expect(calculatePercentageChange(50, 75)).toBe(0.5)
      expect(calculatePercentageChange(200, 300)).toBe(0.5)
    })

    test('should calculate negative percentage change', () => {
      expect(calculatePercentageChange(100, 80)).toBe(-0.2)
      expect(calculatePercentageChange(200, 150)).toBe(-0.25)
      expect(calculatePercentageChange(1000, 800)).toBe(-0.2)
    })

    test('should return 0 for no change', () => {
      expect(calculatePercentageChange(100, 100)).toBe(0)
      expect(calculatePercentageChange(0.5, 0.5)).toBe(0)
    })

    test('should handle decimal values', () => {
      expect(calculatePercentageChange(10.5, 12.6)).toBeCloseTo(0.2, 5)
      expect(calculatePercentageChange(0.1, 0.15)).toBeCloseTo(0.5, 5)
    })

    test('should throw error for zero previous year', () => {
      expect(() => calculatePercentageChange(0, 100)).toThrow('Cannot calculate percentage change when previous year is less than or equal to zero')
      expect(() => calculatePercentageChange(0, 0)).toThrow('Cannot calculate percentage change when previous year is less than or equal to zero')
    })

    test('should handle negative values', () => {
      expect(() => calculatePercentageChange(-100, -80)).toThrow('Cannot calculate percentage change when previous year is less than or equal to zero')
      expect(() => calculatePercentageChange(-100, -120)).toThrow('Cannot calculate percentage change when previous year is less than or equal to zero')
    })

    test('should return a number for valid inputs', () => {
      expect(typeof calculatePercentageChange(100, 120)).toBe('number')
      expect(() => calculatePercentageChange(-100, -80)).toThrow('Cannot calculate percentage change when previous year is less than or equal to zero')
    })
  })

  describe('updateCurrentCorps', () => {
    const createMockMetrics = () => ({
      congregationalWorship: { currentYear: null, prevYear: null },
      firstTimeDecisions: { currentYear: 0, prevYear: 0 },
      kidsChurch: { currentYear: null, prevYear: null },
      youthDiscipleship: { currentYear: null, prevYear: null }
    })

    test('should update congregational worship current year', () => {
      const metrics = createMockMetrics()
      const result = updateCurrentCorps(metrics, '01-Congregational Worship', 50, 'currentYear')
      expect(result.congregationalWorship.currentYear).toBe(50)
      expect(result.congregationalWorship.prevYear).toBe(null)
    })

    test('should update congregational worship previous year', () => {
      const metrics = createMockMetrics()
      const result = updateCurrentCorps(metrics, '01-Congregational Worship', 45, 'prevYear')
      expect(result.congregationalWorship.prevYear).toBe(45)
      expect(result.congregationalWorship.currentYear).toBe(null)
    })

    test('should update first time decisions current year', () => {
      const metrics = createMockMetrics()
      const result = updateCurrentCorps(metrics, '03A-First Time Decisions', 10, 'currentYear')
      expect(result.firstTimeDecisions.currentYear).toBe(10)
      expect(result.firstTimeDecisions.prevYear).toBe(0)
    })

    test('should update first time decisions previous year', () => {
      const metrics = createMockMetrics()
      const result = updateCurrentCorps(metrics, '03A-First Time Decisions', 8, 'prevYear')
      expect(result.firstTimeDecisions.prevYear).toBe(8)
      expect(result.firstTimeDecisions.currentYear).toBe(0)
    })

    test('should update kids church current year', () => {
      const metrics = createMockMetrics()
      const result = updateCurrentCorps(metrics, '04-Kids Church', 25, 'currentYear')
      expect(result.kidsChurch.currentYear).toBe(25)
      expect(result.kidsChurch.prevYear).toBe(null)
    })

    test('should update kids church previous year', () => {
      const metrics = createMockMetrics()
      const result = updateCurrentCorps(metrics, '04-Kids Church', 20, 'prevYear')
      expect(result.kidsChurch.prevYear).toBe(20)
      expect(result.kidsChurch.currentYear).toBe(null)
    })

    test('should update youth discipleship current year', () => {
      const metrics = createMockMetrics()
      const result = updateCurrentCorps(metrics, '05-Youth Discipleship', 15, 'currentYear')
      expect(result.youthDiscipleship.currentYear).toBe(15)
      expect(result.youthDiscipleship.prevYear).toBe(null)
    })

    test('should update youth discipleship previous year', () => {
      const metrics = createMockMetrics()
      const result = updateCurrentCorps(metrics, '05-Youth Discipleship', 12, 'prevYear')
      expect(result.youthDiscipleship.prevYear).toBe(12)
      expect(result.youthDiscipleship.currentYear).toBe(null)
    })

    test('should handle unknown metric names gracefully', () => {
      const metrics = createMockMetrics()
      const originalMetrics = JSON.parse(JSON.stringify(metrics)) // Deep copy
      const result = updateCurrentCorps(metrics, 'Unknown Metric', 100, 'currentYear')
      expect(result).toEqual(originalMetrics) // Should return unchanged metrics
    })

    test('should handle invalid year types gracefully', () => {
      const metrics = createMockMetrics()
      expect(() => updateCurrentCorps(metrics, '01-Congregational Worship', 50, 'invalidYearType')).toThrow('Year type must be either currentYear or prevYear')
    })

    test('should return the same metrics object reference', () => {
      const metrics = createMockMetrics()
      const result = updateCurrentCorps(metrics, '01-Congregational Worship', 50, 'currentYear')
      expect(result).toBe(metrics) // Should be the same object reference
    })

    test('should handle zero values', () => {
      const metrics = createMockMetrics()
      const result = updateCurrentCorps(metrics, '03A-First Time Decisions', 0, 'currentYear')
      expect(result.firstTimeDecisions.currentYear).toBe(0)
    })

    test('should handle negative values', () => {
      const metrics = createMockMetrics()
      const result = updateCurrentCorps(metrics, '01-Congregational Worship', -10, 'currentYear')
      expect(result.congregationalWorship.currentYear).toBe(-10)
    })
  })

  describe('calculateGrowth', () => {
    test('should calculate growth score for positive growth', () => {
      const metrics = {
        congregationalWorship: {
          currentYear: 120,
          prevYear: 100
        }
      }

      const result = calculateGrowth(metrics)
      expect(typeof result).toBe('number')
      expect(result).toBeGreaterThan(0)
      expect(Number.isInteger(result)).toBe(true) // Should be rounded
    })

    test('should calculate growth score for negative growth', () => {
      const metrics = {
        congregationalWorship: {
          currentYear: 80,
          prevYear: 100
        }
      }

      const result = calculateGrowth(metrics)
      expect(typeof result).toBe('number')
      expect(Number.isInteger(result)).toBe(true) // Should be rounded
    })

    test('should calculate growth score for no change', () => {
      const metrics = {
        congregationalWorship: {
          currentYear: 100,
          prevYear: 100
        }
      }

      const result = calculateGrowth(metrics)
      expect(typeof result).toBe('number')
      expect(Number.isInteger(result)).toBe(true) // Should be rounded
    })

    test('should handle benchmark threshold correctly', () => {
      // Test case where percentage change equals benchmark (0.1)
      const metrics = {
        congregationalWorship: {
          currentYear: 110,
          prevYear: 100
        }
      }

      const result = calculateGrowth(metrics)
      expect(typeof result).toBe('number')
      expect(Number.isInteger(result)).toBe(true)
    })

    test('should handle large congregations', () => {
      const metrics = {
        congregationalWorship: {
          currentYear: 250,
          prevYear: 200
        }
      }

      const result = calculateGrowth(metrics)
      expect(typeof result).toBe('number')
      expect(Number.isInteger(result)).toBe(true)
    })

    test('should handle small congregations', () => {
      const metrics = {
        congregationalWorship: {
          currentYear: 30,
          prevYear: 25
        }
      }

      const result = calculateGrowth(metrics)
      expect(typeof result).toBe('number')
      expect(Number.isInteger(result)).toBe(true)
    })

    test('should handle edge case with zero previous year', () => {
      const metrics = {
        congregationalWorship: {
          currentYear: 100,
          prevYear: 0
        }
      }

      // This should throw an error due to division by zero in calculatePercentageChange
      expect(() => calculateGrowth(metrics)).toThrow('Cannot calculate growth score when previous year is zero')
    })
  })

  describe('calculateSustainability', () => {
    test('should calculate sustainability score for valid metrics', () => {
      const metrics = {
        tithing: {
          currentYear: 10000,
          prevYear: 8000
        }
      }

      const result = calculateSustainability(metrics, 100)
      expect(typeof result).toBe('number')
      expect(result).toBeGreaterThan(0)
      expect(Number.isInteger(result)).toBe(true) // Should be rounded
    })

    test('should calculate sustainability score for different sizes', () => {
      const metrics = {
        tithing: {
          currentYear: 20000,
          prevYear: 18000
        }
      }

      const resultSmall = calculateSustainability(metrics, 50) // 400 per person
      const resultLarge = calculateSustainability(metrics, 200) // 100 per person

      expect(typeof resultSmall).toBe('number')
      expect(typeof resultLarge).toBe('number')
      expect(Number.isInteger(resultSmall)).toBe(true)
      expect(Number.isInteger(resultLarge)).toBe(true)
    })

    test('should handle zero size', () => {
      const metrics = {
        tithing: {
          currentYear: 10000,
          prevYear: 8000
        }
      }

      // This should result in division by zero (tithingPerPersonCurrentYear = 10000/0)
      const result = calculateSustainability(metrics, 0)
      expect(typeof result).toBe('number')
      expect(Number.isInteger(result)).toBe(true)
    })

    test('should handle negative tithing values', () => {
      const metrics = {
        tithing: {
          currentYear: -1000,
          prevYear: -2000
        }
      }

      const result = calculateSustainability(metrics, 100)
      expect(typeof result).toBe('number')
      expect(Number.isInteger(result)).toBe(true)
    })

    test('should handle zero tithing values', () => {
      const metrics = {
        tithing: {
          currentYear: 0,
          prevYear: 0
        }
      }

      const result = calculateSustainability(metrics, 100)
      expect(typeof result).toBe('number')
      expect(Number.isInteger(result)).toBe(true)
    })

    test('should handle large tithing values', () => {
      const metrics = {
        tithing: {
          currentYear: 100000,
          prevYear: 80000
        }
      }

      const result = calculateSustainability(metrics, 100)
      expect(typeof result).toBe('number')
      expect(Number.isInteger(result)).toBe(true)
    })

    test('should return consistent results for same inputs', () => {
      const metrics = {
        tithing: {
          currentYear: 10000,
          prevYear: 8000
        }
      }

      const result1 = calculateSustainability(metrics, 100)
      const result2 = calculateSustainability(metrics, 100)
      expect(result1).toBe(result2)
    })
  })

  describe('Integration Tests', () => {
    test('should work together for realistic scenarios', () => {
      // Test a realistic growth scenario
      const growthMetrics = {
        congregationalWorship: {
          currentYear: 150,
          prevYear: 120
        }
      }

      const sustainabilityMetrics = {
        tithing: {
          currentYear: 15000,
          prevYear: 12000
        }
      }

      const growthScore = calculateGrowth(growthMetrics)
      const sustainabilityScore = calculateSustainability(sustainabilityMetrics, 150)

      expect(typeof growthScore).toBe('number')
      expect(typeof sustainabilityScore).toBe('number')
      expect(Number.isInteger(growthScore)).toBe(true)
      expect(Number.isInteger(sustainabilityScore)).toBe(true)
    })

    test('should handle edge case scenarios', () => {
      // Test with very small values
      const smallMetrics = {
        congregationalWorship: {
          currentYear: 1,
          prevYear: 1
        }
      }

      const smallSustainabilityMetrics = {
        tithing: {
          currentYear: 1,
          prevYear: 1
        }
      }

      const growthScore = calculateGrowth(smallMetrics)
      const sustainabilityScore = calculateSustainability(smallSustainabilityMetrics, 1)

      expect(typeof growthScore).toBe('number')
      expect(typeof sustainabilityScore).toBe('number')
    })
  })
})
