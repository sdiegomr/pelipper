// client/src/components/FlightSearch/SearchForm.tsx
import { useState, useEffect, useRef } from 'react'
import { Plane, Users } from 'lucide-react'
import type { FlightSearchParams } from '../../hooks/useFlightSearch'
import type { FlightPreferences } from '../../hooks/useFlightPreferences'

interface Airport {
  iataCode: string
  name: string
  cityName: string
  countryCode: string
}

interface AirportInputProps {
  label: string
  value: string
  onChange: (val: string) => void
  placeholder: string
}

function AirportInput({ label, value, onChange, placeholder }: AirportInputProps) {
  const [query, setQuery] = useState(value)
  const [suggestions, setSuggestions] = useState<Airport[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // sync external value changes (e.g., swap)
  useEffect(() => { setQuery(value) }, [value])

  useEffect(() => {
    if (query.length < 2) { setSuggestions([]); return }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/flights/airports?query=${encodeURIComponent(query)}`, { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data.airports || [])
          setOpen(true)
        }
      } catch { /* ignore */ }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleSelect(airport: Airport) {
    setQuery(`${airport.cityName} (${airport.iataCode})`)
    onChange(airport.iataCode)
    setOpen(false)
    setSuggestions([])
  }

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); onChange('') }}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {suggestions.map(apt => (
            <li
              key={apt.iataCode}
              onMouseDown={() => handleSelect(apt)}
              className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 flex justify-between"
            >
              <span className="text-slate-900 dark:text-slate-100">{apt.cityName} — {apt.name}</span>
              <span className="text-slate-400 font-mono text-xs ml-2">{apt.iataCode}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

interface SearchFormProps {
  preferences: FlightPreferences
  onSearch: (params: FlightSearchParams) => void
  onSavePreferences: (prefs: FlightPreferences) => void
  loading: boolean
}

export function SearchForm({ preferences, onSearch, onSavePreferences, loading }: SearchFormProps) {
  const [origin, setOrigin] = useState('')
  const [destination, setDestination] = useState('')
  const [departureDate, setDepartureDate] = useState('')
  const [returnDate, setReturnDate] = useState('')
  const [tripType, setTripType] = useState<'oneway' | 'roundtrip'>('oneway')
  const [adults, setAdults] = useState(1)
  const [travelClass, setTravelClass] = useState(preferences.cabin_class)

  // sync cabin class when preferences load
  useEffect(() => { setTravelClass(preferences.cabin_class) }, [preferences.cabin_class])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!origin || !destination || !departureDate) return
    onSearch({
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate,
      returnDate: tripType === 'roundtrip' ? returnDate : undefined,
      adults,
      travelClass,
      nonStop: preferences.max_stops === 0,
      currencyCode: 'EUR',
    })
  }

  function handleSaveDefaults() {
    onSavePreferences({ ...preferences, cabin_class: travelClass })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-4">
      {/* Trip type toggle */}
      <div className="flex gap-2">
        {(['oneway', 'roundtrip'] as const).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => setTripType(t)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              tripType === t
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
            }`}
          >
            {t === 'oneway' ? 'One way' : 'Round trip'}
          </button>
        ))}
      </div>

      {/* Route */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <AirportInput label="From" value={origin} onChange={setOrigin} placeholder="City or airport" />
        <AirportInput label="To" value={destination} onChange={setDestination} placeholder="City or airport" />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Departure</label>
          <input
            type="date"
            value={departureDate}
            onChange={e => setDepartureDate(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          />
        </div>
        {tripType === 'roundtrip' && (
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Return</label>
            <input
              type="date"
              value={returnDate}
              onChange={e => setReturnDate(e.target.value)}
              min={departureDate}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            />
          </div>
        )}
      </div>

      {/* Passengers + cabin */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            <Users className="inline w-3 h-3 mr-1" />Passengers
          </label>
          <select
            value={adults}
            onChange={e => setAdults(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {[1,2,3,4,5,6].map(n => <option key={n} value={n}>{n} adult{n > 1 ? 's' : ''}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Cabin class</label>
          <select
            value={travelClass}
            onChange={e => setTravelClass(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <option value="ECONOMY">Economy</option>
            <option value="PREMIUM_ECONOMY">Premium Economy</option>
            <option value="BUSINESS">Business</option>
            <option value="FIRST">First</option>
          </select>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={loading || !origin || !destination || !departureDate}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-700 dark:hover:bg-slate-300 transition-colors"
        >
          <Plane className="w-4 h-4" />
          {loading ? 'Searching...' : 'Search flights'}
        </button>
        <button
          type="button"
          onClick={handleSaveDefaults}
          title="Save current cabin class as default"
          className="px-3 py-2 text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
        >
          Save defaults
        </button>
      </div>
    </form>
  )
}
