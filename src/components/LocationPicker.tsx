import { locationPickerCopy } from '../copies/index'
import { useEffect, useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { apiConfigured, apiGet, locationResultsSchema } from '../lib/api'
import { MapView } from './MapView'
import { Button, Field, Input } from './UI'
import styles from './LocationPicker.module.css'

export interface LocationSelection { label: string; latitude: number; longitude: number; confirmed: boolean }
const knownPlaces = [
  { label: locationPickerCopy.parkHaYarkonTelAviv, latitude: 32.102, longitude: 34.804 },
  { label: locationPickerCopy.gordonBeachTelAviv, latitude: 32.0836, longitude: 34.7671 },
  { label: locationPickerCopy.florentinTelAvivApproximateArea, latitude: 32.06, longitude: 34.77 },
  { label: locationPickerCopy.rothschildBoulevardTelAviv, latitude: 32.0653, longitude: 34.7737 },
  { label: locationPickerCopy.saronaTelAviv, latitude: 32.0715, longitude: 34.787 },
]
const searchSchema = z.object({ search: z.string().max(200) })
export function LocationPicker({ value, onChange }: { value: LocationSelection | null; onChange: (value: LocationSelection) => void }) {
  const { register, control } = useForm({ resolver: zodResolver(searchSchema), defaultValues: { search: '' } })
  const search = useWatch({ control, name: 'search' })
  const [results, setResults] = useState<Omit<LocationSelection, 'confirmed'>[]>([])
  const [error, setError] = useState(''), [loading, setLoading] = useState(false), [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!apiConfigured || search.trim().length < 3) { setResults([]); setLoading(false); setError(''); return }
    const controller = new AbortController()
    setResults([])
    const timer = setTimeout(() => {
      setLoading(true); setError('')
      apiGet(`/locations/search?q=${encodeURIComponent(search.trim())}`, locationResultsSchema, controller.signal)
        .then(response => setResults(response.results))
        .catch((cause: unknown) => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Location search failed. Please retry.') })
        .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }, 350)
    return () => { clearTimeout(timer); controller.abort() }
  }, [search, attempt])
  const visible = apiConfigured ? results : knownPlaces.filter(item => item.label.toLowerCase().includes(search.toLowerCase()))
  return <div className={styles.picker}>
    <Field label={locationPickerCopy.searchACityAddressOrPlace} htmlFor="location-search" hint={locationPickerCopy.selectAPlaceThenConfirmThePin}><Input id="location-search" placeholder={locationPickerCopy.tryParkHaYarkonOrFlorentin} {...register('search')} /></Field>
    {loading && <p role="status">{locationPickerCopy.lookingUpPlaces}</p>}
    {error && <div className="notice" role="alert">{error} <Button onClick={() => setAttempt(count => count + 1)}>{locationPickerCopy.retrySearch}</Button></div>}
    <div className={styles.options}>{visible.map(item => <Button key={item.label} variant={value?.label === item.label ? 'primary' : 'default'} onClick={() => onChange({ ...item, confirmed: false })}>{item.label}</Button>)}</div>
    {!loading && !error && visible.length === 0 && search.length >= 3 && <p className="muted">{locationPickerCopy.noMatchingPlacesTryACityOrADifferent}</p>}
    {value && <><div className={styles.map}><MapView compact center={value} onPick={point => onChange({ ...value, ...point, confirmed: false })} /></div><div className={styles.confirm}><div><strong>{value.label}</strong><small>{value.latitude.toFixed(4)}{locationPickerCopy.commaSeparatorWithSpace}{value.longitude.toFixed(4)} {value.confirmed ? locationPickerCopy.pinConfirmed : locationPickerCopy.confirmThisMeetingArea}</small></div><Button variant={value.confirmed ? 'default' : 'primary'} onClick={() => onChange({ ...value, confirmed: !value.confirmed })}>{value.confirmed ? locationPickerCopy.changeConfirmation : locationPickerCopy.confirmPin}</Button></div></>}
  </div>
}
