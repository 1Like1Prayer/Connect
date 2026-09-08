import { discoverPageCopy } from '../../copies/index'
import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Avatar, Badge, Button, CategoryLabel, EmptyState, Field, Modal } from '../../components/UI'
import { MapView } from '../../components/MapView'
import { LocationPicker } from '../../components/LocationPicker'
import type { LocationSelection } from '../../components/LocationPicker'
import { CATEGORIES, getCategory, SUBCATEGORIES } from '../../lib/catalog'
import { getAttendance, useAppStore } from '../../lib/store'
import { costLabel, dayLabel, getDistanceKilometers, distanceLabel, durationLabel, hasMapPoint, isEnded, isSoon, spotsLabel, startsIn, timeLabel } from '../../lib/format'
import type { Connect } from '../../lib/types'
import { normalizeDiscoverySort, sortConnects } from './sortConnects'
import styles from './DiscoverPage.module.css'

const filterSchema = z.object({
  radiusKilometers: z.number().min(1).max(100), timeFilter: z.string(), skillLevelFilter: z.string(), ageFilter: z.string(), costFilter: z.string(),
})
const defaults = { radiusKilometers: 5, timeFilter: discoverPageCopy.anyTime, skillLevelFilter: discoverPageCopy.any, ageFilter: discoverPageCopy.any, costFilter: discoverPageCopy.any }
const filterGroups: { name: 'timeFilter' | 'skillLevelFilter' | 'ageFilter' | 'costFilter'; label: string; options: { value: string; label: string }[] }[] = [
  { name: 'timeFilter', label: discoverPageCopy.when, options: [
    { value: discoverPageCopy.anyTime, label: discoverPageCopy.anytime }, { value: discoverPageCopy.today, label: discoverPageCopy.today },
    { value: discoverPageCopy.tomorrow, label: discoverPageCopy.tomorrow }, { value: discoverPageCopy.thisWeek, label: discoverPageCopy.thisWeek },
  ] },
  { name: 'skillLevelFilter', label: discoverPageCopy.skillLevel, options: [discoverPageCopy.any, discoverPageCopy.beginner, discoverPageCopy.intermediate, discoverPageCopy.advanced].map(value => ({ value, label: value })) },
  { name: 'ageFilter', label: discoverPageCopy.ageGroups, options: [
    { value: discoverPageCopy.any, label: discoverPageCopy.any },
    { value: '18+', label: discoverPageCopy.ageAdult }, { value: '18-25', label: discoverPageCopy.age18to25 },
    { value: '25-35', label: discoverPageCopy.age25to35 }, { value: '35+', label: discoverPageCopy.age35Plus },
  ] },
  { name: 'costFilter', label: discoverPageCopy.cost, options: [
    { value: discoverPageCopy.any, label: discoverPageCopy.any }, { value: 'free', label: discoverPageCopy.free },
    { value: 'split', label: discoverPageCopy.splitCost }, { value: 'own', label: discoverPageCopy.payYourOwn }, { value: 'ticketed', label: discoverPageCopy.ticketed },
  ] },
]
function normalizedFilter(name: 'timeFilter' | 'skillLevelFilter' | 'ageFilter' | 'costFilter', value: string | null) {
  return filterGroups.find(group => group.name === name)!.options.some(option => option.value === value) ? value! : defaults[name]
}
export function DiscoverPage() {
  const [params, setParams] = useSearchParams(), navigate = useNavigate()
  const connects = useAppStore(applicationState => applicationState.connects), blockedUserIds = useAppStore(applicationState => applicationState.blockedUserIds)
  const layout = useAppStore(applicationState => applicationState.layout), cardStyle = useAppStore(applicationState => applicationState.cardStyle)
  const profile = useAppStore(applicationState => applicationState.profile), join = useAppStore(applicationState => applicationState.joinConnect)
  const defaultRadiusKilometers = useAppStore(applicationState => applicationState.defaultRadiusKilometers)
  const [filtersOpen, setFiltersOpen] = useState(false), [mapOpen, setMapOpen] = useState(true), [listOpen, setListOpen] = useState(true)
  const [active, setActive] = useState<string | null>(null), [guestTarget, setGuestTarget] = useState<Connect | null>(null)
  const [locationOpen, setLocationOpen] = useState(false), [location, setLocation] = useState<LocationSelection | null>(null)
  const [draftLocation, setDraftLocation] = useState<LocationSelection | null>(null), [loading, setLoading] = useState(false)
  const query = (params.get('q') ?? '').trim().toLowerCase()
  const selectedCategories = (params.get('category') ?? '').split(',').filter(Boolean)
  const selectedSub = params.get('subcategory')
  const radiusValue = Number(params.get('radiusKilometers') ?? defaultRadiusKilometers), radiusKilometers = Number.isFinite(radiusValue) ? Math.min(100, Math.max(1, radiusValue)) : 5
  const timeFilter = normalizedFilter('timeFilter', params.get('timeFilter')), skillLevelFilter = normalizedFilter('skillLevelFilter', params.get('skillLevelFilter')), ageFilter = normalizedFilter('ageFilter', params.get('ageFilter')), costFilter = normalizedFilter('costFilter', params.get('costFilter'))
  const spotsOnly = params.get('spots') === 'true', sort = normalizeDiscoverySort(params.get('sort'))
  const { register, control, handleSubmit, reset, formState: { errors } } = useForm({ resolver: zodResolver(filterSchema), defaultValues: { radiusKilometers, timeFilter, skillLevelFilter, ageFilter, costFilter } })
  const draftFilters = useWatch({ control })
  const changeParam = (key: string, value?: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value); else next.delete(key)
    setParams(next, { replace: true })
  }
  const clear = () => { setParams({}); reset({ ...defaults, radiusKilometers: defaultRadiusKilometers }) }
  const applyFilters = handleSubmit(values => {
    const next = new URLSearchParams(params)
    for (const [key, value] of Object.entries(values)) {
      const defaultValue = key === 'radiusKilometers' ? defaultRadiusKilometers : defaults[key as keyof typeof defaults]
      if (value === defaultValue) next.delete(key); else next.set(key, String(value))
    }
    setParams(next, { replace: true }); setFiltersOpen(false)
  })
  const rows = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today), afterTomorrow = new Date(today), weekEnd = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    afterTomorrow.setDate(today.getDate() + 2)
    weekEnd.setDate(today.getDate() + (8 - (today.getDay() || 7)))
    const filtered = connects
      .filter(connect => !blockedUserIds.includes(connect.hostId) && connect.visibility === discoverPageCopy.everyone && connect.status === 'published' && !isEnded(connect))
      .map(connect => location && hasMapPoint(connect) ? { ...connect, distanceKilometers: getDistanceKilometers(location.latitude, location.longitude, connect.latitude, connect.longitude) } : connect)
      .filter(connect => {
        if (selectedCategories.length && !selectedCategories.includes(connect.categoryKey)) return false
        if (selectedSub && !connect.subcategoryNames.includes(selectedSub)) return false
        if ((connect.distanceKilometers !== null && connect.distanceKilometers > radiusKilometers) || (spotsOnly && connect.capacity !== null && connect.attendees.length >= connect.capacity)) return false
        if (query && ![connect.title, connect.hostName, connect.publicAreaLabel, ...connect.subcategoryNames, getCategory(connect.categoryKey).name].join(' ').toLowerCase().includes(query)) return false
        const start = Date.parse(connect.startsAt), end = Date.parse(connect.endsAt)
        if (timeFilter === discoverPageCopy.today && !(start < tomorrow.getTime() && end > today.getTime())) return false
        if (timeFilter === discoverPageCopy.tomorrow && !(start < afterTomorrow.getTime() && end > tomorrow.getTime())) return false
        if (timeFilter === discoverPageCopy.thisWeek && start >= weekEnd.getTime()) return false
        if (skillLevelFilter !== discoverPageCopy.any && connect.skillLevel !== skillLevelFilter) return false
        const ageRestriction = connect.ageRestriction.replace(/[\u2013\u2014]/g, '-')
        if (ageFilter === '18+' && !(Number(ageRestriction.match(/\d+/)?.[0] ?? 0) >= 18)) return false
        if (ageFilter !== discoverPageCopy.any && ageFilter !== '18+' && ageRestriction !== ageFilter) return false
        if (costFilter !== discoverPageCopy.any && connect.costType !== costFilter) return false
        return true
      })
    return sortConnects(filtered, sort, query, profile?.interests ?? [])
  }, [connects, blockedUserIds, location, params.toString(), profile?.interests])
  const soon = rows.filter(isSoon).slice(0, 4)
  const onJoin = (connect: Connect) => {
    if (!profile) { setGuestTarget(connect); return }
    if (getAttendance(connect, profile)) { navigate(`/connect/${connect.id}`); return }
    join(connect.id)
  }
  const activeFilters = [...params.entries()].filter(([key]) => !['q', 'sort', 'category', 'spots'].includes(key))
  return <>
    <h1 className="srOnly">{discoverPageCopy.discoverConnects}</h1>
    <div className={styles.categories} aria-label={discoverPageCopy.categoryFilters}><button aria-pressed={!selectedCategories.length} className={!selectedCategories.length ? styles.selectedCategory : ''} onClick={() => { const next = new URLSearchParams(params); next.delete('category'); next.delete('subcategory'); setParams(next) }}>{discoverPageCopy.allCategories}</button>{CATEGORIES.map(category => <button key={category.key} aria-pressed={selectedCategories.includes(category.key)} className={selectedCategories.includes(category.key) ? styles.selectedCategory : ''} onClick={() => {
      const next = new URLSearchParams(params), selected = selectedCategories.includes(category.key) ? selectedCategories.filter(key => key !== category.key) : [...selectedCategories, category.key]
      if (selected.length) next.set('category', selected.join(',')); else next.delete('category')
      next.delete('subcategory'); setParams(next)
    }}><CategoryLabel category={category.key} /></button>)}</div>
    {selectedCategories.length === 1 && CATEGORIES.some(category => category.key === selectedCategories[0]) && <div className={styles.subcategories}><span>{discoverPageCopy.within}{getCategory(CATEGORIES.find(category => category.key === selectedCategories[0])!.key).name}{discoverPageCopy.colonSeparator}</span>{SUBCATEGORIES[CATEGORIES.find(category => category.key === selectedCategories[0])!.key].map(subcategoryName => <button key={subcategoryName} aria-pressed={selectedSub === subcategoryName} onClick={() => changeParam('subcategory', selectedSub === subcategoryName ? undefined : subcategoryName)}>{subcategoryName}</button>)}</div>}
    <div className={styles.toolbar}><strong>{rows.length}{discoverPageCopy.connectsNearby}</strong><Button variant="ghost" onClick={() => setLocationOpen(true)}>{discoverPageCopy.locationSymbol} {location?.label ?? discoverPageCopy.florentin}{discoverPageCopy.spacedMiddleDotSeparator}{radiusKilometers}{discoverPageCopy.kilometersSuffix}</Button>{activeFilters.map(([key, value]) => <Button key={key} variant="ghost" onClick={() => changeParam(key)} aria-label={discoverPageCopy.removeFilter(String(key))}>{value} {discoverPageCopy.removeSymbol}</Button>)}{params.size > 0 && <button className={styles.clear} onClick={clear}>{discoverPageCopy.clearAll}</button>}<span className="grow" /><Button aria-pressed={spotsOnly} variant={spotsOnly ? 'primary' : 'default'} onClick={() => changeParam('spots', spotsOnly ? undefined : 'true')}>{discoverPageCopy.hasSpotsOpen}</Button><Button aria-expanded={filtersOpen} variant={filtersOpen ? 'primary' : 'default'} onClick={() => { reset({ radiusKilometers, timeFilter, skillLevelFilter, ageFilter, costFilter }); setFiltersOpen(!filtersOpen) }}>{discoverPageCopy.filters}</Button>
      <div className={styles.sortGroup} role="radiogroup" aria-label={discoverPageCopy.sortConnects}>
        <span aria-hidden="true">{discoverPageCopy.sort}</span>
        {[
          { value: 'distance', label: discoverPageCopy.distance, hint: undefined },
          { value: 'relevance', label: discoverPageCopy.relevance, hint: discoverPageCopy.relevanceHint },
          { value: 'popularity', label: discoverPageCopy.popularity, hint: undefined },
        ].map(option => <label key={option.value} className={`${styles.sortChoice} ${sort === option.value ? styles.selectedChoice : ''}`} title={option.hint}>
          <input type="radio" name="discovery-sort" value={option.value} checked={sort === option.value} onChange={() => changeParam('sort', option.value)} />
          <span>{option.label}</span>
        </label>)}
      </div>
      <Button onClick={() => { setMapOpen(!mapOpen); setListOpen(true) }}>{mapOpen ? discoverPageCopy.hideMap : discoverPageCopy.showMap}</Button><Button variant="ghost" onClick={() => { setLoading(true); window.setTimeout(() => setLoading(false), 500) }}>{discoverPageCopy.reload}</Button></div>
    <div className={`${styles.workspace} ${layout === 'board' ? styles.board : ''} ${!mapOpen ? styles.noMap : ''} ${!listOpen ? styles.noList : ''} ${filtersOpen ? styles.withFilters : ''}`}>
      {filtersOpen && <aside className={styles.filters}><form onSubmit={applyFilters} noValidate><div className={styles.filterHeading}><h3>{discoverPageCopy.filters}</h3><button type="button" onClick={() => reset({ ...defaults, radiusKilometers: defaultRadiusKilometers })}>{discoverPageCopy.reset}</button></div><Field label={discoverPageCopy.distance} htmlFor="filter-radius" error={errors.radiusKilometers?.message}><output htmlFor="filter-radius" className={styles.radiusValue}>{discoverPageCopy.within}{draftFilters.radiusKilometers}{discoverPageCopy.kmOf}{location?.label ?? discoverPageCopy.florentin}</output><input id="filter-radius" className={styles.radiusSlider} type="range" min={1} max={100} step={1} {...register('radiusKilometers', { valueAsNumber: true })} /><div className={styles.rangeEnds}><span>{discoverPageCopy.text1Km}</span><span>{discoverPageCopy.text100Km}</span></div></Field>
        {filterGroups.map(group => <fieldset key={group.name} className={styles.filterGroup}><legend>{group.label}</legend><div className={styles.filterChoices}>{group.options.map(option => <label key={option.value} className={`${styles.filterChoice} ${draftFilters[group.name] === option.value ? styles.selectedChoice : ''}`}><input type="radio" value={option.value} {...register(group.name)} /><span>{option.label}</span></label>)}</div></fieldset>)}
        <Button type="submit" variant="primary">{discoverPageCopy.showConnects}</Button></form></aside>}
      {listOpen && <div className={styles.results} aria-busy={loading}>
        {loading ? <div role="status" aria-label={discoverPageCopy.refreshingConnects} className={styles.skeletons}>{[1, 2, 3, 4].map(index => <div key={index} />)}</div> : <>
          {soon.length > 0 && <section className={styles.soon}><div className={styles.soonHeading}><span /><h2>{discoverPageCopy.startingSoonNearYou}</h2><small>{discoverPageCopy.inTheNextFewHoursNearbyOrOnline}</small></div><div className={styles.soonGrid}>{soon.map(connect => <Link key={connect.id} to={`/connect/${connect.id}`} className={styles.soonCard} style={{ borderTopColor: getCategory(connect.categoryKey).primaryColor }} onMouseEnter={() => setActive(connect.id)}><div><CategoryLabel category={connect.categoryKey} subcategoryName={connect.subcategoryNames[0]} /><small>{startsIn(connect)}</small></div><h3>{connect.title}</h3><footer><b>{distanceLabel(connect)}</b><span>{timeLabel(connect.startsAt, connect.timeZone)}</span><span>{connect.capacity === null ? discoverPageCopy.going(String(connect.attendees.length)) : discoverPageCopy.spotsLeft(String(connect.capacity - connect.attendees.length))}</span></footer></Link>)}</div></section>}
          {rows.length ? <div className={`${styles.cards} ${cardStyle === 'tile' ? styles.tiles : ''}`}>{rows.map(connect => <ConnectCard key={connect.id} connect={connect} tile={cardStyle === 'tile'} active={active === connect.id} onHover={() => setActive(connect.id)} onJoin={() => onJoin(connect)} />)}</div> : <EmptyState title={discoverPageCopy.nothingPinnedHereYet} action={<div className="row"><Button variant="primary" onClick={() => navigate('/host')}>{discoverPageCopy.hostAConnect}</Button><Button onClick={clear}>{discoverPageCopy.clearFilters}</Button></div>}>{discoverPageCopy.tryAWiderRadiusAnotherCategoryOrADifferent}</EmptyState>}
        </>}
      </div>}
      {mapOpen && <div className={styles.mapPane}><div className={styles.mapToolbar}><Badge>{rows.filter(hasMapPoint).length}{discoverPageCopy.locations}</Badge><Button onClick={() => setListOpen(!listOpen)}>{listOpen ? discoverPageCopy.hideList : discoverPageCopy.showList}</Button></div><MapView connects={rows} activeId={active} onSelect={setActive} center={location ?? undefined} /></div>}
    </div>
    {guestTarget && <Modal title={discoverPageCopy.saveYourSpotIn(String(guestTarget.title))} onClose={() => setGuestTarget(null)}><p>{discoverPageCopy.youHaveBeenBrowsingAsAGuestWhichIs}{guestTarget.hostName.split(' ')[0]}{discoverPageCopy.justNeedsANameToExpectAtTheGate}</p><div className="row"><Button variant="primary" onClick={() => navigate(`/signup?returnTo=${encodeURIComponent(`/connect/${guestTarget.id}`)}`)}>{discoverPageCopy.signUpAndJoin}</Button><Button onClick={() => navigate(`/?returnTo=${encodeURIComponent(`/connect/${guestTarget.id}`)}`)}>{discoverPageCopy.iHaveAnAccount}</Button></div></Modal>}
    {locationOpen && <Modal title={discoverPageCopy.whereShouldWeLook} onClose={() => setLocationOpen(false)}><LocationPicker value={draftLocation} onChange={setDraftLocation} /><Button variant="primary" disabled={!draftLocation?.confirmed} onClick={() => { setLocation(draftLocation); setLocationOpen(false) }}>{discoverPageCopy.searchThisArea}</Button><p className="muted"><small>{discoverPageCopy.preciseSearchCoordinatesStayInMemoryNotInThe}</small></p></Modal>}
  </>
}
export function ConnectCard({ connect, tile = false, active, onHover, onJoin }: { connect: Connect; tile?: boolean; active?: boolean; onHover?: () => void; onJoin: () => void }) {
  const profile = useAppStore(applicationState => applicationState.profile), theme = useAppStore(applicationState => applicationState.theme), palette = useAppStore(applicationState => applicationState.palette)
  const category = getCategory(connect.categoryKey), color = theme === 'dark' || palette === 'riso' ? category.alternateColor : category.primaryColor
  const attendance = getAttendance(connect, profile)
  const label = attendance === 'joined' ? discoverPageCopy.joined : attendance === 'pending' ? discoverPageCopy.requestSent : attendance === 'waitlist' ? discoverPageCopy.waitlisted : connect.capacity !== null && connect.attendees.length >= connect.capacity ? discoverPageCopy.joinWaitlist : connect.joinPolicy === 'approval' ? discoverPageCopy.requestToJoin : discoverPageCopy.join
  return <article className={`${styles.card} ${tile ? styles.tile : ''} ${active ? styles.activeCard : ''}`} style={{ '--category-color': color } as CSSProperties} onMouseEnter={onHover} onFocus={onHover}>
    {tile && <Link to={`/connect/${connect.id}`} className={styles.tileArt} aria-label={connect.title}><span>{category.glyph}</span><Badge>{connect.subcategoryNames[0]}</Badge></Link>}
    <div className={styles.cardBody}><div className={styles.badges}><CategoryLabel category={connect.categoryKey} subcategoryName={connect.subcategoryNames[0]} />{isSoon(connect) && <Badge active>{discoverPageCopy.startingSoon}</Badge>}<Badge>{connect.joinPolicy === 'approval' ? discoverPageCopy.hostApproves : discoverPageCopy.openToEveryone}</Badge>{connect.ageRestriction !== discoverPageCopy.everyoneWelcome && <Badge>{connect.ageRestriction}</Badge>}</div><h3><Link to={`/connect/${connect.id}`}>{connect.title}</Link></h3><div className={styles.hostLine}><Link to={`/profile/${connect.hostId}`}><Avatar name={connect.hostName} size={23} />{connect.hostName}</Link>{connect.isHostVerified && <span className={styles.verified}>{discoverPageCopy.checkmarkSymbol}{discoverPageCopy.verified}</span>}<span>{discoverPageCopy.starSymbol} {connect.hostRating}{discoverPageCopy.spacedMiddleDotSeparator}{connect.hostedConnectCount}{discoverPageCopy.hosted}{connect.hostAttendanceRate}{discoverPageCopy.attendance}</span><span>{costLabel(connect)}</span></div></div>
    <div className={styles.cardMetadata}><div><b className={styles.distance}>{distanceLabel(connect)}</b><small>{connect.publicAreaLabel}{connect.locationVisibility === 'private' && hasMapPoint(connect) ? discoverPageCopy.approx : ''}</small></div><div><b>{dayLabel(connect.startsAt, connect.timeZone)}{discoverPageCopy.commaSeparatorWithSpace}{timeLabel(connect.startsAt, connect.timeZone)}</b><small>{durationLabel(connect)}</small></div><div className={styles.attendance}><div className={styles.avatarStack}>{connect.attendees.slice(0, 3).map(person => <Avatar key={person.id} name={person.name} color={person.color} size={22} />)}</div><span>{spotsLabel(connect)}</span></div><Button variant={attendance === 'joined' ? 'primary' : 'default'} onClick={onJoin}>{label}</Button></div>
  </article>
}
