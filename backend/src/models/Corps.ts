import type { Population } from './Population.ts'

export interface Corps {
    id: string
    name: string
    area: string
    address: string
    city: string
    closingDate: Date | null
    lat: number | null
    lng: number | null
    population: Population[]
}
