import { useState } from 'react'
import type { Property } from '../types'

export function Sidebar({
  properties,
  paretoIds,
  onSelectProperty,
}: {
  properties: Property[]
  paretoIds: Set<number>
  onSelectProperty?: (prop: Property) => void
}) {
  const [sortBy, setSortBy] = useState<'price' | 'area' | 'rooms' | 'year'>('price')
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const sorted = [...properties].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return (a.price_eur || 0) - (b.price_eur || 0)
      case 'area':
        return (b.area_m2 || 0) - (a.area_m2 || 0)
      case 'rooms':
        return (b.rooms || 0) - (a.rooms || 0)
      case 'year':
        return (b.year_built || 0) - (a.year_built || 0)
      default:
        return 0
    }
  })

  function handleClick(prop: Property) {
    setSelectedId(prop.id)
    onSelectProperty?.(prop)
  }

  return (
    <div style={{ width: '300px', height: '100%', overflow: 'auto', borderRight: '1px solid #ccc', padding: '8px' }}>
      <div style={{ marginBottom: '16px' }}>
        <label>Sort by: </label>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}>
          <option value="price">Price</option>
          <option value="area">Area</option>
          <option value="rooms">Rooms</option>
          <option value="year">Year Built</option>
        </select>
      </div>
      <div style={{ marginBottom: '8px', fontSize: '14px', color: '#666' }}>
        Showing {properties.length} properties ({paretoIds.size} Pareto-optimal)
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sorted.map(prop => (
          <div
            key={prop.id}
            onClick={() => handleClick(prop)}
            style={{
              padding: '12px',
              border: selectedId === prop.id ? '2px solid #007bff' : '1px solid #ddd',
              borderRadius: '4px',
              cursor: 'pointer',
              backgroundColor: paretoIds.has(prop.id) ? '#e8f5e9' : selectedId === prop.id ? '#f0f8ff' : 'white',
            }}
          >
            <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
              {prop.title || 'Property listing'}
              {paretoIds.has(prop.id) && <span style={{ color: '#4caf50', marginLeft: '8px' }}>★</span>}
            </div>
            <div style={{ fontSize: '14px', color: '#666' }}>
              <div>{prop.price_eur?.toLocaleString()} €</div>
              <div>{prop.area_m2} m² · {prop.rooms || 0} rooms</div>
              {prop.year_built && <div>Built: {prop.year_built}</div>}
              {prop.address && <div style={{ fontSize: '12px', marginTop: '4px' }}>{prop.address}</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

