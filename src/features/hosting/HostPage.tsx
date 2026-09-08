import { hostPageCopy } from '../../copies/index'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import type { FieldErrors } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useParams } from 'react-router'
import { LocationPicker } from '../../components/LocationPicker'
import { Badge, Button, CategoryLabel, EmptyState, Field, Input, Modal, Panel, Toggle } from '../../components/UI'
import { CATEGORIES, getCategory, SUBCATEGORIES } from '../../lib/catalog'
import { dayLabel, getDistanceKilometers, isEnded, timeLabel } from '../../lib/format'
import { useAppStore } from '../../lib/store'
import type { Profile } from '../../lib/types'
import { ChoiceGroup, ShareInvite } from './HostingUI'
import {
  AGE_OPTIONS, COST_OPTIONS, createHostSchema, defaultHostValues, draftSchema, eventTimes, connectArea, hostCostLabel,
  joiningExplanation, localTimeCandidates, localToInstant, needsOtherDetails, savedDraftSchema, SKILL_OPTIONS, STEP_FIELDS, STEPS, validTimezone, zonedFields,
} from './hostSchema'
import type { HostValues, HostingConnect } from './hostSchema'
import styles from './Hosting.module.css'

function readDraft(key: string, fallback: HostValues) {
  const fresh = { values: fallback, restored: false, warning: '', step: 0, furthest: 0 }
  try {
    const saved = sessionStorage.getItem(key)
    if (!saved) return fresh
    const json: unknown = JSON.parse(saved)
    const envelope = savedDraftSchema.safeParse(json)
    if (envelope.success) return { ...envelope.data, furthest: Math.max(envelope.data.step, envelope.data.furthest), restored: true, warning: '' }
    const parsed = draftSchema.safeParse(json)
    return parsed.success
      ? { ...fresh, values: parsed.data, restored: true }
      : { ...fresh, warning: hostPageCopy.yourSavedDraftCouldNotBeOpenedYouCan }
  } catch (error) {
    if (!(error instanceof SyntaxError || error instanceof DOMException)) throw error
    return { ...fresh, warning: hostPageCopy.yourSavedDraftCouldNotBeOpenedKeepThis }
  }
}

export function HostPage() {
  const { id } = useParams()
  const profile = useAppStore(applicationState => applicationState.profile)
  const existing = useAppStore(applicationState => applicationState.connects.find(connect => connect.id === id))
  if (!profile) return <div className="pageNarrow"><EmptyState title={hostPageCopy.aProfileMakesYouTheHost} action={<Link to="/signup">{hostPageCopy.createAProfile}</Link>}>{hostPageCopy.createAProfileToHostAndManageYourConnects}</EmptyState></div>
  if (id && !existing) return <div className="pageNarrow"><EmptyState title={hostPageCopy.thisConnectCouldNotBeFound} action={<Link to="/mine">{hostPageCopy.backToMyConnects}</Link>}>{hostPageCopy.theLinkMayBeOutOfDate}</EmptyState></div>
  if (existing && existing.hostId !== profile.id) return <div className="pageNarrow"><EmptyState title={hostPageCopy.onlyTheHostCanEditThisConnect} action={<Link to={`/connect/${existing.id}`}>{hostPageCopy.viewTheConnect}</Link>}>{hostPageCopy.signInWithTheProfileThatCreatedThisConnect}</EmptyState></div>
  if (existing && (existing.status === 'cancelled' || isEnded(existing))) return <div className="pageNarrow"><EmptyState title={hostPageCopy.thisConnectIsNoLongerEditable} action={<Link to={`/connect/${existing.id}/manage`}>{hostPageCopy.viewHostManagement}</Link>}>{hostPageCopy.cancelledAndEndedConnectsKeepTheirOriginalDetails}</EmptyState></div>
  return <HostWizard key={`${profile.id}:${id ?? 'new'}`} profile={profile} existing={existing} />
}

function HostWizard({ profile, existing }: { profile: Profile; existing?: HostingConnect }) {
  const navigate = useNavigate(), heading = useRef<HTMLHeadingElement>(null), publishing = useRef(false)
  const publishConnect = useAppStore(applicationState => applicationState.publishConnect), updateConnect = useAppStore(applicationState => applicationState.updateConnect)
  const notify = useAppStore(applicationState => applicationState.notify)
  const draftKey = `connect-host-draft-v2:${profile.id}:${existing?.id ?? 'new'}`
  const [initial] = useState(() => readDraft(draftKey, defaultHostValues(existing)))
  const [step, setStep] = useState(initial.step), [furthest, setFurthest] = useState(initial.furthest)
  const [published, setPublished] = useState<HostingConnect | null>(null)
  const [inviting, setInviting] = useState(false), [draftMessage, setDraftMessage] = useState(initial.warning)
  const [restored, setRestored] = useState(initial.restored)
  const schema = useMemo(() => createHostSchema(existing), [existing])
  const { register, control, setValue, getValues, reset, trigger, handleSubmit, setError, clearErrors, formState: { errors, isSubmitting, dirtyFields } } = useForm<HostValues>({
    resolver: zodResolver(schema), defaultValues: initial.values, mode: 'onSubmit',
  })
  const values = useWatch({ control }) as HostValues
  const category = getCategory(values.categoryKey)
  const privateLocation = values.locationVisibility === 'private'
  const joiningHint = privateLocation ? hostPageCopy.instantJoiningLockedByPrivacy
    : values.joinPolicy === 'approval' ? hostPageCopy.instantJoiningAvailable : hostPageCopy.instantJoiningEnabled
  const physical = values.locationType === 'physical'
  const placeLabel = physical ? values.location?.label ?? hostPageCopy.chooseAVenue : values.locationType === 'online' ? hostPageCopy.online : hostPageCopy.placeToBeDecided
  const startCandidates = useMemo(() => localTimeCandidates(values.startDate, values.startTime, values.timeZone), [values.startDate, values.startTime, values.timeZone])
  const endCandidates = useMemo(() => localTimeCandidates(values.endDate, values.endTime, values.timeZone), [values.endDate, values.endTime, values.timeZone])
  const startRepeated = startCandidates.success && startCandidates.instants.length > 1
  const endRepeated = endCandidates.success && endCandidates.instants.length > 1
  const time = eventTimes(values, existing)
  const startOccurrenceLabel = values.creationMode === 'later' && startRepeated && values.startOccurrence ? values.startOccurrence === 'first' ? hostPageCopy.firstOccurrence : hostPageCopy.secondOccurrence : ''
  const endOccurrenceLabel = endRepeated && values.endOccurrence ? values.endOccurrence === 'first' ? hostPageCopy.firstOccurrence : hostPageCopy.secondOccurrence : ''
  const dateSummary = time.start.success && time.end.success
    ? `${dayLabel(time.start.iso, values.timeZone)}, ${timeLabel(time.start.iso, values.timeZone)}${startOccurrenceLabel} - ${dayLabel(time.end.iso, values.timeZone)}, ${timeLabel(time.end.iso, values.timeZone)}${endOccurrenceLabel}`
    : hostPageCopy.chooseADateAndTime
  const capacitySummary = values.unlimited ? hostPageCopy.noLimit : hostPageCopy.peopleIncludingYou(String(values.capacity || '?'))
  const options = { shouldDirty: true, shouldValidate: true } as const

  useEffect(() => { heading.current?.focus() }, [step])
  useEffect(() => {
    if (!needsOtherDetails(values) && getValues('otherDescription')) setValue('otherDescription', '', { shouldDirty: true })
  }, [values.categoryKey, values.subcategoryNames, getValues, setValue])
  useEffect(() => {
    if (privateLocation && values.joinPolicy !== 'approval') setValue('joinPolicy', 'approval', { shouldDirty: true })
  }, [privateLocation, values.joinPolicy, setValue])
  useEffect(() => {
    if (step === 8 || existing || initial.restored || dirtyFields.endDate || dirtyFields.endTime || dirtyFields.endOccurrence) return
    const start = values.creationMode === 'now'
      ? { success: true as const, iso: new Date().toISOString() }
      : localToInstant(values.startDate, values.startTime, values.timeZone, values.startOccurrence)
    if (!start.success || !validTimezone(values.timeZone)) return
    const end = zonedFields(new Date(Date.parse(start.iso) + 3600000), values.timeZone)
    setValue('endDate', end.date); setValue('endTime', end.time); setValue('endOccurrence', end.occurrence)
  }, [step, values.creationMode, values.startDate, values.startTime, values.startOccurrence, values.timeZone, existing, initial.restored, dirtyFields.endDate, dirtyFields.endTime, dirtyFields.endOccurrence, setValue])

  function goTo(next: number) {
    setStep(next)
    setFurthest(previous => Math.max(previous, next))
  }
  async function next() {
    if (step === 5 && physical && privateLocation && !await trigger('publicAreaLabel')) {
      goTo(4)
      return
    }
    if (await trigger(STEP_FIELDS[step], { shouldFocus: true })) goTo(step + 1)
  }
  function resetOccurrence(endpoint: 'start' | 'end') {
    setValue(`${endpoint}Occurrence`, '', { shouldDirty: true })
    clearErrors([`${endpoint}Date`, `${endpoint}Time`, `${endpoint}Occurrence`])
  }
  function changeCategory(categoryKey: HostValues['categoryKey']) {
    if (categoryKey === values.categoryKey) return
    setValue('categoryKey', categoryKey, options)
    setValue('subcategoryNames', [], { shouldDirty: true })
    setValue('otherDescription', '', { shouldDirty: true })
    clearErrors(['subcategoryNames', 'otherDescription'])
  }
  function toggleSubcategory(subcategoryName: string) {
    const subcategoryNames = values.subcategoryNames.includes(subcategoryName) ? values.subcategoryNames.filter(item => item !== subcategoryName) : [...values.subcategoryNames, subcategoryName]
    setValue('subcategoryNames', subcategoryNames, options)
    if (!needsOtherDetails({ categoryKey: values.categoryKey, subcategoryNames })) {
      setValue('otherDescription', '', { shouldDirty: true })
      clearErrors('otherDescription')
    }
  }
  function changePrivacy(checked: boolean) {
    setValue('locationVisibility', checked ? 'private' : 'public', options)
    if (checked) setValue('joinPolicy', 'approval', options)
    if (checked && !privateLocation && physical) setValue('publicAreaLabel', '', { shouldDirty: true })
    clearErrors('publicAreaLabel')
  }
  function changePlaceMode(locationType: HostValues['locationType']) {
    if (locationType === values.locationType) return
    setValue('locationType', locationType, { shouldDirty: true })
    setValue('location', null, { shouldDirty: true })
    setValue('publicAreaLabel', '', { shouldDirty: true })
    setValue('meetingInstructions', '', { shouldDirty: true })
    setValue('meetingNotes', '', { shouldDirty: true })
    clearErrors(['location', 'publicAreaLabel', 'meetingInstructions', 'meetingNotes'])
    if (locationType === 'online') changePrivacy(true)
  }
  function saveDraft() {
    try {
      sessionStorage.setItem(draftKey, JSON.stringify({ values: getValues(), step, furthest }))
      notify(hostPageCopy.draftSaved)
      navigate(existing ? `/connect/${existing.id}/manage` : '/discover')
    } catch (error) {
      if (!(error instanceof DOMException)) throw error
      setDraftMessage(hostPageCopy.yourDraftCouldNotBeSavedKeepThisPage)
    }
  }
  function discardDraft() {
    try {
      sessionStorage.removeItem(draftKey)
      reset(defaultHostValues(existing))
      setRestored(false); setDraftMessage(hostPageCopy.savedDraftDiscarded); setFurthest(0); setStep(0)
    } catch (error) {
      if (!(error instanceof DOMException)) throw error
      setDraftMessage(hostPageCopy.yourDraftCouldNotBeDiscardedYourChangesHave)
    }
  }
  function preset(which: 'today' | 'tomorrow' | 'weekend') {
    if (!validTimezone(values.timeZone)) { setError('timeZone', { message: hostPageCopy.chooseAValidTimezoneBeforeUsingADateShortcut }); return }
    const now = new Date(), today = zonedFields(now, values.timeZone)
    let start = zonedFields(new Date(now.getTime() + 3600000), values.timeZone)
    if (which === 'today' && start.date !== today.date) {
      setError('startTime', { message: hostPageCopy.thereIsLessThanAnHourLeftTodayPick })
      return
    }
    if (which !== 'today') {
      const date = new Date(`${today.date}T12:00:00Z`)
      date.setUTCDate(date.getUTCDate() + (which === 'tomorrow' ? 1 : ((6 - date.getUTCDay() + 7) % 7 || 7)))
      start = { date: date.toISOString().slice(0, 10), time: '10:00', occurrence: '' }
    }
    setValue('creationMode', 'later', { shouldDirty: true })
    setValue('startDate', start.date, { shouldDirty: true }); setValue('startTime', start.time, { shouldDirty: true }); setValue('startOccurrence', start.occurrence, { shouldDirty: true })
    const instant = localToInstant(start.date, start.time, values.timeZone, start.occurrence)
    if (instant.success) {
      const end = zonedFields(new Date(Date.parse(instant.iso) + 3600000), values.timeZone)
      setValue('endDate', end.date, { shouldDirty: true }); setValue('endTime', end.time, { shouldDirty: true }); setValue('endOccurrence', end.occurrence, { shouldDirty: true })
    }
    void trigger(STEP_FIELDS[3])
  }
  function invalid(fields: FieldErrors<HostValues>) {
    const first = STEP_FIELDS.findIndex(names => names.some(name => fields[name]))
    if (first >= 0) goTo(first)
    notify(hostPageCopy.someDetailsNeedAttentionReviewTheHighlightedFieldsBefore)
  }
  function publish(data: HostValues) {
    if (publishing.current) return
    publishing.current = true
    const times = eventTimes(data, existing)
    const point = data.locationType === 'physical' ? data.location : null
    if (!times.start.success || !times.end.success || (data.locationType === 'physical' && !point?.confirmed)) {
      publishing.current = false
      setError('root', { message: hostPageCopy.theTimeOrMapPinIsNoLongerValid })
      return
    }
    const connect: HostingConnect = {
      ...existing,
      id: existing?.id ?? crypto.randomUUID(), categoryKey: data.categoryKey, subcategoryNames: data.subcategoryNames,
      title: data.title.trim(), description: data.description.trim(), whatToBring: data.whatToBring.trim(),
      otherDescription: needsOtherDetails(data) ? data.otherDescription.trim() : '',
      startsAt: times.start.iso, endsAt: times.end.iso, timeZone: data.timeZone,
      locationType: data.locationType, meetingNotes: data.locationType === 'physical' ? '' : data.meetingNotes.trim(),
      publicAreaLabel: connectArea(data),
      venueName: point ? point.label : data.locationType === 'online' ? hostPageCopy.online : hostPageCopy.placeToBeDecided,
      latitude: point?.latitude ?? null, longitude: point?.longitude ?? null,
      distanceKilometers: point ? getDistanceKilometers(32.0653, 34.7737, point.latitude, point.longitude) : null,
      meetingInstructions: point ? data.meetingInstructions.trim() : '', capacity: data.unlimited ? null : Number(data.capacity),
      attendees: existing?.attendees ?? [{ id: profile.id, name: profile.name, color: '#d9c7f0' }],
      joinRequests: existing?.joinRequests ?? [], waitlist: existing?.waitlist ?? [],
      hostId: profile.id, hostName: profile.name, hostRating: profile.rating, hostAttendanceRate: profile.attendanceRate,
      isHostVerified: profile.isVerified, hostedConnectCount: profile.hostedConnectCount,
      locationVisibility: data.locationVisibility, isGuestListPrivate: data.isGuestListPrivate, joinPolicy: data.joinPolicy,
      visibility: data.visibility, skillLevel: data.skillLevel, ageRestriction: data.ageRestriction, costType: data.costType,
      costAmount: data.costType === 'free' || data.costType === 'own' ? 0 : Number(data.costAmount),
      status: 'published', creationMode: data.creationMode,
    }
    const result = existing ? updateConnect(existing.id, connect) : publishConnect(connect)
    if (!result.success) {
      publishing.current = false
      setError('root', { message: result.message })
      return
    }
    const saved = useAppStore.getState().connects.find(item => item.id === connect.id)
    if (!saved) {
      publishing.current = false
      setError('root', { message: hostPageCopy.theSavedConnectCouldNotBeFoundYourForm })
      return
    }
    try {
      sessionStorage.removeItem(draftKey)
    } catch (error) {
      if (!(error instanceof DOMException)) throw error
      setDraftMessage(hostPageCopy.yourConnectWasSavedButItsOldDraftCould)
    }
    reset(defaultHostValues(saved))
    setPublished(saved)
    goTo(8)
  }
  const current = STEPS[Math.min(step, 7)]
  const fieldError = (name: keyof HostValues) => errors[name]?.message
  const reviewRows = [
    { label: hostPageCopy.category, value: `${category.name}: ${values.subcategoryNames.join(', ')}`, step: 0 },
    { label: hostPageCopy.theWords, value: hostPageCopy.editTheTitleAndDescriptionAbove, step: 2 },
    ...(needsOtherDetails(values) ? [{ label: hostPageCopy.otherActivity, value: values.otherDescription, step: 2 }] : []),
    { label: hostPageCopy.bringAlong, value: values.whatToBring || hostPageCopy.nothingSpecific, step: 2 },
    { label: hostPageCopy.when, value: `${values.creationMode === 'now' ? hostPageCopy.happeningNow : ''}${dateSummary} (${values.timeZone})`, step: 3 },
    { label: hostPageCopy.venue, value: placeLabel, step: 4 },
    ...(physical ? [
      ...(privateLocation ? [{ label: hostPageCopy.publicArea, value: connectArea(values), step: 4 }] : []),
      { label: hostPageCopy.meetingPoint, value: values.meetingInstructions || hostPageCopy.meetAtTheConfirmedPin, step: 4 },
    ] : [{ label: hostPageCopy.meetingDetails, value: values.meetingNotes || hostPageCopy.toBeDecided, step: 4 }]),
    { label: hostPageCopy.spots, value: capacitySummary, step: 5 },
    { label: hostPageCopy.whoCanSeeIt, value: values.visibility, step: 5 },
    { label: hostPageCopy.joining, value: values.joinPolicy === 'approval' ? hostPageCopy.youApproveEachRequest : hostPageCopy.instantJoining, step: 5 },
    { label: hostPageCopy.locationPrivacy, value: values.locationType === 'online' ? hostPageCopy.joiningDetailsAreSharedWithConfirmedAttendees : privateLocation ? hostPageCopy.meetingDetailsHiddenUntilApproval : hostPageCopy.meetingDetailsArePublic, step: 5 },
    { label: hostPageCopy.guestList, value: values.isGuestListPrivate ? hostPageCopy.onlyYouCanSeeTheNamesEveryoneElseSees : hostPageCopy.visibleToEveryoneWhoCanSeeThisConnect, step: 5 },
    { label: hostPageCopy.skillLevel, value: values.skillLevel, step: 6 },
    { label: hostPageCopy.ageRange, value: values.ageRestriction, step: 6 },
    { label: hostPageCopy.cost, value: hostCostLabel(values), step: 6 },
  ]

  return <div className={styles.hostPage}>
    <div className={styles.flowTools}><span>{existing ? hostPageCopy.editYourConnect : hostPageCopy.hostAConnect}</span><div className={styles.inline}>
      <span className={styles.help}>{step === 8 ? (existing ? hostPageCopy.changesSaved : hostPageCopy.published) : hostPageCopy.stepOf8(String(step + 1))}</span>
      {step < 8 && <Button onClick={saveDraft}>{hostPageCopy.saveAndClose}</Button>}
    </div></div>
    <nav aria-label={hostPageCopy.hostingProgress} className={styles.progress}><ol>{STEPS.map((item, index) => <li key={item.name}>
      <button type="button" className={index <= step ? styles.progressDone : ''} aria-current={step === index ? 'step' : undefined} disabled={step === 8 || index > furthest} onClick={() => goTo(index)}>
        <span className={styles.progressBar} /><span>{index + 1}{hostPageCopy.sentenceEndingWithSpace}{item.name}</span>
      </button>
    </li>)}</ol></nav>
    {draftMessage && <p className={`${styles.draftNotice} notice`} role="status">{draftMessage}</p>}
    {restored && step < 8 && <div className={`${styles.draftNotice} notice`}>{hostPageCopy.yourDraftIsReadyToContinue}<Button variant="ghost" onClick={discardDraft}>{hostPageCopy.discardSavedDraft}</Button></div>}
    <div className={styles.wizardGrid}>
      <div className={styles.wizardMain}>
        <div className={styles.kicker}>{step === 8 ? hostPageCopy.readyToConnect : hostPageCopy.step(String(step + 1), String(current.name))}</div>
        <h1 ref={heading} tabIndex={-1}>{step === 8 ? (existing ? hostPageCopy.changesSaved : hostPageCopy.published) : current.title}</h1>
        {step < 8 && <p className={styles.introduction}>{current.description}</p>}
        {step > 0 && step < 7 && <div className={styles.selectedCategory}><CategoryLabel category={values.categoryKey} /><span>{values.subcategoryNames.join(' / ') || hostPageCopy.chooseYourSubcategories}</span></div>}
        {step === 8 && published ? <div className={styles.published}>
          <div className={styles.publishedMark} aria-hidden="true">{hostPageCopy.checkmarkSymbol}</div>
          <h2>{existing ? hostPageCopy.theDetailsAreUpToDate : published.visibility === hostPageCopy.linkOnly ? hostPageCopy.readyForYourInvitedCircle : hostPageCopy.itSOnTheBoard}</h2>
          <p>{published.visibility === hostPageCopy.linkOnly ? hostPageCopy.yourConnectIsAvailableByLinkAndWillNot : hostPageCopy.yourConnectIsPublished} {published.joinPolicy === 'approval' ? hostPageCopy.youApproveEachRequestBeforeSomeoneJoins : hostPageCopy.peopleCanJoinStraightAwayWhileThereIsSpace}</p>
          <ShareInvite id={published.id} title={published.title} />
          <div className={styles.actions}><Link className={styles.darkLink} to={`/connect/${published.id}`}>{hostPageCopy.viewYourConnect}</Link><Button onClick={() => setInviting(true)}>{hostPageCopy.inviteFriends}</Button><Link className={styles.textLink} to={`/connect/${published.id}/manage`}>{hostPageCopy.manageYourConnect}</Link></div>
        </div> : <form noValidate onSubmit={event => { if (step !== 7) { event.preventDefault(); return }; void handleSubmit(publish, invalid)(event) }} onKeyDown={event => { if (event.key === 'Enter' && event.target instanceof HTMLInputElement) event.preventDefault() }}>
          {step === 0 && <fieldset className={styles.choices}>
            <legend className="srOnly">{hostPageCopy.chooseACategory}</legend><div className={styles.categoryGrid}>{CATEGORIES.map(categoryKey => <label key={categoryKey.key} className={`${styles.categoryCard} ${categoryKey.key === values.categoryKey ? styles.categorySelected : ''}`} style={{ '--category-color': categoryKey.primaryColor } as CSSProperties}>
              <input type="radio" name="category" value={categoryKey.key} checked={values.categoryKey === categoryKey.key} onChange={() => changeCategory(categoryKey.key)} />
              <span className={styles.categoryGlyph} aria-hidden="true">{categoryKey.glyph}</span><span>{categoryKey.name}</span>
            </label>)}</div>
          </fieldset>}
          {step === 1 && <fieldset className={styles.choices}>
            <legend className="srOnly">{hostPageCopy.subcategoriesFor}{category.name}{hostPageCopy.chooseAllThatFit}</legend>
            <div className={styles.pills}>{SUBCATEGORIES[values.categoryKey].map(subcategoryName => <label key={subcategoryName} className={`${styles.choice} ${values.subcategoryNames.includes(subcategoryName) ? styles.selected : ''}`}>
              <input type="checkbox" checked={values.subcategoryNames.includes(subcategoryName)} onChange={() => toggleSubcategory(subcategoryName)} /><span>{subcategoryName}</span>
            </label>)}</div>
            <p className={styles.help}>{values.subcategoryNames.length}{hostPageCopy.selectedYouCanChooseMoreThanOne}</p>
            {errors.subcategoryNames && <p className={styles.error} role="alert">{errors.subcategoryNames.message}</p>}
          </fieldset>}
          {step === 2 && <div className={styles.formStack}>
            <Field label={hostPageCopy.title} htmlFor="host-title" error={fieldError('title')} hint={hostPageCopy.sayWhatYouArePlanningAndWhoYouWould}><Input id="host-title" placeholder={hostPageCopy.giveYourConnectAClearTitle} maxLength={100} aria-invalid={!!errors.title} {...register('title')} /></Field>
            <Field label={hostPageCopy.descriptionOptional} htmlFor="host-description" error={fieldError('description')}><textarea id="host-description" rows={5} placeholder={hostPageCopy.whatShouldPeopleKnowBeforeJoining} maxLength={3000} aria-invalid={!!errors.description} {...register('description')} /></Field>
            <Field label={hostPageCopy.whatToBringOptional} htmlFor="host-bring" error={fieldError('whatToBring')}><Input id="host-bring" placeholder={hostPageCopy.anythingPeopleShouldBring} maxLength={500} {...register('whatToBring')} /></Field>
            {needsOtherDetails(values) && <Field label={hostPageCopy.describeYourOtherActivity} htmlFor="host-other" error={fieldError('otherDescription')} hint={hostPageCopy.tellPeopleWhatThisActivityIsThisDetailIs}><textarea id="host-other" rows={3} maxLength={500} aria-invalid={!!errors.otherDescription} {...register('otherDescription')} /></Field>}
          </div>}
          {step === 3 && <div className={styles.formStack}>
            <ChoiceGroup label={hostPageCopy.whenAreYouConnect} value={values.creationMode} options={[{ value: 'now', label: hostPageCopy.happeningNow2 }, { value: 'later', label: hostPageCopy.planForLater }]} onChange={value => setValue('creationMode', value, options)} />
            <Field label={hostPageCopy.timezone} htmlFor="host-timezone" error={fieldError('timeZone')} hint={hostPageCopy.datesAndTimesUseThisTimezone}><Input id="host-timezone" list="host-timezones" placeholder={hostPageCopy.europeLondon} {...register('timeZone', { onChange: () => { resetOccurrence('start'); resetOccurrence('end'); clearErrors('timeZone') } })} /><datalist id="host-timezones">{[hostPageCopy.asiaJerusalem, hostPageCopy.utcTimeZone, hostPageCopy.europeLondon, hostPageCopy.europeParis, hostPageCopy.americaNewYork, hostPageCopy.americaLosAngeles, hostPageCopy.asiaKolkata, hostPageCopy.australiaSydney].map(zone => <option key={zone} value={zone} />)}</datalist></Field>
            {values.creationMode === 'now' ? <p className={styles.help}>{existing?.creationMode === 'now' ? hostPageCopy.thisConnectHasAlreadyStartedChooseWhenItEnds : hostPageCopy.startsWhenYouPublishChooseAnEndTimeSo}</p> : <>
              <div className={styles.dateGrid}>
                <Field label={hostPageCopy.startDate} htmlFor="host-start-date" error={fieldError('startDate')}><Input type="date" id="host-start-date" {...register('startDate', { onChange: () => resetOccurrence('start') })} /></Field>
                <Field label={hostPageCopy.starts} htmlFor="host-start-time" error={fieldError('startTime')}><Input type="time" id="host-start-time" aria-invalid={!!errors.startTime} {...register('startTime', { onChange: () => resetOccurrence('start') })} /></Field>
              </div>
              {startRepeated && <div><ChoiceGroup label={hostPageCopy.startTimeOccurrence} value={values.startOccurrence} options={[{ value: 'first', label: hostPageCopy.firstOccurrence2 }, { value: 'second', label: hostPageCopy.secondOccurrence2 }]} onChange={value => setValue('startOccurrence', value, options)} hint={hostPageCopy.thisTimeHappensTwiceWhenTheClocksGoBack} />{errors.startOccurrence && <p className={styles.error} role="alert">{errors.startOccurrence.message}</p>}</div>}
              <div className={styles.pills}><Button onClick={() => preset('today')}>{hostPageCopy.laterToday}</Button><Button onClick={() => preset('tomorrow')}>{hostPageCopy.tomorrow}</Button><Button onClick={() => preset('weekend')}>{hostPageCopy.thisWeekend}</Button></div>
            </>}
            <div className={styles.dateGrid}>
              <Field label={hostPageCopy.endDate} htmlFor="host-end-date" error={fieldError('endDate')}><Input type="date" id="host-end-date" {...register('endDate', { onChange: () => resetOccurrence('end') })} /></Field>
              <Field label={hostPageCopy.ends} htmlFor="host-end-time" error={fieldError('endTime')}><Input type="time" id="host-end-time" aria-invalid={!!errors.endTime} {...register('endTime', { onChange: () => resetOccurrence('end') })} /></Field>
            </div>
            {endRepeated && <div><ChoiceGroup label={hostPageCopy.endTimeOccurrence} value={values.endOccurrence} options={[{ value: 'first', label: hostPageCopy.firstOccurrence2 }, { value: 'second', label: hostPageCopy.secondOccurrence2 }]} onChange={value => setValue('endOccurrence', value, options)} hint={hostPageCopy.thisTimeHappensTwiceWhenTheClocksGoBack} />{errors.endOccurrence && <p className={styles.error} role="alert">{errors.endOccurrence.message}</p>}</div>}
          </div>}
          {step === 4 && <div className={styles.formStack}>
            <ChoiceGroup label={hostPageCopy.whereWillItHappen} value={values.locationType} options={[{ value: 'physical', label: hostPageCopy.aPlace }, { value: 'online', label: hostPageCopy.online }, { value: 'undecided', label: hostPageCopy.toBeDecided }]} onChange={changePlaceMode} />
            {physical ? <><Controller control={control} name="location" render={({ field }) => <LocationPicker value={field.value} onChange={value => { field.onChange(value); void trigger('location') }} />} />
            {errors.location && <p className={styles.error} role="alert">{errors.location.message || hostPageCopy.chooseAndConfirmAValidLocation}</p>}
            <Field label={hostPageCopy.meetingPointAndInstructionsOptional} htmlFor="host-meeting" error={fieldError('meetingInstructions')}><textarea id="host-meeting" rows={3} placeholder={hostPageCopy.whereShouldPeopleMeetYou} maxLength={500} {...register('meetingInstructions')} /></Field>
            <Panel className={styles.controlPanel}><Toggle divider={false} checked={privateLocation} onChange={changePrivacy} label={hostPageCopy.hideTheExactAddressUntilYouApproveSomeone} hint={joiningExplanation(privateLocation, values.joinPolicy === hostPageCopy.approval, values.locationType)} />
              {privateLocation && <Field label={hostPageCopy.publicNeighbourhoodOrArea} htmlFor="host-area" error={fieldError('publicAreaLabel')} hint={hostPageCopy.shownInsteadOfYourExactAddressUseANeighbourhood}><Input id="host-area" placeholder={hostPageCopy.neighbourhoodOrArea} maxLength={100} {...register('publicAreaLabel')} /></Field>}
            </Panel>
            <div className={styles.safetyNote}><h2>{hostPageCopy.pickSomewherePublicForAFirstMeeting}</h2><p>{hostPageCopy.aParkGateACafeACourtEntranceIf}</p></div>
            </> : <Panel className={styles.controlPanel}>
              <h2>{values.locationType === 'online' ? hostPageCopy.thisOneHappensOnline : hostPageCopy.youWillDecideThePlaceLater}</h2>
              <p>{values.locationType === 'online' ? hostPageCopy.addJoiningDetailsForConfirmedAttendeesOrShareThem : hostPageCopy.yourConnectWillShowAsPlaceToBeDecided}</p>
              <Field label={values.locationType === hostPageCopy.online2 ? hostPageCopy.onlineJoiningDetailsOptional : hostPageCopy.meetingPlansOptional} htmlFor="host-place-note" error={fieldError('meetingNotes')}><Input id="host-place-note" placeholder={values.locationType === hostPageCopy.online2 ? hostPageCopy.aMeetingLinkOrJoiningInstructions : hostPageCopy.howYouWillChooseAPlaceToMeet} maxLength={500} {...register('meetingNotes')} /></Field>
              <Toggle checked={privateLocation} onChange={changePrivacy} label={hostPageCopy.keepMeetingDetailsPrivate} hint={joiningExplanation(privateLocation, values.joinPolicy === hostPageCopy.approval, values.locationType)} />
            </Panel>}
          </div>}
          {step === 5 && <div className={styles.formStack}>
            <Panel className={styles.controlPanel}>
              <div className={styles.panelHeading}><h2>{hostPageCopy.capacity}</h2><Badge>{values.unlimited ? hostPageCopy.noLimit : hostPageCopy.people(String(values.capacity || '?'))}</Badge></div>
              <Toggle divider={false} checked={values.unlimited} onChange={checked => setValue('unlimited', checked, options)} label={hostPageCopy.noCapacityLimit} />
              {!values.unlimited && <><Field label={hostPageCopy.totalPeopleIncludingYou} htmlFor="host-capacity" error={fieldError('capacity')}><Input type="number" min={Math.max(1, existing?.attendees.length ?? 1)} step={1} id="host-capacity" {...register('capacity')} /></Field>
                <label className="srOnly" htmlFor="host-capacity-range">{hostPageCopy.quickCapacitySelectorZeroMeansNoLimit}</label><input id="host-capacity-range" type="range" min={0} max={Math.max(30, Number(values.capacity) || 30)} value={Number(values.capacity) || 0} onChange={event => { if (event.target.value === '0') setValue('unlimited', true, options); else setValue('capacity', event.target.value, options) }} className={styles.capacityRange} /><p className={styles.help}>{hostPageCopy.slideToZeroForNoLimitOrTypeAny}</p></>}
            </Panel>
            <Panel className={styles.controlPanel}><ChoiceGroup label={hostPageCopy.whoCanSeeIt} value={values.visibility} options={[{ value: hostPageCopy.everyone, label: hostPageCopy.everyone }, { value: hostPageCopy.linkOnly, label: hostPageCopy.linkOnly }]} onChange={value => setValue('visibility', value, options)} hint={values.visibility === hostPageCopy.linkOnly ? hostPageCopy.notListedInDiscoverAnyoneWithTheLinkCan : hostPageCopy.listedInDiscoverForPeopleBrowsingNearby} /></Panel>
            <Panel className={`${styles.controlPanel} ${styles.joiningPanel}`}>
              <Toggle divider={false} checked={privateLocation} onChange={changePrivacy} label={hostPageCopy.keepMeetingDetailsPrivate} hint={hostPageCopy.privateDetailsRequireApproval} />
              <ChoiceGroup label={hostPageCopy.joining} value={values.joinPolicy} options={[{ value: 'instant', label: hostPageCopy.instantly, disabled: privateLocation }, { value: 'approval', label: hostPageCopy.approveRequests }]} onChange={value => setValue('joinPolicy', value, options)} hint={joiningHint} />
              {errors.joinPolicy && <p className={styles.error} role="alert">{errors.joinPolicy.message}</p>}
            </Panel>
            <Panel className={styles.controlPanel}><Toggle divider={false} checked={values.isGuestListPrivate} onChange={checked => setValue('isGuestListPrivate', checked, options)} label={hostPageCopy.keepTheGuestListPrivate} hint={hostPageCopy.onlyYouCanSeeTheNamesEveryoneElseSees} /></Panel>
          </div>}
          {step === 6 && <div className={styles.formStack}>
            <Panel className={styles.controlPanel}><ChoiceGroup label={hostPageCopy.skillLevel} value={values.skillLevel} options={SKILL_OPTIONS.map(value => ({ value, label: value }))} onChange={value => setValue('skillLevel', value, options)} hint={hostPageCopy.openToEveryoneUnlessTheActivityGenuinelyNeedsA} />{errors.skillLevel && <p role="alert" className={styles.error}>{errors.skillLevel.message}</p>}</Panel>
            <Panel className={styles.controlPanel}><ChoiceGroup label={hostPageCopy.ageRange} value={values.ageRestriction} options={[...AGE_OPTIONS, ...(values.ageRestriction === hostPageCopy.womenOnly ? [hostPageCopy.womenOnly] : [])].map(value => ({ value, label: value }))} onChange={value => setValue('ageRestriction', value, options)} hint={hostPageCopy.onlySetThisWhereItMattersSuchAsAn} />{errors.ageRestriction && <p role="alert" className={styles.error}>{errors.ageRestriction.message}</p>}</Panel>
            <Panel className={styles.controlPanel}><ChoiceGroup label={hostPageCopy.cost} value={values.costType} options={COST_OPTIONS} onChange={value => { setValue('costType', value, options); if (value === 'free' || value === 'own') { setValue('costAmount', '', { shouldDirty: true }); clearErrors('costAmount') } }} hint={hostPageCopy.freeUnlessYouSayOtherwiseSplitCostDividesThe} />
              {(values.costType === 'split' || values.costType === 'ticketed') && <Field label={values.costType === hostPageCopy.split ? hostPageCopy.totalToSplitILS : hostPageCopy.costPerPersonILS} htmlFor="host-cost" error={fieldError('costAmount')}><Input id="host-cost" type="number" min="0.01" max="1000000" step="0.01" placeholder={hostPageCopy.text200} {...register('costAmount')} /></Field>}
            </Panel>
          </div>}
          {step === 7 && <>
            <Panel className={styles.review}><div className={styles.reviewStripe}><CategoryLabel category={values.categoryKey} /><span>{values.subcategoryNames.join(' / ')}</span></div><div className={styles.reviewBody}>
              <h2>{values.title}</h2>{values.description.trim() && <p className={styles.multiline}>{values.description}</p>}
              <dl>{reviewRows.map(row => <div key={row.label} className={styles.reviewRow}><dt>{row.label}</dt><dd>{row.value}</dd><button type="button" aria-label={hostPageCopy.edit(String(row.label.toLowerCase()))} onClick={() => goTo(row.step)}>{hostPageCopy.edit2}</button></div>)}</dl>
            </div></Panel>
          </>}
          {errors.root && <p className={styles.error} role="alert">{errors.root.message}</p>}
          <div className={styles.wizardNav}>{step === 0 ? <Link className={styles.outlineLink} to={existing ? `/connect/${existing.id}/manage` : '/discover'}>{hostPageCopy.back}</Link> : <Button onClick={() => goTo(step - 1)}>{hostPageCopy.back}</Button>}
            {step < 7 ? <Button key="continue" variant="dark" onClick={event => { event.preventDefault(); void next() }} className={styles.continue}>{hostPageCopy.continue}<span aria-hidden="true">{hostPageCopy.forwardArrow}</span></Button> : <Button key="publish" type="submit" variant="dark" disabled={isSubmitting} className={styles.continue}>{isSubmitting ? hostPageCopy.saving : existing ? hostPageCopy.saveChanges : hostPageCopy.publishThisConnect}</Button>}
            {furthest === 7 && step < 7 && <Button variant="ghost" onClick={async () => { if (await trigger(STEP_FIELDS[step], { shouldFocus: true })) goTo(7) }}>{hostPageCopy.backToReview}</Button>}
          </div>
        </form>}
      </div>
      <aside className={styles.preview} aria-label={hostPageCopy.feedCard}><Panel className={styles.previewPanel}>
        <h2>{hostPageCopy.howItWillLookInTheFeed}</h2>
        <div className={styles.feedCard} style={{ borderLeftColor: category.primaryColor }}><CategoryLabel category={values.categoryKey} subcategoryName={values.subcategoryNames.join(' / ') || category.name} />
          <h3>{values.title || hostPageCopy.yourNextGoodPlanStartsHere}</h3>
          <p>{!physical ? placeLabel : privateLocation ? hostPageCopy.exactAddressHidden(String(values.publicAreaLabel || hostPageCopy.yourNeighbourhood)) : values.location?.label || hostPageCopy.chooseAPlaceToMeet}</p>
          <strong>{values.creationMode === 'now' ? hostPageCopy.happeningNow2 : time.start.success ? `${dayLabel(time.start.iso, values.timeZone)}, ${timeLabel(time.start.iso, values.timeZone)}` : hostPageCopy.chooseAStartTime}</strong>
          <div className={styles.previewBadges}><Badge>{capacitySummary}</Badge><Badge>{values.joinPolicy === 'approval' ? hostPageCopy.approval2 : hostPageCopy.instantJoin}</Badge>{values.visibility === hostPageCopy.linkOnly && <Badge>{hostPageCopy.linkOnly}</Badge>}<Badge>{hostCostLabel(values)}</Badge></div>
        </div>
        <p className={styles.previewNote}>{hostPageCopy.placeStartTimeAndSpotsAreWhatPeopleScan}</p>
        {values.visibility === hostPageCopy.linkOnly && <p className={styles.help}>{hostPageCopy.onlyPeopleWithTheLinkCanFindThisConnect}</p>}
      </Panel></aside>
    </div>
    {inviting && published && <Modal title={hostPageCopy.inviteFriends} onClose={() => setInviting(false)}><p>{hostPageCopy.shareThisLinkWithThePeopleYouWouldLike}</p><ShareInvite id={published.id} title={published.title} /><Button onClick={() => setInviting(false)}>{hostPageCopy.done}</Button></Modal>}
  </div>
}
