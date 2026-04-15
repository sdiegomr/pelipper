// client/src/components/FlightSearch/AddToTripModal.tsx
import { useState, useEffect } from 'react'
import { X, Plane } from 'lucide-react'
import type { FlightOffer } from '../../hooks/useFlightSearch'
import { parseDuration } from './FilterPanel'

interface Trip {
  id: number
  title: string
  start_date?: string
  end_date?: string
}

interface AddToTripModalProps {
  offer: FlightOffer
  onClose: () => void
  onAdded: () => void
}

function formatDuration(iso: string): string {
  const mins = parseDuration(iso)
  return `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? (mins % 60) + 'm' : ''}`.trim()
}

export function AddToTripModal({ offer, onClose, onAdded }: AddToTripModalProps) {
  const [trips, setTrips] = useState<Trip[]>([])
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/trips', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        const list: Trip[] = data.trips || []
        setTrips(list)
        if (list.length > 0) setSelectedTripId(list[0].id)
      })
      .catch(() => {})
  }, [])

  const itinerary = offer.itineraries[0]
  const segments = itinerary?.segments || []
  const firstSeg = segments[0]
  const lastSeg = segments[segments.length - 1]
  const airline = firstSeg?.carrierCode || ''
  const flightNumber = `${firstSeg?.carrierCode}${firstSeg?.number}`

  async function handleSave() {
    if (!selectedTripId) return
    setSaving(true)
    setError(null)

    const metadata = {
      airline,
      flight_number: flightNumber,
      departure_airport: firstSeg?.departure.iataCode || '',
      arrival_airport: lastSeg?.arrival.iataCode || '',
      departure_time: firstSeg?.departure.at || '',
      arrival_time: lastSeg?.arrival.at || '',
      cabin_class: offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin || 'ECONOMY',
      price: parseFloat(offer.price.total),
      currency: offer.price.currency,
      booking_url: `https://www.google.com/travel/flights`,
      amadeus_offer_id: offer.id,
    }

    const title = `${firstSeg?.departure.iataCode} → ${lastSeg?.arrival.iataCode} (${airline})`

    try {
      const res = await fetch(`/api/trips/${selectedTripId}/reservations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title,
          type: 'flight',
          reservation_time: firstSeg?.departure.at,
          reservation_end_time: lastSeg?.arrival.at,
          status: 'pending',
          metadata: JSON.stringify(metadata),
        }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to save')
      }
      onAdded()
      onClose()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-xl w-full max-w-md p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plane className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Add to trip</h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Flight summary */}
        <div className="rounded-lg bg-slate-50 dark:bg-slate-800 p-3 text-sm">
          <p className="font-medium text-slate-900 dark:text-slate-100">
            {firstSeg?.departure.iataCode} → {lastSeg?.arrival.iataCode}
          </p>
          <p className="text-slate-500 text-xs mt-0.5">
            {flightNumber} · {formatDuration(itinerary?.duration || 'PT0M')} ·{' '}
            {offer.price.currency === 'EUR' ? '€' : offer.price.currency}{parseFloat(offer.price.total).toFixed(0)}
          </p>
        </div>

        {/* Trip selector */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Select trip</label>
          {trips.length === 0 ? (
            <p className="text-sm text-slate-400">No trips found. Create a trip first.</p>
          ) : (
            <select
              value={selectedTripId ?? ''}
              onChange={e => setSelectedTripId(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
            >
              {trips.map(trip => (
                <option key={trip.id} value={trip.id}>{trip.title}</option>
              ))}
            </select>
          )}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !selectedTripId || trips.length === 0}
            className="px-4 py-2 text-sm bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg disabled:opacity-50 hover:bg-slate-700 dark:hover:bg-slate-300 transition-colors"
          >
            {saving ? 'Saving...' : 'Add to trip'}
          </button>
        </div>
      </div>
    </div>
  )
}
