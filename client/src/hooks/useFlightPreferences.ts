// client/src/hooks/useFlightPreferences.ts
import { useState, useEffect, useCallback } from 'react'

export interface FlightPreferences {
  cabin_class: string
  max_stops: number
  preferred_airlines: string[]
}

const DEFAULT_PREFS: FlightPreferences = {
  cabin_class: 'ECONOMY',
  max_stops: 2,
  preferred_airlines: [],
}

export function useFlightPreferences() {
  const [preferences, setPreferences] = useState<FlightPreferences>(DEFAULT_PREFS)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch('/api/flights/preferences', { credentials: 'include' })
      .then(r => r.json())
      .then(data => {
        if (data.preferences) setPreferences(data.preferences)
      })
      .catch(() => {})
      .finally(() => setLoaded(true))
  }, [])

  const savePreferences = useCallback(async (prefs: FlightPreferences) => {
    setSaving(true)
    try {
      const res = await fetch('/api/flights/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(prefs),
      })
      if (res.ok) setPreferences(prefs)
    } finally {
      setSaving(false)
    }
  }, [])

  return { preferences, savePreferences, saving, loaded }
}
