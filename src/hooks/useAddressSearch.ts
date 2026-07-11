/**
 * Headless Google Places Autocomplete (New) via REST.
 *
 * Uses the browser-restricted key (VITE_GOOGLE_MAPS_BROWSER_KEY) directly from
 * the client — the key is HTTP-referrer locked so exposure is expected. REST
 * instead of the Maps JS widget so the dropdown can be styled like the rest of
 * the app. Autocomplete + place details share a session token so Google bills
 * the whole typing session as one Autocomplete session.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

export interface AddressSuggestion {
  placeId: string
  /** Street line, e.g. "15 Warrigal Road" */
  mainText: string
  /** Locality line, e.g. "Hughesdale VIC, Australia" */
  secondaryText: string
  fullText: string
}

export interface AddressSelection {
  /** Google's full formatted address, e.g. "15 Warrigal Rd, Hughesdale VIC 3166, Australia" */
  formattedAddress: string
  /** formattedAddress without the trailing ", Australia" — what we show in the UI */
  shortAddress: string
  /** "15 Warrigal Rd" (street number + route), falls back to shortAddress */
  streetLine: string
  latitude: number
  longitude: number
  placeId: string
  suburb: string
  state: string
  postcode: string
}

const PLACES_KEY = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as string | undefined

const newSessionToken = () =>
  typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`

// Minimal shapes of the Places (New) REST responses — only the fields we read
interface PlacePrediction {
  placeId: string
  text?: { text?: string }
  structuredFormat?: { mainText?: { text?: string }; secondaryText?: { text?: string } }
}

interface AddressComponent {
  longText?: string
  shortText?: string
  types?: string[]
}

export const useAddressSearch = () => {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [loading, setLoading] = useState(false)
  const sessionRef = useRef(newSessionToken())
  const debounceRef = useRef<number | undefined>(undefined)
  const requestSeq = useRef(0)

  const clear = useCallback(() => {
    window.clearTimeout(debounceRef.current)
    requestSeq.current++
    setSuggestions([])
    setLoading(false)
  }, [])

  const search = useCallback((input: string) => {
    window.clearTimeout(debounceRef.current)
    if (!PLACES_KEY || input.trim().length < 3) {
      setSuggestions([])
      return
    }
    debounceRef.current = window.setTimeout(async () => {
      const seq = ++requestSeq.current
      setLoading(true)
      try {
        const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': PLACES_KEY },
          body: JSON.stringify({
            input,
            includedRegionCodes: ['au'],
            sessionToken: sessionRef.current,
          }),
        })
        if (!res.ok) throw new Error(`autocomplete ${res.status}`)
        const data = await res.json()
        if (seq !== requestSeq.current) return
        setSuggestions(
          (data.suggestions ?? [])
            .map((s: { placePrediction?: PlacePrediction }) => s.placePrediction)
            .filter(Boolean)
            .map((p: PlacePrediction) => ({
              placeId: p.placeId,
              mainText: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
              secondaryText: p.structuredFormat?.secondaryText?.text ?? '',
              fullText: p.text?.text ?? '',
            }))
        )
      } catch {
        if (seq === requestSeq.current) setSuggestions([])
      } finally {
        if (seq === requestSeq.current) setLoading(false)
      }
    }, 250)
  }, [])

  const resolvePlace = useCallback(async (placeId: string): Promise<AddressSelection | null> => {
    if (!PLACES_KEY) return null
    try {
      const res = await fetch(
        `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?sessionToken=${sessionRef.current}`,
        {
          headers: {
            'X-Goog-Api-Key': PLACES_KEY,
            'X-Goog-FieldMask': 'id,formattedAddress,location,addressComponents',
          },
        }
      )
      // A details call ends the billing session either way
      sessionRef.current = newSessionToken()
      if (!res.ok) throw new Error(`place details ${res.status}`)
      const place = await res.json()
      const component = (type: string) =>
        (place.addressComponents ?? []).find((c: AddressComponent) => c.types?.includes(type))
      const formattedAddress: string = place.formattedAddress ?? ''
      const shortAddress = formattedAddress.replace(/,\s*Australia$/i, '')
      const streetNumber = component('street_number')?.longText ?? ''
      const route = component('route')?.longText ?? ''
      return {
        formattedAddress,
        shortAddress,
        streetLine: [streetNumber, route].filter(Boolean).join(' ') || shortAddress,
        latitude: place.location?.latitude ?? 0,
        longitude: place.location?.longitude ?? 0,
        placeId: place.id ?? placeId,
        suburb: component('locality')?.longText ?? '',
        state: component('administrative_area_level_1')?.shortText ?? '',
        postcode: component('postal_code')?.longText ?? '',
      }
    } catch {
      return null
    }
  }, [])

  useEffect(() => () => window.clearTimeout(debounceRef.current), [])

  return { suggestions, loading, search, clear, resolvePlace, enabled: !!PLACES_KEY }
}
