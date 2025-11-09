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
    <div
      style={{
        width: '360px',
        height: '100%',
        overflow: 'auto',
        borderRight: `1px solid var(--color-border)`,
        background: 'var(--color-card)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        className="card"
        style={{
          margin: 'var(--spacing-md)',
          padding: 'var(--spacing-md)',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'var(--color-card)',
        }}
      >
        <div style={{ marginBottom: 'var(--spacing-sm)' }}>
          <div className="range-slider-label" style={{ marginBottom: 'var(--spacing-xs)' }}>
            Sort by
          </div>
          <select
            className="select-modern"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            style={{ width: '100%' }}
          >
            <option value="price">Price</option>
            <option value="area">Area</option>
            <option value="rooms">Rooms</option>
            <option value="year">Year Built</option>
          </select>
        </div>
        <div
          style={{
            fontSize: '13px',
            color: 'var(--color-text-light)',
            padding: 'var(--spacing-xs) 0',
            borderTop: `1px solid var(--color-border-light)`,
            marginTop: 'var(--spacing-sm)',
            paddingTop: 'var(--spacing-sm)',
          }}
        >
          <strong style={{ color: 'var(--color-text)' }}>{properties.length}</strong> properties
          {paretoIds.size > 0 && (
            <>
              {' · '}
              <strong style={{ color: 'var(--color-success)' }}>{paretoIds.size}</strong> Pareto-optimal
            </>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-md)',
          padding: '0 var(--spacing-md) var(--spacing-md)',
        }}
      >
        {sorted.map((prop, index) => {
          const isPareto = paretoIds.has(prop.id)
          const isSelected = selectedId === prop.id

          return (
            <div
              key={prop.id}
              onClick={() => handleClick(prop)}
              className="card slide-in"
              style={{
                padding: 'var(--spacing-md)',
                cursor: 'pointer',
                border: isSelected
                  ? `2px solid var(--color-primary)`
                  : `1px solid var(--color-border)`,
                backgroundColor: isPareto
                  ? 'rgba(16, 185, 129, 0.05)'
                  : isSelected
                  ? 'rgba(59, 130, 246, 0.05)'
                  : 'var(--color-card)',
                transition: 'all var(--transition-base)',
                animationDelay: `${index * 20}ms`,
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = 'var(--color-primary-light)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.borderColor = 'var(--color-border)'
                  e.currentTarget.style.transform = 'translateY(0)'
                }
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  marginBottom: 'var(--spacing-sm)',
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--color-text)', flex: 1 }}>
                  {prop.title || 'Property listing'}
                </div>
                {isPareto && (
                  <span
                    style={{
                      color: 'var(--color-success)',
                      fontSize: '18px',
                      marginLeft: 'var(--spacing-xs)',
                      lineHeight: 1,
                    }}
                    title="Pareto-optimal"
                  >
                    ★
                  </span>
                )}
              </div>

              <div
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'var(--color-primary)',
                  marginBottom: 'var(--spacing-xs)',
                }}
              >
                {prop.price_eur?.toLocaleString('sk-SK')} €
              </div>

              <div
                style={{
                  display: 'flex',
                  gap: 'var(--spacing-md)',
                  fontSize: '14px',
                  color: 'var(--color-text-light)',
                  marginBottom: 'var(--spacing-xs)',
                }}
              >
                <span>
                  <strong style={{ color: 'var(--color-text)' }}>{prop.area_m2}</strong> m²
                </span>
                <span>·</span>
                <span>
                  <strong style={{ color: 'var(--color-text)' }}>{prop.rooms || 0}</strong> rooms
                </span>
              </div>

              {prop.year_built && (
                <div style={{ fontSize: '13px', color: 'var(--color-text-light)', marginBottom: 'var(--spacing-xs)' }}>
                  Built: <strong style={{ color: 'var(--color-text)' }}>{prop.year_built}</strong>
                </div>
              )}

              {prop.address && (
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--color-text-lighter)',
                    marginTop: 'var(--spacing-xs)',
                    paddingTop: 'var(--spacing-xs)',
                    borderTop: `1px solid var(--color-border-light)`,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {prop.address}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

