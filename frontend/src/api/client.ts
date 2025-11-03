import axios from 'axios'
import type { PropertiesResponse, ParetoItem } from '../types'

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



