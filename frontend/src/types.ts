export type Property = {
  id: number
  external_id: string
  url: string
  title: string
  type: 'flat' | 'house'
  price_eur: number
  area_m2: number
  rooms: number
  price_per_m2: number
  year_built?: number | null
  address?: string | null
  lat?: number | null
  lng?: number | null
}

export type PropertiesResponse = { items: Property[]; total: number }

export type ParetoItem = {
  id: number
  price_eur: number
  price_per_m2: number
  rooms: number
  year_built?: number | null
}



