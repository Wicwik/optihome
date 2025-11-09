export type Property = {
  id: number
  uuid: string
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

export type ScrapingStatus = {
  status: 'idle' | 'running' | 'completed' | 'error'
  current_kind: string | null
  current_page: number
  total_pages: number
  items_processed: number
  items_total: number
  progress_percentage: number
  start_time: string | null
  end_time: string | null
  error_message: string | null
  next_scheduled_run: string | null
  scheduler_enabled: boolean
}

export type ScrapingLog = {
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'debug'
  message: string
}

export type ScrapingLogs = {
  logs: ScrapingLog[]
  total: number
}



