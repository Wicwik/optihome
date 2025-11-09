import { useMemo, useState, useCallback, useRef, type ReactNode } from 'react'
import { BarChart, Bar, AreaChart, Area, LineChart, Line, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine, ResponsiveContainer } from 'recharts'
import type { Property } from '../types'

interface HistogramData {
  bin: string
  binStart: number
  binEnd: number
  count: number
}

interface ParameterStats {
  mean: number
  median: number
  histogram: HistogramData[]
  min: number
  max: number
}

function formatBinLabel(start: number, end: number, isPrice: boolean = false): string {
  if (isPrice) {
    // Format prices in thousands (e.g., 140k-209k)
    const startK = Math.round(start / 1000)
    const endK = Math.round(end / 1000)
    return `${startK}k-${endK}k`
  }
  // For other values, use shorter format
  return `${Math.round(start)}-${Math.round(end)}`
}

function calculateHistogram(
  values: number[],
  numBins: number = 15,
  discrete: boolean = false,
  isPrice: boolean = false
): { histogram: HistogramData[], min: number, max: number } {
  if (values.length === 0) return { histogram: [], min: 0, max: 0 }
  
  const filtered = values.filter(v => v != null && !isNaN(v) && v > 0)
  if (filtered.length === 0) return { histogram: [], min: 0, max: 0 }
  
  const min = Math.min(...filtered)
  const max = Math.max(...filtered)
  
  // For discrete values (like rooms), create one bin per integer value
  if (discrete && Number.isInteger(min) && Number.isInteger(max)) {
    const bins: Map<number, number> = new Map()
    filtered.forEach(value => {
      const intValue = Math.round(value)
      bins.set(intValue, (bins.get(intValue) || 0) + 1)
    })
    
    const histogram: HistogramData[] = []
    for (let i = Math.floor(min); i <= Math.ceil(max); i++) {
      const count = bins.get(i) || 0
      histogram.push({
        bin: `${i}`,
        binStart: i,
        binEnd: i + 1,
        count
      })
    }
    
    return { histogram, min, max }
  }
  
  // For continuous values, use bins (reduced to 15 for better readability)
  const binWidth = (max - min) / numBins
  
  const bins: number[] = new Array(numBins).fill(0)
  
  filtered.forEach(value => {
    let binIndex = Math.floor((value - min) / binWidth)
    if (binIndex >= numBins) binIndex = numBins - 1
    bins[binIndex]++
  })
  
  const histogram = bins.map((count, i) => {
    const binStart = min + i * binWidth
    const binEnd = min + (i + 1) * binWidth
    return {
      bin: formatBinLabel(binStart, binEnd, isPrice),
      binStart,
      binEnd,
      count
    }
  })
  
  return { histogram, min, max }
}

function calculateMean(values: number[]): number {
  const filtered = values.filter(v => v != null && !isNaN(v) && v > 0)
  if (filtered.length === 0) return 0
  return filtered.reduce((a, b) => a + b, 0) / filtered.length
}

function calculateMedian(values: number[]): number {
  const filtered = values.filter(v => v != null && !isNaN(v) && v > 0).sort((a, b) => a - b)
  if (filtered.length === 0) return 0
  const mid = Math.floor(filtered.length / 2)
  return filtered.length % 2 === 0
    ? (filtered[mid - 1] + filtered[mid]) / 2
    : filtered[mid]
}

function calculateStats(properties: Property[], getValue: (p: Property) => number | null | undefined, discrete: boolean = false, isPrice: boolean = false): ParameterStats {
  const values = properties.map(getValue).filter((v): v is number => v != null && !isNaN(v) && v > 0)
  const { histogram, min, max } = calculateHistogram(values, 15, discrete, isPrice)
  
  return {
    mean: calculateMean(values),
    median: calculateMedian(values),
    histogram,
    min,
    max
  }
}

// Common chart wrapper component
function ChartWrapper({
  title,
  stats,
  formatValue,
  children,
}: {
  title: string
  stats: ParameterStats
  formatValue: (value: number) => string
  children: ReactNode
}) {
  if (stats.histogram.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        No data available for {title}
      </div>
    )
  }

  return (
    <div style={{ marginBottom: '50px', backgroundColor: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
      <h3 style={{ marginBottom: '12px', fontSize: '20px', fontWeight: 'bold', color: '#333' }}>
        {title}
      </h3>
      <div style={{ 
        marginBottom: '16px', 
        padding: '12px', 
        backgroundColor: '#f8f9fa', 
        borderRadius: '6px',
        fontSize: '15px', 
        color: '#555',
        display: 'flex',
        gap: '20px',
        flexWrap: 'wrap'
      }}>
        <div>
          <span style={{ color: '#666', marginRight: '8px' }}>Mean:</span>
          <strong style={{ color: '#d32f2f', fontSize: '16px' }}>{formatValue(stats.mean)}</strong>
        </div>
        <div>
          <span style={{ color: '#666', marginRight: '8px' }}>Median:</span>
          <strong style={{ color: '#2e7d32', fontSize: '16px' }}>{formatValue(stats.median)}</strong>
        </div>
      </div>
      {children}
    </div>
  )
}

function HistogramChart({
  title,
  stats,
  formatValue,
  onBinClick,
  getValue,
}: {
  title: string
  stats: ParameterStats
  formatValue: (value: number) => string
  onBinClick?: (bin: HistogramData, properties: Property[]) => void
  getValue: (p: Property) => number | null | undefined
}) {
  // Find the bin that contains the mean and median
  const meanBin = stats.histogram.length > 0 
    ? (stats.histogram.find(h => stats.mean >= h.binStart && stats.mean < h.binEnd) || 
       (stats.mean >= stats.histogram[stats.histogram.length - 1].binStart ? stats.histogram[stats.histogram.length - 1] : stats.histogram[0]))
    : null
  const medianBin = stats.histogram.length > 0
    ? (stats.histogram.find(h => stats.median >= h.binStart && stats.median < h.binEnd) || 
       (stats.median >= stats.histogram[stats.histogram.length - 1].binStart ? stats.histogram[stats.histogram.length - 1] : stats.histogram[0]))
    : null

  return (
    <ChartWrapper title={title} stats={stats} formatValue={formatValue}>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart 
          data={stats.histogram} 
          margin={{ top: 60, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis 
            dataKey="bin" 
            angle={-30}
            textAnchor="end"
            height={60}
            interval={Math.max(0, Math.floor(stats.histogram.length / 8))}
            tick={{ fontSize: 12, fill: '#555' }}
            label={{ value: 'Value Range', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#666', fontSize: 14 } }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#555' }}
            label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#666', fontSize: 14 } }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
              border: '1px solid #ccc', 
              borderRadius: '4px',
              fontSize: '13px'
            }}
          />
          <Bar 
            dataKey="count" 
            fill="#6366f1" 
            name="Properties" 
            radius={[4, 4, 0, 0]} 
            opacity={0.65}
            onClick={(data: any, index: number, e: any) => {
              if (onBinClick && stats.histogram[index]) {
                onBinClick(stats.histogram[index], [])
              }
            }}
            style={{ cursor: 'pointer' }}
          />
          {meanBin && (
            <ReferenceLine 
              x={meanBin.bin}
              stroke="#d32f2f"
              strokeWidth={3.5}
              strokeDasharray="8 4"
              label={{ 
                value: `Mean`, 
                position: 'insideTopLeft', 
                fill: '#d32f2f',
                fontSize: 13,
                fontWeight: 'bold',
                offset: 10
              }}
            />
          )}
          {medianBin && (
            <ReferenceLine 
              x={medianBin.bin}
              stroke="#2e7d32"
              strokeWidth={3.5}
              strokeDasharray="8 4"
              label={{ 
                value: `Median`, 
                position: 'insideTopRight', 
                fill: '#2e7d32',
                fontSize: 13,
                fontWeight: 'bold',
                offset: 10
              }}
            />
          )}
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

// Area chart with histogram bars overlay for smooth distribution visualization
function AreaDistributionChart({
  title,
  stats,
  formatValue,
  onBinClick,
  getValue,
}: {
  title: string
  stats: ParameterStats
  formatValue: (value: number) => string
  onBinClick?: (bin: HistogramData, properties: Property[]) => void
  getValue: (p: Property) => number | null | undefined
}) {
  // Find the bin that contains the mean and median
  const meanBin = stats.histogram.length > 0 
    ? (stats.histogram.find(h => stats.mean >= h.binStart && stats.mean < h.binEnd) || 
       (stats.mean >= stats.histogram[stats.histogram.length - 1].binStart ? stats.histogram[stats.histogram.length - 1] : stats.histogram[0]))
    : null
  const medianBin = stats.histogram.length > 0
    ? (stats.histogram.find(h => stats.median >= h.binStart && stats.median < h.binEnd) || 
       (stats.median >= stats.histogram[stats.histogram.length - 1].binStart ? stats.histogram[stats.histogram.length - 1] : stats.histogram[0]))
    : null

  return (
    <ChartWrapper title={title} stats={stats} formatValue={formatValue}>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart 
          data={stats.histogram} 
          margin={{ top: 60, right: 30, left: 20, bottom: 60 }}
        >
          <defs>
            <linearGradient id={`colorCount-${title.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis 
            dataKey="bin" 
            angle={-30}
            textAnchor="end"
            height={60}
            interval={Math.max(0, Math.floor(stats.histogram.length / 8))}
            tick={{ fontSize: 12, fill: '#555' }}
            label={{ value: 'Value Range', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#666', fontSize: 14 } }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#555' }}
            label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#666', fontSize: 14 } }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
              border: '1px solid #ccc', 
              borderRadius: '4px',
              fontSize: '13px'
            }}
          />
          <Area 
            type="monotone" 
            dataKey="count" 
            stroke="#6366f1" 
            fillOpacity={1} 
            fill={`url(#colorCount-${title.replace(/\s+/g, '-')})`} 
            name="Distribution"
          />
          <Bar 
            dataKey="count" 
            fill="#6366f1" 
            name="Properties" 
            radius={[4, 4, 0, 0]} 
            opacity={0.5}
            onClick={(data: any, index: number, e: any) => {
              if (onBinClick && stats.histogram[index]) {
                onBinClick(stats.histogram[index], [])
              }
            }}
            style={{ cursor: 'pointer' }}
          />
          {meanBin && (
            <ReferenceLine 
              x={meanBin.bin}
              stroke="#d32f2f"
              strokeWidth={3.5}
              strokeDasharray="8 4"
              label={{ 
                value: `Mean`, 
                position: 'insideTopLeft', 
                fill: '#d32f2f',
                fontSize: 13,
                fontWeight: 'bold',
                offset: 10
              }}
            />
          )}
          {medianBin && (
            <ReferenceLine 
              x={medianBin.bin}
              stroke="#2e7d32"
              strokeWidth={3.5}
              strokeDasharray="8 4"
              label={{ 
                value: `Median`, 
                position: 'insideTopRight', 
                fill: '#2e7d32',
                fontSize: 13,
                fontWeight: 'bold',
                offset: 10
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

// Composed chart with bars and area overlay for area distribution
function ComposedDistributionChart({
  title,
  stats,
  formatValue,
}: {
  title: string
  stats: ParameterStats
  formatValue: (value: number) => string
}) {
  // Find the bin that contains the mean and median
  const meanBin = stats.histogram.length > 0 
    ? (stats.histogram.find(h => stats.mean >= h.binStart && stats.mean < h.binEnd) || 
       (stats.mean >= stats.histogram[stats.histogram.length - 1].binStart ? stats.histogram[stats.histogram.length - 1] : stats.histogram[0]))
    : null
  const medianBin = stats.histogram.length > 0
    ? (stats.histogram.find(h => stats.median >= h.binStart && stats.median < h.binEnd) || 
       (stats.median >= stats.histogram[stats.histogram.length - 1].binStart ? stats.histogram[stats.histogram.length - 1] : stats.histogram[0]))
    : null

  return (
    <ChartWrapper title={title} stats={stats} formatValue={formatValue}>
      <ResponsiveContainer width="100%" height={400}>
        <ComposedChart 
          data={stats.histogram} 
          margin={{ top: 60, right: 30, left: 20, bottom: 60 }}
        >
          <defs>
            <linearGradient id={`colorArea-${title.replace(/\s+/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.05}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis 
            dataKey="bin" 
            angle={-30}
            textAnchor="end"
            height={60}
            interval={Math.max(0, Math.floor(stats.histogram.length / 8))}
            tick={{ fontSize: 12, fill: '#555' }}
            label={{ value: 'Value Range', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#666', fontSize: 14 } }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#555' }}
            label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#666', fontSize: 14 } }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
              border: '1px solid #ccc', 
              borderRadius: '4px',
              fontSize: '13px'
            }}
          />
          <Area 
            type="monotone" 
            dataKey="count" 
            fill={`url(#colorArea-${title.replace(/\s+/g, '-')})`} 
            stroke="#8b5cf6" 
            strokeWidth={2}
            fillOpacity={1}
            name="Distribution"
          />
          <Bar dataKey="count" fill="#6366f1" name="Properties" radius={[4, 4, 0, 0]} opacity={0.6} />
          {meanBin && (
            <ReferenceLine 
              x={meanBin.bin}
              stroke="#d32f2f"
              strokeWidth={3.5}
              strokeDasharray="8 4"
              label={{ 
                value: `Mean`, 
                position: 'insideTopLeft', 
                fill: '#d32f2f',
                fontSize: 13,
                fontWeight: 'bold',
                offset: 10
              }}
            />
          )}
          {medianBin && (
            <ReferenceLine 
              x={medianBin.bin}
              stroke="#2e7d32"
              strokeWidth={3.5}
              strokeDasharray="8 4"
              label={{ 
                value: `Median`, 
                position: 'insideTopRight', 
                fill: '#2e7d32',
                fontSize: 13,
                fontWeight: 'bold',
                offset: 10
              }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

// Line chart for year built (shows trend over time)
function LineDistributionChart({
  title,
  stats,
  formatValue,
}: {
  title: string
  stats: ParameterStats
  formatValue: (value: number) => string
}) {
  // Find the bin that contains the mean and median
  const meanBin = stats.histogram.length > 0 
    ? (stats.histogram.find(h => stats.mean >= h.binStart && stats.mean < h.binEnd) || 
       (stats.mean >= stats.histogram[stats.histogram.length - 1].binStart ? stats.histogram[stats.histogram.length - 1] : stats.histogram[0]))
    : null
  const medianBin = stats.histogram.length > 0
    ? (stats.histogram.find(h => stats.median >= h.binStart && stats.median < h.binEnd) || 
       (stats.median >= stats.histogram[stats.histogram.length - 1].binStart ? stats.histogram[stats.histogram.length - 1] : stats.histogram[0]))
    : null

  return (
    <ChartWrapper title={title} stats={stats} formatValue={formatValue}>
      <ResponsiveContainer width="100%" height={400}>
        <LineChart 
          data={stats.histogram} 
          margin={{ top: 60, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis 
            dataKey="bin" 
            angle={-30}
            textAnchor="end"
            height={60}
            interval={Math.max(0, Math.floor(stats.histogram.length / 8))}
            tick={{ fontSize: 12, fill: '#555' }}
            label={{ value: 'Year', position: 'insideBottom', offset: -5, style: { textAnchor: 'middle', fill: '#666', fontSize: 14 } }}
          />
          <YAxis 
            tick={{ fontSize: 12, fill: '#555' }}
            label={{ value: 'Count', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#666', fontSize: 14 } }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
              border: '1px solid #ccc', 
              borderRadius: '4px',
              fontSize: '13px'
            }}
          />
          <Line 
            type="monotone" 
            dataKey="count" 
            stroke="#6366f1" 
            strokeWidth={3}
            dot={{ fill: '#6366f1', r: 4 }}
            activeDot={{ r: 6 }}
            name="Properties"
          />
          {meanBin && (
            <ReferenceLine 
              x={meanBin.bin}
              stroke="#d32f2f"
              strokeWidth={3.5}
              strokeDasharray="8 4"
              label={{ 
                value: `Mean`, 
                position: 'insideTopLeft', 
                fill: '#d32f2f',
                fontSize: 13,
                fontWeight: 'bold',
                offset: 10
              }}
            />
          )}
          {medianBin && (
            <ReferenceLine 
              x={medianBin.bin}
              stroke="#2e7d32"
              strokeWidth={3.5}
              strokeDasharray="8 4"
              label={{ 
                value: `Median`, 
                position: 'insideTopRight', 
                fill: '#2e7d32',
                fontSize: 13,
                fontWeight: 'bold',
                offset: 10
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </ChartWrapper>
  )
}

export function Statistics({ 
  properties, 
  onApplyFilter 
}: { 
  properties: Property[]
  onApplyFilter?: (filters: { min_price?: number; max_price?: number; min_area?: number; max_area?: number; min_rooms?: number; max_rooms?: number; min_year?: number; max_year?: number }) => void
}) {
  const [selectedBin, setSelectedBin] = useState<{ bin: HistogramData, title: string, getValue: (p: Property) => number | null | undefined, filterKey: 'price' | 'area' | 'rooms' | 'year' | 'price_per_m2' } | null>(null)
  const [filteredProperties, setFilteredProperties] = useState<Property[]>([])
  const filteredSectionRef = useRef<HTMLDivElement>(null)
  const priceStats = useMemo(() => {
    try {
      return calculateStats(properties, p => p.price_eur, false, true)
    } catch (e) {
      console.error('Error calculating price stats:', e)
      return { mean: 0, median: 0, histogram: [], min: 0, max: 0 }
    }
  }, [properties])
  
  const areaStats = useMemo(() => {
    try {
      return calculateStats(properties, p => p.area_m2, false, false)
    } catch (e) {
      console.error('Error calculating area stats:', e)
      return { mean: 0, median: 0, histogram: [], min: 0, max: 0 }
    }
  }, [properties])
  
  const roomsStats = useMemo(() => {
    try {
      return calculateStats(properties, p => p.rooms, true, false)
    } catch (e) {
      console.error('Error calculating rooms stats:', e)
      return { mean: 0, median: 0, histogram: [], min: 0, max: 0 }
    }
  }, [properties])
  
  const yearStats = useMemo(() => {
    try {
      return calculateStats(properties, p => p.year_built, false, false)
    } catch (e) {
      console.error('Error calculating year stats:', e)
      return { mean: 0, median: 0, histogram: [], min: 0, max: 0 }
    }
  }, [properties])
  
  const pricePerM2Stats = useMemo(() => {
    try {
      return calculateStats(properties, p => p.price_per_m2, false, false)
    } catch (e) {
      console.error('Error calculating price per m2 stats:', e)
      return { mean: 0, median: 0, histogram: [], min: 0, max: 0 }
    }
  }, [properties])

  const handleBinClick = useCallback((bin: HistogramData, title: string, getValue: (p: Property) => number | null | undefined, filterKey: 'price' | 'area' | 'rooms' | 'year' | 'price_per_m2') => {
    const filtered = properties.filter(p => {
      const value = getValue(p)
      if (value == null || isNaN(value) || value <= 0) return false
      return value >= bin.binStart && value < bin.binEnd
    })
    setSelectedBin({ bin, title, getValue, filterKey })
    setFilteredProperties(filtered)
    
    // Scroll to filtered section after state update
    setTimeout(() => {
      if (filteredSectionRef.current) {
        filteredSectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)
  }, [properties])

  if (properties.length === 0) {
    return (
      <div style={{ padding: '20px', overflow: 'auto', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#666' }}>
          <h2 style={{ marginBottom: '16px', fontSize: '24px', fontWeight: 'bold' }}>
            Property Statistics
          </h2>
          <p style={{ fontSize: '16px' }}>No properties available to display statistics.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px', overflow: 'auto', height: '100%' }}>
      <h2 style={{ marginBottom: '24px', fontSize: '24px', fontWeight: 'bold' }}>
        Property Statistics
      </h2>
      <div style={{ marginBottom: '16px', fontSize: '14px', color: '#666' }}>
        Total properties: {properties.length}
        {selectedBin && (
          <span style={{ marginLeft: '16px', color: '#007bff' }}>
            | Filtered: {filteredProperties.length} properties in bin "{selectedBin.bin.bin}"
          </span>
        )}
      </div>

      {selectedBin && (
        <div ref={filteredSectionRef} style={{ 
          marginBottom: '20px', 
          padding: '16px', 
          backgroundColor: '#f0f8ff', 
          borderRadius: '8px',
          border: '1px solid #007bff'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <strong style={{ fontSize: '16px', color: '#333' }}>
                {selectedBin.title}: {selectedBin.bin.bin}
              </strong>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '4px' }}>
                {filteredProperties.length} properties found
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {onApplyFilter && (
                <button
                  onClick={() => {
                    if (selectedBin) {
                      const newFilters: any = {}
                      
                      if (selectedBin.filterKey === 'price') {
                        newFilters.min_price = Math.floor(selectedBin.bin.binStart)
                        newFilters.max_price = Math.ceil(selectedBin.bin.binEnd)
                      } else if (selectedBin.filterKey === 'area') {
                        newFilters.min_area = Math.floor(selectedBin.bin.binStart)
                        newFilters.max_area = Math.ceil(selectedBin.bin.binEnd)
                      } else if (selectedBin.filterKey === 'rooms') {
                        newFilters.min_rooms = Math.floor(selectedBin.bin.binStart)
                        newFilters.max_rooms = Math.ceil(selectedBin.bin.binEnd)
                      } else if (selectedBin.filterKey === 'year') {
                        newFilters.min_year = Math.floor(selectedBin.bin.binStart)
                        newFilters.max_year = Math.ceil(selectedBin.bin.binEnd)
                      } else if (selectedBin.filterKey === 'price_per_m2') {
                        // For price_per_m2, we need to calculate approximate price/area ranges
                        // We'll use a simple approach: estimate based on average area
                        const avgArea = properties.reduce((sum, p) => sum + (p.area_m2 || 0), 0) / properties.length
                        if (avgArea > 0) {
                          newFilters.min_price = Math.floor(selectedBin.bin.binStart * avgArea * 0.8) // Conservative estimate
                          newFilters.max_price = Math.ceil(selectedBin.bin.binEnd * avgArea * 1.2) // Conservative estimate
                        }
                      }
                      
                      onApplyFilter(newFilters)
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Apply to Map
                </button>
              )}
              <button
                onClick={() => {
                  setSelectedBin(null)
                  setFilteredProperties([])
                }}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Clear Filter
              </button>
            </div>
          </div>
          <div style={{ 
            maxHeight: '300px', 
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '12px'
          }}>
            {filteredProperties.map((prop: Property) => (
              <div
                key={prop.id}
                style={{
                  padding: '12px',
                  backgroundColor: 'white',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '14px'
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                  {prop.title || 'Property listing'}
                </div>
                <div style={{ color: '#666' }}>
                  <div>{prop.price_eur?.toLocaleString()} €</div>
                  <div>{prop.area_m2} m² · {prop.rooms || 0} rooms</div>
                  {prop.year_built && <div>Built: {prop.year_built}</div>}
                  {prop.address && <div style={{ fontSize: '12px', marginTop: '4px' }}>{prop.address}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <AreaDistributionChart
        title="Price Distribution (€)"
        stats={priceStats}
        formatValue={(v) => `${Math.round(v).toLocaleString()} €`}
        onBinClick={(bin) => handleBinClick(bin, "Price Distribution (€)", (p: Property) => p.price_eur, 'price')}
        getValue={(p: Property) => p.price_eur}
      />
      
      <AreaDistributionChart
        title="Area Distribution (m²)"
        stats={areaStats}
        formatValue={(v) => `${Math.round(v)} m²`}
        onBinClick={(bin) => handleBinClick(bin, "Area Distribution (m²)", (p: Property) => p.area_m2, 'area')}
        getValue={(p: Property) => p.area_m2}
      />
      
      <HistogramChart
        title="Rooms Distribution"
        stats={roomsStats}
        formatValue={(v) => `${Math.round(v)} rooms`}
        onBinClick={(bin) => handleBinClick(bin, "Rooms Distribution", (p: Property) => p.rooms, 'rooms')}
        getValue={(p: Property) => p.rooms}
      />
      
      <AreaDistributionChart
        title="Year Built Distribution"
        stats={yearStats}
        formatValue={(v) => `${Math.round(v)}`}
        onBinClick={(bin) => handleBinClick(bin, "Year Built Distribution", (p: Property) => p.year_built, 'year')}
        getValue={(p: Property) => p.year_built}
      />
      
      <AreaDistributionChart
        title="Price per m² Distribution (€/m²)"
        stats={pricePerM2Stats}
        formatValue={(v) => `${Math.round(v)} €/m²`}
        onBinClick={(bin) => handleBinClick(bin, "Price per m² Distribution (€/m²)", (p: Property) => p.price_per_m2, 'price_per_m2')}
        getValue={(p: Property) => p.price_per_m2}
      />
    </div>
  )
}

