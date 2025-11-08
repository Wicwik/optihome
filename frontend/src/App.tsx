import { useCallback, useEffect, useMemo, useState } from 'react'
import { MapView } from './components/MapView'
import { Sidebar } from './components/Sidebar'
import { Filters, Filters as FiltersType } from './components/Filters'
import type { Property } from './types'
import { fetchPareto, fetchProperties } from './api/client'

export default function App() {
  const [filters, setFilters] = useState<FiltersType>({})
  const [bbox, setBbox] = useState<[number, number, number, number] | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [paretoIds, setParetoIds] = useState<Set<number>>(new Set())

  const params = useMemo(() => {
    const p: Record<string, any> = { ...filters }
    if (bbox) p.bbox = bbox.join(',')
    return p
  }, [filters, bbox])

  useEffect(() => {
    fetchProperties(params).then(res => setProperties(res.items)).catch(() => setProperties([]))
    fetchPareto(params).then(res => setParetoIds(new Set(res.items.map(i => i.id)))).catch(() => setParetoIds(new Set()))
  }, [params])

  const onBoundsChange = useCallback((b: [number, number, number, number]) => setBbox(b), [])
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Filters value={filters} onChange={setFilters} />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          properties={properties}
          paretoIds={paretoIds}
          onSelectProperty={setSelectedProperty}
        />
        <div style={{ flex: 1, position: 'relative' }}>
          <MapView 
            properties={properties} 
            paretoIds={paretoIds} 
            onBoundsChange={onBoundsChange}
            selectedProperty={selectedProperty}
          />
        </div>
      </div>
    </div>
  )
}



