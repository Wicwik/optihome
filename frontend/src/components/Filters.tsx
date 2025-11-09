import { useState, useEffect, useMemo } from 'react'
import type { Property } from '../types'

export type Filters = {
  type?: 'flat' | 'house'
  min_price?: number
  max_price?: number
  min_rooms?: number
  max_rooms?: number
  min_area?: number
  max_area?: number
  min_year?: number
  max_year?: number
  location?: string
}

// Default minimums and steps for sliders
const DEFAULT_MIN = {
  price: 0,
  area: 0,
  rooms: 0,
  year: 1900,
}

const STEPS = {
  price: 10000,
  area: 5,
  rooms: 1,
  year: 1,
}

function calculateRanges(properties: Property[]) {
  if (properties.length === 0) {
    return {
      price: { min: DEFAULT_MIN.price, max: 1000000, step: STEPS.price },
      area: { min: DEFAULT_MIN.area, max: 100, step: STEPS.area },
      rooms: { min: DEFAULT_MIN.rooms, max: 5, step: STEPS.rooms },
      year: { min: DEFAULT_MIN.year, max: new Date().getFullYear(), step: STEPS.year },
    }
  }

  const prices = properties.map(p => p.price_eur || 0).filter(p => p > 0)
  const areas = properties.map(p => p.area_m2 || 0).filter(a => a > 0)
  const rooms = properties.map(p => p.rooms || 0).filter(r => r > 0)
  const years = properties.map(p => p.year_built).filter((y): y is number => y != null && y > 0)

  return {
    price: {
      min: DEFAULT_MIN.price,
      max: Math.ceil((Math.max(...prices, 0) || 1000000) / 10000) * 10000, // Round up to nearest 10k
      step: STEPS.price,
    },
    area: {
      min: DEFAULT_MIN.area,
      max: Math.ceil((Math.max(...areas, 0) || 100) / 5) * 5, // Round up to nearest 5
      step: STEPS.area,
    },
    rooms: {
      min: DEFAULT_MIN.rooms,
      max: Math.max(...rooms, 0) || 5,
      step: STEPS.rooms,
    },
    year: {
      min: DEFAULT_MIN.year,
      max: Math.max(...years, new Date().getFullYear()),
      step: STEPS.year,
    },
  }
}

function RangeSlider({
  label,
  minValue,
  maxValue,
  min,
  max,
  step,
  onMinChange,
  onMaxChange,
  formatValue,
}: {
  label: string
  minValue?: number
  maxValue?: number
  min: number
  max: number
  step: number
  onMinChange: (value: number | undefined) => void
  onMaxChange: (value: number | undefined) => void
  formatValue: (value: number) => string
}) {
  const minVal = minValue ?? min
  const maxVal = maxValue ?? max

  return (
    <div className="range-slider-container">
      <div className="range-slider-label">{label}</div>
      <div className="range-slider-wrapper">
        <input
          type="range"
          className="range-slider"
          min={min}
          max={max}
          step={step}
          value={minVal}
          onChange={(e) => {
            const val = Number(e.target.value)
            onMinChange(val === min ? undefined : val)
          }}
        />
        <span className="range-value">{formatValue(minVal)}</span>
      </div>
      <div className="range-slider-wrapper">
        <input
          type="range"
          className="range-slider"
          min={min}
          max={max}
          step={step}
          value={maxVal}
          onChange={(e) => {
            const val = Number(e.target.value)
            onMaxChange(val === max ? undefined : val)
          }}
        />
        <span className="range-value">{formatValue(maxVal)}</span>
      </div>
    </div>
  )
}

export function Filters({
  value,
  onChange,
  properties = [],
  onClearAll,
}: {
  value: Filters
  onChange: (f: Filters) => void
  properties?: Property[]
  onClearAll?: () => void
}) {
  const [local, setLocal] = useState<Filters>(value)
  const ranges = useMemo(() => calculateRanges(properties), [properties])

  useEffect(() => {
    setLocal(value)
  }, [value])

  function set<K extends keyof Filters>(k: K, v: Filters[K]) {
    const next = { ...local, [k]: v }
    setLocal(next)
    onChange(next)
  }

  const hasActiveFilters = Object.values(value).some(v => v !== undefined && v !== null && v !== '')

  return (
    <div>
      <div
        className="card"
        style={{
          padding: 'var(--spacing-lg)',
          margin: 'var(--spacing-md)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 'var(--spacing-lg)',
        }}
      >
      <div>
        <div className="range-slider-label" style={{ marginBottom: 'var(--spacing-sm)' }}>
          Property Type
        </div>
        <select
          className="select-modern"
          value={local.type || ''}
          onChange={(e) => set('type', (e.target.value || undefined) as any)}
          style={{ width: '100%' }}
        >
          <option value="">All types</option>
          <option value="flat">Flats</option>
          <option value="house">Houses</option>
        </select>
      </div>

      <div>
        <div className="range-slider-label" style={{ marginBottom: 'var(--spacing-sm)' }}>
          Location
        </div>
        <input
          type="text"
          className="select-modern"
          value={local.location || ''}
          onChange={(e) => set('location', e.target.value || undefined)}
          placeholder="e.g., Bratislava"
          style={{ width: '100%' }}
        />
      </div>

      <RangeSlider
        label="Price (€)"
        minValue={local.min_price}
        maxValue={local.max_price}
        min={ranges.price.min}
        max={ranges.price.max}
        step={ranges.price.step}
        onMinChange={(v) => set('min_price', v)}
        onMaxChange={(v) => set('max_price', v)}
        formatValue={(v) => `${(v / 1000).toFixed(0)}k`}
      />

      <RangeSlider
        label="Area (m²)"
        minValue={local.min_area}
        maxValue={local.max_area}
        min={ranges.area.min}
        max={ranges.area.max}
        step={ranges.area.step}
        onMinChange={(v) => set('min_area', v)}
        onMaxChange={(v) => set('max_area', v)}
        formatValue={(v) => `${v} m²`}
      />

      <RangeSlider
        label="Rooms"
        minValue={local.min_rooms}
        maxValue={local.max_rooms}
        min={ranges.rooms.min}
        max={ranges.rooms.max}
        step={ranges.rooms.step}
        onMinChange={(v) => set('min_rooms', v)}
        onMaxChange={(v) => set('max_rooms', v)}
        formatValue={(v) => `${v}`}
      />

      <RangeSlider
        label="Year Built"
        minValue={local.min_year}
        maxValue={local.max_year}
        min={ranges.year.min}
        max={ranges.year.max}
        step={ranges.year.step}
        onMinChange={(v) => set('min_year', v)}
        onMaxChange={(v) => set('max_year', v)}
        formatValue={(v) => `${v}`}
      />
      </div>
      {hasActiveFilters && onClearAll && (
        <div style={{ 
          padding: '0 var(--spacing-md) var(--spacing-md)',
          display: 'flex',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onClearAll}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              transition: 'background-color 0.2s'
            }}
            onMouseOver={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = '#c82333'}
            onMouseOut={(e: React.MouseEvent<HTMLButtonElement>) => e.currentTarget.style.backgroundColor = '#dc3545'}
          >
            <span>🗑️</span>
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  )
}



