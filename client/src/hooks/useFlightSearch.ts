// client/src/hooks/useFlightSearch.ts
import { useState, useCallback } from 'react'

export interface FlightSegment {
  departure: { iataCode: string; at: string }
  arrival: { iataCode: string; at: string }
  carrierCode: string
  number: string
}

export interface FlightItinerary {
  duration: string
  segments: FlightSegment[]
}

export interface FlightOffer {
  id: string
  price: { total: string; currency: string }
  itineraries: FlightItinerary[]
  numberOfBookableSeats?: number
  travelerPricings?: Array<{ fareDetailsBySegment: Array<{ cabin: string }> }>
}

export interface FlightSearchParams {
  originLocationCode: string
  destinationLocationCode: string
  departureDate: string
  returnDate?: string
  adults: number
  travelClass: string
  nonStop: boolean
  currencyCode: string
}

export function useFlightSearch() {
  const [offers, setOffers] = useState<FlightOffer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searched, setSearched] = useState(false)

  const search = useCallback(async (params: FlightSearchParams) => {
    setLoading(true)
    setError(null)
    setSearched(true)
    try {
      const res = await fetch('/api/flights/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(params),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Search failed')
      setOffers(data.offers)
    } catch (err: any) {
      setError(err.message)
      setOffers([])
    } finally {
      setLoading(false)
    }
  }, [])

  return { offers, loading, error, searched, search }
}
