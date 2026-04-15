// client/src/pages/FlightSearchPage.tsx
import { useState, useMemo } from 'react'
import { Plane } from 'lucide-react'
import Navbar from '../components/Layout/Navbar'
import { SearchForm } from '../components/FlightSearch/SearchForm'
import { FilterPanel, applyFilters, applySort, getMaxPrice } from '../components/FlightSearch/FilterPanel'
import { FlightCard } from '../components/FlightSearch/FlightCard'
import { AddToTripModal } from '../components/FlightSearch/AddToTripModal'
import { useFlightSearch } from '../hooks/useFlightSearch'
import { useFlightPreferences } from '../hooks/useFlightPreferences'
import { PelipperLoader } from '../components/PelipperLoader'
import type { FlightOffer } from '../hooks/useFlightSearch'
import type { Filters, SortOption } from '../components/FlightSearch/FilterPanel'
import { useSettingsStore } from '../store/settingsStore'

export default function FlightSearchPage() {
  const { offers, loading, error, searched, search } = useFlightSearch()
  const { preferences, savePreferences } = useFlightPreferences()
  const { settings } = useSettingsStore()
  const darkMode = settings.dark_mode
  const dark = darkMode === true || darkMode === 'dark' || (darkMode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  const [filters, setFilters] = useState<Filters>({
    maxStops: 2,
    maxPrice: 5000,
    departureTimeWindow: 'any',
    preferredAirlines: [],
  })
  const [sort, setSort] = useState<SortOption>('cheapest')
  const [addToTripOffer, setAddToTripOffer] = useState<FlightOffer | null>(null)
  const [addedCount, setAddedCount] = useState(0)

  // Reset max price filter when new results arrive
  useMemo(() => {
    if (offers.length > 0) {
      setFilters(f => ({ ...f, maxPrice: getMaxPrice(offers) }))
    }
  }, [offers])

  const displayOffers = useMemo(
    () => applySort(applyFilters(offers, filters), sort),
    [offers, filters, sort]
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6" style={{ paddingTop: 'calc(var(--nav-h) + 1.5rem)' }}>
        <div className="flex items-center gap-3">
          <Plane className="w-5 h-5 text-slate-400" />
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Flight Search</h1>
        </div>

        <SearchForm
          preferences={preferences}
          onSearch={search}
          onSavePreferences={savePreferences}
          loading={loading}
        />

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <PelipperLoader size={100} darkMode={dark} />
            <p className="text-sm text-slate-400">Searching flights...</p>
          </div>
        )}

        {!loading && searched && (
          <div className="flex gap-5">
            {/* Filters sidebar */}
            {offers.length > 0 && (
              <div className="hidden lg:block w-56 shrink-0">
                <FilterPanel
                  offers={offers}
                  filters={filters}
                  sort={sort}
                  onFiltersChange={setFilters}
                  onSortChange={setSort}
                />
              </div>
            )}

            {/* Results */}
            <div className="flex-1 space-y-3">
              {displayOffers.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-sm">
                  {offers.length === 0 ? 'No flights found. Try different dates or airports.' : 'No results match your filters.'}
                </div>
              ) : (
                <>
                  <p className="text-xs text-slate-400">{displayOffers.length} of {offers.length} flights</p>
                  {displayOffers.map(offer => (
                    <FlightCard
                      key={offer.id}
                      offer={offer}
                      onAddToTrip={setAddToTripOffer}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        )}

        {!loading && !searched && (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-sm gap-2">
            <Plane className="w-10 h-10 text-slate-200 dark:text-slate-700" />
            Search for flights above to get started.
          </div>
        )}
      </div>

      {addToTripOffer && (
        <AddToTripModal
          offer={addToTripOffer}
          onClose={() => setAddToTripOffer(null)}
          onAdded={() => setAddedCount(c => c + 1)}
        />
      )}

      {addedCount > 0 && (
        <div className="fixed bottom-4 right-4 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-sm px-4 py-2 rounded-lg shadow-lg">
          Flight added to trip
        </div>
      )}
    </div>
  )
}
