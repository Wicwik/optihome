import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useEffect } from 'react'
import type { Property } from '../types'

const paretoIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  className: 'pareto-marker',
})

const normalIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

export function MapView({
  properties,
  paretoIds,
  onBoundsChange,
}: {
  properties: Property[]
  paretoIds: Set<number>
  onBoundsChange: (bbox: [number, number, number, number]) => void
}) {
  return (
    <MapContainer center={[48.1486, 17.1077]} zoom={11} style={{ height: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
      <BoundsWatcher onBoundsChange={onBoundsChange} />
      {properties
        .filter(p => p.lat != null && p.lng != null)
        .map(p => (
          <Marker key={p.id} position={[p.lat!, p.lng!]} icon={paretoIds.has(p.id) ? paretoIcon : normalIcon}>
            <Popup>
              <strong>{p.title}</strong>
              <div>{p.price_eur?.toLocaleString()} €</div>
              <div>{p.area_m2} m² · {p.rooms} rooms</div>
              {p.year_built ? <div>Year: {p.year_built}</div> : null}
              <a href={p.url} target="_blank">Open</a>
            </Popup>
          </Marker>
        ))}
    </MapContainer>
  )
}

function BoundsWatcher({ onBoundsChange }: { onBoundsChange: (bbox: [number, number, number, number]) => void }) {
  const map = useMap()
  useEffect(() => {
    function update() {
      const b = map.getBounds()
      onBoundsChange([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()])
    }
    map.on('moveend', update)
    update()
    return () => {
      map.off('moveend', update)
    }
  }, [map, onBoundsChange])
  return null
}



