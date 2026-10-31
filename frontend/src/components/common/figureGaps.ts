// Which year a figure is missing for: this year shows red, last year (as in the corps panel) yellow
export type FigureGap = 'thisYear' | 'lastYear'

export const gapColours: Record<FigureGap, string> = { thisYear: 'error.main', lastYear: 'warning.main' }
