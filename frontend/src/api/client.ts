import axios from 'axios'
import type { PropertiesResponse, ParetoItem, ScrapingStatus, ScrapingLogs } from '../types'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
})

export async function fetchProperties(params: Record<string, any>): Promise<PropertiesResponse> {
  const { data } = await api.get('/properties', { params })
  return data
}

export async function fetchPareto(params: Record<string, any>): Promise<{ items: ParetoItem[] }> {
  const { data } = await api.get('/properties/pareto', { params })
  return data
}

export async function geocodeLocation(query: string): Promise<{ lat: number; lng: number }> {
  const { data } = await api.get('/properties/geocode', { params: { query } })
  return data
}

export async function getScrapingStatus(): Promise<ScrapingStatus> {
  const { data } = await api.get('/scrape/status')
  return data
}

export async function getScrapingLogs(limit: number = 100): Promise<ScrapingLogs> {
  const { data } = await api.get('/scrape/logs', { params: { limit } })
  return data
}

export async function triggerScrape(kind: 'flat' | 'house' = 'flat', pages: number = 1): Promise<{ status: string; inserted_or_updated: number }> {
  const { data } = await api.post('/scrape/run', null, { params: { kind, pages } })
  return data
}

export async function enableScheduler(hour: number = 2, minute: number = 0): Promise<{ status: string; schedule?: string; error?: string }> {
  const { data } = await api.post('/scrape/scheduler/enable', null, { params: { hour, minute } })
  return data
}

export async function disableScheduler(): Promise<{ status: string }> {
  const { data } = await api.post('/scrape/scheduler/disable')
  return data
}



