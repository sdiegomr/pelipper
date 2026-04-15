// client/src/components/FlightSearch/FlightCard.tsx
import { Plane, Clock, ExternalLink, Plus } from 'lucide-react'
import type { FlightOffer } from '../../hooks/useFlightSearch'
import { parseDuration } from './FilterPanel'

interface FlightCardProps {
  offer: FlightOffer
  onAddToTrip: (offer: FlightOffer) => void
}

function formatTime(isoAt: string): string {
  try {
    return new Date(isoAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch { return isoAt }
}

function formatDuration(iso: string): string {
  const mins = parseDuration(iso)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h ${m > 0 ? m + 'm' : ''}`.trim()
}

function buildBookingUrl(offer: FlightOffer): string {
  const seg = offer.itineraries[0]?.segments[0]
  if (!seg) return 'https://www.google.com/travel/flights'
  const origin = seg.departure.iataCode
  const segs = offer.itineraries[0].segments
  const dest = segs[segs.length - 1]?.arrival.iataCode || ''
  const date = seg.departure.at.slice(0, 10).replace(/-/g, '')
  return `https://www.google.com/travel/flights?q=flights+${origin}+to+${dest}+${date}`
}

export function FlightCard({ offer, onAddToTrip }: FlightCardProps) {
  const itinerary = offer.itineraries[0]
  const segments = itinerary?.segments || []
  const firstSeg = segments[0]
  const lastSeg = segments[segments.length - 1]
  const stops = segments.length - 1
  const cabin = offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin || 'ECONOMY'

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-4 hover:border-slate-400 dark:hover:border-slate-500 transition-colors">
      <div className="flex items-center justify-between gap-4">
        {/* Route + times */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <div className="text-center">
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{formatTime(firstSeg?.departure.at || '')}</p>
              <p className="text-xs text-slate-500 font-mono">{firstSeg?.departure.iataCode}</p>
            </div>

            <div className="flex-1 flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-1 text-xs text-slate-400">
                <Clock className="w-3 h-3" />
                {formatDuration(itinerary?.duration || 'PT0M')}
              </div>
              <div className="w-full flex items-center gap-1">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                <Plane className="w-3 h-3 text-slate-400" />
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              </div>
              <p className="text-xs text-slate-400">
                {stops === 0 ? 'Direct' : `${stops} stop${stops > 1 ? 's' : ''}`}
              </p>
            </div>

            <div className="text-center">
              <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{formatTime(lastSeg?.arrival.at || '')}</p>
              <p className="text-xs text-slate-500 font-mono">{lastSeg?.arrival.iataCode}</p>
            </div>
          </div>

          <div className="mt-2 flex items-center gap-3 text-xs text-slate-400">
            <span className="font-mono">{firstSeg?.carrierCode}{firstSeg?.number}</span>
            <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400">{cabin}</span>
          </div>
        </div>

        {/* Price + actions */}
        <div className="flex flex-col items-end gap-2 shrink-0">
          <div className="text-right">
            <p className="text-xl font-bold text-slate-900 dark:text-slate-100">
              {offer.price.currency === 'EUR' ? '€' : offer.price.currency}{parseFloat(offer.price.total).toFixed(0)}
            </p>
            <p className="text-xs text-slate-400">per person</p>
          </div>

          <div className="flex gap-2">
            <a
              href={buildBookingUrl(offer)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 text-xs border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Book <ExternalLink className="w-3 h-3" />
            </a>
            <button
              type="button"
              onClick={() => onAddToTrip(offer)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg hover:bg-slate-700 dark:hover:bg-slate-300 transition-colors"
            >
              <Plus className="w-3 h-3" /> Add to trip
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
