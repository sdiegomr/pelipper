// client/src/components/FlightSearch/FilterPanel.tsx
import { SlidersHorizontal } from 'lucide-react'
import type { FlightOffer } from '../../hooks/useFlightSearch'

export interface Filters {
  maxStops: number
  maxPrice: number
  departureTimeWindow: 'any' | 'morning' | 'afternoon' | 'evening'
  preferredAirlines: string[]
}

export type SortOption = 'cheapest' | 'fastest' | 'best'

interface FilterPanelProps {
  offers: FlightOffer[]
  filters: Filters
  sort: SortOption
  onFiltersChange: (f: Filters) => void
  onSortChange: (s: SortOption) => void
}

export function getMaxPrice(offers: FlightOffer[]): number {
  if (offers.length === 0) return 5000
  return Math.ceil(Math.max(...offers.map(o => parseFloat(o.price.total))) / 100) * 100
}

export function getAirlines(offers: FlightOffer[]): string[] {
  const codes = new Set<string>()
  for (const offer of offers) {
    for (const itin of offer.itineraries) {
      for (const seg of itin.segments) {
        codes.add(seg.carrierCode)
      }
    }
  }
  return [...codes].sort()
}

export function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/)
  if (!match) return 0
  return (parseInt(match[1] || '0') * 60) + parseInt(match[2] || '0')
}

export function applyFilters(offers: FlightOffer[], filters: Filters): FlightOffer[] {
  return offers.filter(offer => {
    const segments = offer.itineraries[0]?.segments || []
    const stops = segments.length - 1
    if (filters.maxStops < 2 && stops > filters.maxStops) return false

    const price = parseFloat(offer.price.total)
    if (price > filters.maxPrice) return false

    if (filters.preferredAirlines.length > 0) {
      const offerAirlines = new Set(segments.map(s => s.carrierCode))
      if (!filters.preferredAirlines.some(a => offerAirlines.has(a))) return false
    }

    if (filters.departureTimeWindow !== 'any' && segments[0]) {
      const hour = new Date(segments[0].departure.at).getHours()
      if (filters.departureTimeWindow === 'morning' && (hour < 6 || hour >= 12)) return false
      if (filters.departureTimeWindow === 'afternoon' && (hour < 12 || hour >= 18)) return false
      if (filters.departureTimeWindow === 'evening' && hour < 18) return false
    }

    return true
  })
}

export function applySort(offers: FlightOffer[], sort: SortOption): FlightOffer[] {
  const sorted = [...offers]
  if (sort === 'cheapest') {
    sorted.sort((a, b) => parseFloat(a.price.total) - parseFloat(b.price.total))
  } else if (sort === 'fastest') {
    sorted.sort((a, b) => parseDuration(a.itineraries[0]?.duration || 'PT0M') - parseDuration(b.itineraries[0]?.duration || 'PT0M'))
  } else {
    sorted.sort((a, b) => {
      const scoreA = parseFloat(a.price.total) + parseDuration(a.itineraries[0]?.duration || 'PT0M') / 60
      const scoreB = parseFloat(b.price.total) + parseDuration(b.itineraries[0]?.duration || 'PT0M') / 60
      return scoreA - scoreB
    })
  }
  return sorted
}

export function FilterPanel({ offers, filters, sort, onFiltersChange, onSortChange }: FilterPanelProps) {
  const maxPossible = getMaxPrice(offers)
  const airlines = getAirlines(offers)

  function update(partial: Partial<Filters>) {
    onFiltersChange({ ...filters, ...partial })
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-5">
      <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-300">
        <SlidersHorizontal className="w-4 h-4" />
        Filters
      </div>

      {/* Sort */}
      <div>
        <p className="text-xs font-medium text-slate-500 mb-2">Sort by</p>
        <div className="flex flex-col gap-1">
          {(['cheapest', 'fastest', 'best'] as SortOption[]).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => onSortChange(s)}
              className={`px-3 py-1.5 text-xs rounded-lg text-left transition-colors ${
                sort === s
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Stops */}
      <div>
        <p className="text-xs font-medium text-slate-500 mb-2">Max stops</p>
        <div className="flex gap-2">
          {[{ label: 'Direct', val: 0 }, { label: '1 stop', val: 1 }, { label: 'Any', val: 2 }].map(({ label, val }) => (
            <button
              key={val}
              type="button"
              onClick={() => update({ maxStops: val })}
              className={`flex-1 px-2 py-1 text-xs rounded-lg border transition-colors ${
                filters.maxStops === val
                  ? 'border-slate-900 dark:border-slate-100 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Price */}
      <div>
        <div className="flex justify-between text-xs mb-2">
          <span className="font-medium text-slate-500">Max price</span>
          <span className="text-slate-700 dark:text-slate-300">€{filters.maxPrice}</span>
        </div>
        <input
          type="range"
          min={0}
          max={maxPossible}
          step={50}
          value={filters.maxPrice}
          onChange={e => update({ maxPrice: Number(e.target.value) })}
          className="w-full accent-slate-900 dark:accent-slate-100"
        />
      </div>

      {/* Departure time */}
      <div>
        <p className="text-xs font-medium text-slate-500 mb-2">Departure time</p>
        <div className="flex flex-col gap-1">
          {([
            { label: 'Any time', val: 'any' },
            { label: 'Morning (6–12)', val: 'morning' },
            { label: 'Afternoon (12–18)', val: 'afternoon' },
            { label: 'Evening (18+)', val: 'evening' },
          ] as const).map(({ label, val }) => (
            <button
              key={val}
              type="button"
              onClick={() => update({ departureTimeWindow: val })}
              className={`px-3 py-1.5 text-xs rounded-lg text-left transition-colors ${
                filters.departureTimeWindow === val
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Airlines */}
      {airlines.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Airlines</p>
          <div className="flex flex-wrap gap-1">
            {airlines.map(code => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  const next = filters.preferredAirlines.includes(code)
                    ? filters.preferredAirlines.filter(a => a !== code)
                    : [...filters.preferredAirlines, code]
                  update({ preferredAirlines: next })
                }}
                className={`px-2 py-1 text-xs rounded-lg border font-mono transition-colors ${
                  filters.preferredAirlines.includes(code)
                    ? 'border-slate-900 dark:border-slate-100 bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {code}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
