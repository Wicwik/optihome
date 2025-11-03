import { useState } from 'react'

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
}

export function Filters({ value, onChange }: { value: Filters; onChange: (f: Filters) => void }) {
  const [local, setLocal] = useState<Filters>(value)

  function set<K extends keyof Filters>(k: K, v: Filters[K]) {
    const next = { ...local, [k]: v }
    setLocal(next)
    onChange(next)
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, padding: 8 }}>
      <select value={local.type || ''} onChange={e => set('type', (e.target.value || undefined) as any)}>
        <option value="">All types</option>
        <option value="flat">Flats</option>
        <option value="house">Houses</option>
      </select>
      <input placeholder="Min price" type="number" value={local.min_price ?? ''} onChange={e => set('min_price', e.target.value ? Number(e.target.value) : undefined)} />
      <input placeholder="Max price" type="number" value={local.max_price ?? ''} onChange={e => set('max_price', e.target.value ? Number(e.target.value) : undefined)} />
      <input placeholder="Min rooms" type="number" value={local.min_rooms ?? ''} onChange={e => set('min_rooms', e.target.value ? Number(e.target.value) : undefined)} />
      <input placeholder="Max rooms" type="number" value={local.max_rooms ?? ''} onChange={e => set('max_rooms', e.target.value ? Number(e.target.value) : undefined)} />
      <input placeholder="Min area" type="number" value={local.min_area ?? ''} onChange={e => set('min_area', e.target.value ? Number(e.target.value) : undefined)} />
      <input placeholder="Max area" type="number" value={local.max_area ?? ''} onChange={e => set('max_area', e.target.value ? Number(e.target.value) : undefined)} />
      <input placeholder="Min year" type="number" value={local.min_year ?? ''} onChange={e => set('min_year', e.target.value ? Number(e.target.value) : undefined)} />
      <input placeholder="Max year" type="number" value={local.max_year ?? ''} onChange={e => set('max_year', e.target.value ? Number(e.target.value) : undefined)} />
    </div>
  )
}



