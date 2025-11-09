import { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { MapView } from './components/MapView'
import { Sidebar } from './components/Sidebar'
import { Statistics } from './components/Statistics'
import { ScrapingManagement } from './components/ScrapingManagement'
import { Filters, Filters as FiltersType } from './components/Filters'
import type { Property } from './types'
import { fetchPareto, fetchProperties, geocodeLocation } from './api/client'
import './styles.css'

export default function App() {
  const [filters, setFilters] = useState<FiltersType>({})
  const [bbox, setBbox] = useState<[number, number, number, number] | null>(null)
  const [properties, setProperties] = useState<Property[]>([])
  const [paretoIds, setParetoIds] = useState<Set<number>>(new Set())
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lng: number } | null>(null)
  const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const params = useMemo(() => {
    const p: Record<string, any> = { ...filters }
    if (bbox) p.bbox = bbox.join(',')
    return p
  }, [filters, bbox])

  useEffect(() => {
    fetchProperties(params).then(res => setProperties(res.items)).catch(() => setProperties([]))
    fetchPareto(params).then(res => setParetoIds(new Set(res.items.map(i => i.id)))).catch(() => setParetoIds(new Set()))
  }, [params])

  // Geocode location when location filter changes
  useEffect(() => {
    // Clear any pending geocode request
    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current)
    }

    if (filters.location && filters.location.trim().length > 0) {
      // Debounce geocoding to avoid too many requests
      geocodeTimeoutRef.current = setTimeout(() => {
        geocodeLocation(filters.location!)
          .then(coords => setLocationCoords(coords))
          .catch(() => setLocationCoords(null))
      }, 500) // Wait 500ms after user stops typing
    } else {
      setLocationCoords(null)
    }

    return () => {
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current)
      }
    }
  }, [filters.location])

  const onBoundsChange = useCallback((b: [number, number, number, number]) => setBbox(b), [])
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
  const [activeTab, setActiveTab] = useState<'map' | 'statistics' | 'scraping'>('map')
  const [mapResetTrigger, setMapResetTrigger] = useState(0)

  const handleClearAllFilters = useCallback(() => {
    setFilters({})
    setBbox(null)
    setLocationCoords(null)
    setSelectedProperty(null)
    // Trigger map reset
    setMapResetTrigger(prev => prev + 1)
  }, [])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'linear-gradient(to bottom, var(--color-background), #f1f5f9)',
      }}
    >
      <Filters value={filters} onChange={setFilters} properties={properties} onClearAll={handleClearAllFilters} />
      <div style={{ display: 'flex', borderBottom: '1px solid #ccc', backgroundColor: 'white' }}>
        <button
          onClick={() => setActiveTab('map')}
          style={{
            padding: '12px 24px',
            border: 'none',
            borderBottom: activeTab === 'map' ? '2px solid #007bff' : '2px solid transparent',
            backgroundColor: activeTab === 'map' ? '#f0f8ff' : 'white',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: activeTab === 'map' ? 'bold' : 'normal',
          }}
        >
          Map View
        </button>
        <button
          onClick={() => setActiveTab('statistics')}
          style={{
            padding: '12px 24px',
            border: 'none',
            borderBottom: activeTab === 'statistics' ? '2px solid #007bff' : '2px solid transparent',
            backgroundColor: activeTab === 'statistics' ? '#f0f8ff' : 'white',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: activeTab === 'statistics' ? 'bold' : 'normal',
          }}
        >
          Statistics
        </button>
        <button
          onClick={() => setActiveTab('scraping')}
          style={{
            padding: '12px 24px',
            border: 'none',
            borderBottom: activeTab === 'scraping' ? '2px solid #007bff' : '2px solid transparent',
            backgroundColor: activeTab === 'scraping' ? '#f0f8ff' : 'white',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: activeTab === 'scraping' ? 'bold' : 'normal',
          }}
        >
          Scraping Management
        </button>
      </div>
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', gap: 0 }}>
        {activeTab === 'map' && (
          <>
            <Sidebar
              properties={properties}
              paretoIds={paretoIds}
              onSelectProperty={setSelectedProperty}
            />
            <div
              style={{
                flex: 1,
                position: 'relative',
                borderRadius: 'var(--radius-lg)',
                margin: 'var(--spacing-md)',
                marginLeft: 0,
                overflow: 'hidden',
                boxShadow: '0 4px 6px var(--color-shadow)',
              }}
            >
              <MapView 
                properties={properties} 
                paretoIds={paretoIds} 
                onBoundsChange={onBoundsChange}
                selectedProperty={selectedProperty}
                locationCoords={locationCoords}
                resetTrigger={mapResetTrigger}
              />
            </div>
          </>
        )}
        {activeTab === 'statistics' && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <Statistics 
              properties={properties} 
              onApplyFilter={(newFilters) => {
                setFilters(prev => ({ ...prev, ...newFilters }))
                // Switch to map view to see the filtered results
                setActiveTab('map')
              }}
            />
          </div>
        )}
        {activeTab === 'scraping' && (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ScrapingManagement />
          </div>
        )}
      </div>
    </div>
  )
}



