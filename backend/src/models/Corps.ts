import type { Population } from './Population.ts'

export interface Corps {
    id: string
    name: string
    area: string
    address: string
    city: string
    country: string
    closingDate: Date | null
    lat: number | null
    lng: number | null
    population: Population[]
}

export interface RegionalCorps extends Corps {
    region: string
}
