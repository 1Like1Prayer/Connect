import { mapViewCopy } from '../copies/index'
import { useEffect, useRef, useState } from 'react'
import type * as Atlas from 'azure-maps-control'
import { apiGet, mapsConfigured, mapTokenSchema } from '../lib/api'
import { CATEGORIES, getCategory } from '../lib/catalog'
import { useAppStore } from '../lib/store'
import { hasMapPoint } from '../lib/format'
import type { Connect } from '../lib/types'
import { Button } from './UI'
import styles from './MapView.module.css'

interface MapViewProps {
  connects?: Connect[]
  activeId?: string | null
  onSelect?: (id: string) => void
  center?: { latitude: number; longitude: number }
  onPick?: (point: { latitude: number; longitude: number }) => void
  compact?: boolean
}
const emptyConnects: Connect[] = []
export function MapView({ connects = emptyConnects, activeId, onSelect, center, onPick, compact }: MapViewProps) {
  const container = useRef<HTMLDivElement>(null), map = useRef<Atlas.Map | null>(null)
  const sdk = useRef<typeof Atlas | null>(null)
  const callbacks = useRef({ onSelect, onPick })
  callbacks.current = { onSelect, onPick }
  const [ready, setReady] = useState(0), [error, setError] = useState(''), [retry, setRetry] = useState(0)
  const theme = useAppStore(applicationState => applicationState.theme), palette = useAppStore(applicationState => applicationState.palette)
  useEffect(() => {
    if (!mapsConfigured || !container.current) return
    let disposed = false
    const abort = new AbortController()
    setError('')
    setReady(0)
    const fail = (message: string) => { if (!disposed) setError(message) }
    const initialize = async () => {
      const atlas = await import('azure-maps-control')
      await import('azure-maps-control/dist/atlas.min.css')
      if (disposed || !container.current) return
      sdk.current = atlas
      const instance = new atlas.Map(container.current, {
        center: [center?.longitude ?? 34.777, center?.latitude ?? 32.077], zoom: 12,
        style: theme === 'dark' ? 'night' : 'road', language: 'en-US',
        authOptions: {
          authType: atlas.AuthenticationType.anonymous,
          clientId: import.meta.env.VITE_AZURE_MAPS_CLIENT_ID,
          getToken: (resolve, reject) => {
            apiGet('/maps/token', mapTokenSchema, abort.signal).then(data => resolve(data.token)).catch((cause: unknown) => {
              if (abort.signal.aborted) return
              fail(cause instanceof Error ? cause.message : mapViewCopy.unableToLoadAzureMapsPleaseRetry)
              reject(mapViewCopy.unableToAcquireAMapToken)
            })
          },
        },
      })
      map.current = instance
      instance.events.add('ready', () => {
        if (disposed) return
        instance.controls.add(new atlas.control.ZoomControl(), { position: atlas.ControlPosition.TopRight })
        setReady(value => value + 1)
      })
      instance.events.add('error', () => fail(mapViewCopy.theMapCouldNotBeLoadedPleaseTryAgain))
      instance.events.add('click', event => {
        if (event.position && callbacks.current.onPick) callbacks.current.onPick({ latitude: event.position[1], longitude: event.position[0] })
      })
    }
    initialize().catch((cause: unknown) => fail(cause instanceof Error ? cause.message : mapViewCopy.unableToInitializeAzureMaps))
    return () => { disposed = true; abort.abort(); map.current?.dispose(); map.current = null }
    // Marker, camera, theme, and callback changes are synchronized without recreating the map.
  }, [retry])
  useEffect(() => { if (ready) map.current?.setStyle({ style: theme === 'dark' ? 'night' : 'road' }) }, [theme, ready])
  useEffect(() => {
    if (ready && center) map.current?.setCamera({ center: [center.longitude, center.latitude] })
  }, [center?.latitude, center?.longitude, ready])
  useEffect(() => {
    const instance = map.current, atlas = sdk.current
    if (!ready || !instance || !atlas) return
    instance.markers.clear()
    for (const connect of connects) {
      if (!hasMapPoint(connect)) continue
      const category = getCategory(connect.categoryKey)
      const element = document.createElement('button')
      element.type = 'button'
      element.className = `${styles.pin} ${activeId === connect.id ? styles.selectedPin : ''}`
      element.style.background = palette === 'riso' || theme === 'dark' ? category.alternateColor : category.primaryColor
      element.textContent = category.glyph
      element.setAttribute('aria-label', mapViewCopy.open(String(connect.title)))
      element.onclick = event => { event.stopPropagation(); callbacks.current.onSelect?.(connect.id) }
      instance.markers.add(new atlas.HtmlMarker({ position: [connect.longitude, connect.latitude], htmlContent: element }))
    }
    if (center && callbacks.current.onPick) instance.markers.add(new atlas.HtmlMarker({ position: [center.longitude, center.latitude], color: '#35793f' }))
  }, [connects, activeId, palette, theme, ready, center?.latitude, center?.longitude])
  const unavailable = !mapsConfigured || !!error
  return <section className={`${styles.map} ${compact ? styles.compact : ''}`} aria-label={mapViewCopy.connectMap}>
    <div className={styles.liveMap} ref={container} />
    {unavailable ? <div className={styles.fallback}>
      <div className={styles.fallbackHeading}><span className={styles.mapGlyph} aria-hidden="true">{mapViewCopy.locationSymbol}</span><h3>{mapViewCopy.mapUnavailable}</h3><p>{error || (compact ? mapViewCopy.theMapCouldNotBeLoadedMeetingDetailsAre : mapViewCopy.theMapCouldNotBeLoadedYouCanStill)}</p>{mapsConfigured && <Button onClick={() => setRetry(value => value + 1)}>{mapViewCopy.retryMap}</Button>}</div>
    </div> : !ready && <div className={styles.loading} role="status">{mapViewCopy.loadingAzureMaps}</div>}
    {!compact && !unavailable && <div className={styles.legend}><strong>{mapViewCopy.categories}</strong><div>{CATEGORIES.map(category => <span key={category.key}><i style={{ color: theme === 'dark' || palette === 'riso' ? category.alternateColor : category.primaryColor }}>{category.glyph}</i>{category.name}</span>)}</div></div>}
  </section>
}
