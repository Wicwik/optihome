import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { useEffect, useRef } from 'react'
import type { Property } from '../types'

// Import leaflet.markercluster - import from dist folder
// @ts-ignore
import 'leaflet.markercluster/dist/leaflet.markercluster-src.js'

// Create green marker for Pareto-optimal properties
const paretoIcon = new L.DivIcon({
  className: 'pareto-marker-icon',
  html: '<div style="background-color: #4caf50; width: 25px; height: 41px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

// Create highlighted marker for selected properties (blue)
const selectedIcon = new L.DivIcon({
  className: 'selected-marker-icon',
  html: '<div style="background-color: #007bff; width: 30px; height: 48px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.4);"></div>',
  iconSize: [30, 48],
  iconAnchor: [15, 48],
})

// Create highlighted Pareto marker for selected Pareto-optimal properties
const selectedParetoIcon = new L.DivIcon({
  className: 'selected-pareto-marker-icon',
  html: '<div style="background-color: #007bff; width: 30px; height: 48px; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); border: 3px solid #4caf50; box-shadow: 0 3px 6px rgba(0,0,0,0.4);"></div>',
  iconSize: [30, 48],
  iconAnchor: [15, 48],
})

const normalIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  shadowSize: [41, 41],
})

export function MapView({
  properties,
  paretoIds,
  onBoundsChange,
  selectedProperty,
}: {
  properties: Property[]
  paretoIds: Set<number>
  onBoundsChange: (bbox: [number, number, number, number]) => void
  selectedProperty: Property | null
}) {
  const propertiesWithCoords = properties.filter(p => p.lat != null && p.lng != null)

  return (
    <MapContainer center={[48.1486, 17.1077]} zoom={11} style={{ height: '100%' }}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
      <BoundsWatcher onBoundsChange={onBoundsChange} />
      <MarkerCluster markers={propertiesWithCoords} paretoIds={paretoIds} selectedProperty={selectedProperty} />
      <PropertyCenter selectedProperty={selectedProperty} />
    </MapContainer>
  )
}

function MarkerCluster({ 
  markers, 
  paretoIds, 
  selectedProperty 
}: { 
  markers: Property[]
  paretoIds: Set<number>
  selectedProperty: Property | null
}) {
  const map = useMap()
  const clusterRef = useRef<L.MarkerClusterGroup | null>(null)
  const markersRef = useRef<Map<number, L.Marker>>(new Map())

  useEffect(() => {
    if (!clusterRef.current) {
      // @ts-ignore - leaflet.markercluster extends L namespace
      clusterRef.current = (L as any).markerClusterGroup()
      map.addLayer(clusterRef.current)
    }

    const cluster = clusterRef.current
    cluster.clearLayers()
    markersRef.current.clear()

    markers.forEach(p => {
      const isSelected = selectedProperty?.id === p.id
      const isPareto = paretoIds.has(p.id)
      
      // Choose icon based on selection and Pareto status
      let icon: L.Icon | L.DivIcon
      if (isSelected && isPareto) {
        icon = selectedParetoIcon
      } else if (isSelected) {
        icon = selectedIcon
      } else if (isPareto) {
        icon = paretoIcon
      } else {
        icon = normalIcon
      }

      const marker = L.marker([p.lat!, p.lng!], { icon })

      const popupContent = `
        <div>
          <strong>${p.title || 'Property listing'}</strong>
          ${isPareto ? '<div style="color: #4caf50; font-weight: bold;">★ Pareto-optimal</div>' : ''}
          <div>${p.price_eur?.toLocaleString()} €</div>
          <div>${p.area_m2} m² · ${p.rooms || 0} rooms</div>
          ${p.year_built ? `<div>Year: ${p.year_built}</div>` : ''}
          ${p.address ? `<div style="font-size: 12px; margin-top: 4px;">${p.address}</div>` : ''}
          <a href="${p.url}" target="_blank" rel="noopener noreferrer">View on nehnutelnosti.sk</a>
        </div>
      `
      marker.bindPopup(popupContent)
      cluster.addLayer(marker)
      markersRef.current.set(p.id, marker)
    })

    // Open popup for selected property if it exists
    if (selectedProperty && markersRef.current.has(selectedProperty.id)) {
      const selectedMarker = markersRef.current.get(selectedProperty.id)!
      // Use setTimeout to ensure marker is added to cluster first
      setTimeout(() => {
        selectedMarker.openPopup()
      }, 100)
    }

    return () => {
      if (clusterRef.current) {
        map.removeLayer(clusterRef.current)
        clusterRef.current = null
      }
    }
  }, [map, markers, paretoIds, selectedProperty])

  return null
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

function PropertyCenter({ selectedProperty }: { selectedProperty: Property | null }) {
  const map = useMap()

  useEffect(() => {
    if (selectedProperty && selectedProperty.lat != null && selectedProperty.lng != null) {
      map.setView([selectedProperty.lat, selectedProperty.lng], Math.max(map.getZoom(), 14), {
        animate: true,
        duration: 0.5,
      })
    }
  }, [map, selectedProperty])

  return null
}



