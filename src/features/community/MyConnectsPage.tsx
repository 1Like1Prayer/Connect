import { myConnectsPageCopy } from '../../copies/index'
import { useId, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router'
import { Badge, Button, CategoryLabel, EmptyState, Modal, Panel } from '../../components/UI'
import { costLabel, dayLabel, isEnded, timeLabel } from '../../lib/format'
import { getAttendance, useAppStore } from '../../lib/store'
import type { Connect, Profile } from '../../lib/types'
import { downloadConnectCalendar } from './calendar'
import { useCommunityFeedback } from './feedback'
import { placeLabel } from './place'
import { categoryStyle, PageLink, Tabs, useCategoryColor } from './shared'
import styles from './Community.module.css'

type MineTab = 'Hosting' | 'Joined' | 'Invites' | 'Past'
type PreviewState = 'Loaded' | 'Loading' | 'Empty' | 'Error'
const tabs: MineTab[] = [myConnectsPageCopy.hosting, myConnectsPageCopy.joined, myConnectsPageCopy.invites, myConnectsPageCopy.past]
const previewStates: PreviewState[] = [myConnectsPageCopy.loaded, myConnectsPageCopy.loading, myConnectsPageCopy.empty, myConnectsPageCopy.error]
const ratingSchema = z.object({
  stars: z.number().int().min(1, myConnectsPageCopy.chooseARatingFrom1To5Stars).max(5),
  attendance: z.enum(['all', 'no-show'], { error: myConnectsPageCopy.chooseAnAttendanceOptionOrLeaveItUnanswered }).nullish(),
})
type RatingValues = z.infer<typeof ratingSchema>

function RatingForm({ connect, profile }: { connect: Connect; profile: Profile }) {
  const id = useId()
  const previous = useAppStore(applicationState => applicationState.ratingsByConnectId[connect.id])
  const previousAttendance = useCommunityFeedback(state => state.attendance[`${profile.id}:${connect.id}`])
  const [saved, setSaved] = useState(false)
  const { control, register, handleSubmit, watch, setError, formState: { errors, isSubmitting } } = useForm<RatingValues>({
    resolver: zodResolver(ratingSchema),
    defaultValues: { stars: previous ?? 0, attendance: previousAttendance ?? null },
  })
  const stars = watch('stars')
  const submit = handleSubmit(values => {
    const state = useAppStore.getState()
    const current = state.connects.find(currentConnect => currentConnect.id === connect.id)
    if (!current || current.status === 'cancelled' || !isEnded(current) || getAttendance(current, state.profile) !== 'joined' || current.hostId === state.profile?.id) {
      setError('root', { message: myConnectsPageCopy.onlyConfirmedAttendeesCanRateACompletedConnectHosted })
      return
    }
    state.rateConnect(current.id, values.stars)
    if (values.attendance) useCommunityFeedback.getState().saveAttendance(profile.id, current.id, values.attendance)
    setSaved(true)
  })
  return <Panel className={styles.ratingPanel}>
    <h2>{myConnectsPageCopy.howWas}{connect.title}{myConnectsPageCopy.textSeparator}</h2>
    <form onSubmit={submit} noValidate onChange={() => setSaved(false)}>
      <div className={styles.ratingHost}><Link to={`/profile/${connect.hostId}`}>{connect.hostName}</Link><span className="muted">{myConnectsPageCopy.host}</span></div>
      <fieldset className={styles.starFieldset} aria-describedby={errors.stars ? `${id}-rating-error` : undefined}>
        <legend>{myConnectsPageCopy.rateTheHost}</legend>
        <Controller control={control} name="stars" render={({ field }) => <div className={styles.stars}>
          {[1, 2, 3, 4, 5].map(value => <label className={styles.starChoice} key={value}>
            <input
              ref={value === 1 ? field.ref : undefined}
              type="radio"
              name={field.name}
              value={value}
              checked={field.value === value}
              onChange={() => { field.onChange(value); setSaved(false) }}
              onBlur={field.onBlur}
              aria-label={myConnectsPageCopy.separator5(String(value), String(value === 1 ? myConnectsPageCopy.star : myConnectsPageCopy.stars))}
            />
            <span aria-hidden="true" className={value <= stars ? styles.filledStar : ''}>{myConnectsPageCopy.starSymbol}</span>
          </label>)}
        </div>} />
        {errors.stars && <p id={`${id}-rating-error`} className={styles.formError} role="alert">{errors.stars.message}</p>}
      </fieldset>
      <fieldset className={styles.attendanceFieldset} aria-describedby={errors.attendance ? `${id}-attendance-error` : undefined}>
        <legend>{myConnectsPageCopy.everyoneShowedUp}<span className="muted">{myConnectsPageCopy.optional}</span></legend>
        <div className={styles.choiceRow}>
          <label className={styles.radioPill}><input type="radio" value="all" {...register('attendance')} /><span>{myConnectsPageCopy.yesEveryone}</span></label>
          <label className={styles.radioPill}><input type="radio" value="no-show" {...register('attendance')} /><span>{myConnectsPageCopy.someoneWasANoShow}</span></label>
        </div>
        {errors.attendance && <p id={`${id}-attendance-error`} className={styles.formError} role="alert">{errors.attendance.message}</p>}
      </fieldset>
      {errors.root && <p className={styles.formError} role="alert">{errors.root.message}</p>}
      <div className="row"><Button type="submit" variant="primary" disabled={isSubmitting}>{previous ? myConnectsPageCopy.updateRating : myConnectsPageCopy.saveRating}</Button>{saved && <span className={styles.savedMessage} role="status">{myConnectsPageCopy.feedbackSaved}</span>}</div>
    </form>
  </Panel>
}

function MineCard({ connect, tab, profile, onLeave, onRate }: {
  connect: Connect
  tab: MineTab
  profile: Profile
  onLeave: (connect: Connect) => void
  onRate: (id: string) => void
}) {
  const color = useCategoryColor(connect.categoryKey)
  const rating = useAppStore(applicationState => applicationState.ratingsByConnectId[connect.id])
  const attendance = getAttendance(connect, profile)
  const isHost = connect.hostId === profile.id
  const pendingRequestCount = connect.joinRequests.length
  const status = connect.status === 'cancelled' ? myConnectsPageCopy.cancelled
    : isEnded(connect) ? attendance === 'joined' || isHost ? myConnectsPageCopy.ended : myConnectsPageCopy.requestClosed
    : isHost ? pendingRequestCount ? myConnectsPageCopy.pendingRequestsLabel(pendingRequestCount) : myConnectsPageCopy.published
    : attendance === 'pending' ? myConnectsPageCopy.approvalPending
    : attendance === 'waitlist' ? myConnectsPageCopy.waitlist(String(connect.waitlist.findIndex(person => person.id === profile.id) + 1)) : myConnectsPageCopy.going
  const canRate = connect.status === 'published' && isEnded(connect) && attendance === 'joined' && !isHost
  const calendar = () => {
    const result = downloadConnectCalendar(connect, profile)
    if (!result.success) useAppStore.getState().notify(result.message)
  }
  return <article className={styles.mineCard} style={categoryStyle(color)}>
    <div className={styles.mineCardContent}>
      <div className={styles.cardLabels}><CategoryLabel category={connect.categoryKey} subcategoryName={connect.subcategoryNames.join(', ')} /><Badge active={isHost && pendingRequestCount > 0 && tab === myConnectsPageCopy.hosting}>{status}</Badge><Badge>{costLabel(connect)}</Badge>{connect.visibility === myConnectsPageCopy.linkOnly && <Badge>{myConnectsPageCopy.linkOnly}</Badge>}</div>
      <h2><Link to={`/connect/${connect.id}`}>{connect.title}</Link></h2>
      <p className={styles.eventMetadata}>{dayLabel(connect.startsAt, connect.timeZone)}{myConnectsPageCopy.commaSeparatorWithSpace}{timeLabel(connect.startsAt, connect.timeZone)} <span aria-hidden="true">{myConnectsPageCopy.middleDotSeparator}</span> {placeLabel(connect)} <span aria-hidden="true">{myConnectsPageCopy.middleDotSeparator}</span> {connect.attendees.length}{myConnectsPageCopy.going2}{connect.capacity !== null ? myConnectsPageCopy.spots(String(connect.capacity)) : ''}</p>
      {connect.status === 'cancelled' && connect.cancellationReason && <p className={styles.cancelReason}>{connect.cancellationReason}</p>}
      {attendance === 'pending' && !isEnded(connect) && <p className={styles.cardNote}>{myConnectsPageCopy.yourPlaceIsNotConfirmedYetTheHostNeeds}</p>}
      {attendance === 'waitlist' && !isEnded(connect) && <p className={styles.cardNote}>{myConnectsPageCopy.youAreWaitingForASpotBeingOnThe}</p>}
    </div>
    <div className={styles.cardActions}>
      {tab === myConnectsPageCopy.hosting && <>
        <PageLink to={`/connect/${connect.id}/manage`} primary>{pendingRequestCount ? myConnectsPageCopy.reviewRequests : myConnectsPageCopy.manageConnect}</PageLink>
        <PageLink to={`/connect/${connect.id}/edit`}>{myConnectsPageCopy.editConnect}</PageLink>
        <div className={styles.minorActions}><button type="button" onClick={calendar}>{myConnectsPageCopy.addToCalendar}</button><Link to={`/connect/${connect.id}/manage`}>{myConnectsPageCopy.cancel}</Link>{connect.visibility === myConnectsPageCopy.linkOnly && <Link to={`/connect/${connect.id}`}>{myConnectsPageCopy.openInviteLink}</Link>}</div>
      </>}
      {tab === myConnectsPageCopy.joined && <>
        <PageLink to={`/chats/${connect.id}`}>{myConnectsPageCopy.openChat}</PageLink>
        <Button onClick={calendar}>{myConnectsPageCopy.addToCalendar}</Button>
        <button type="button" className={styles.textButton} onClick={() => onLeave(connect)}>{myConnectsPageCopy.leaveConnect}</button>
      </>}
      {tab === myConnectsPageCopy.invites && <>
        <PageLink to={`/connect/${connect.id}`}>{connect.visibility === myConnectsPageCopy.linkOnly ? myConnectsPageCopy.viewInvitation : myConnectsPageCopy.viewRequest}</PageLink>
        <Button variant="ghost" onClick={() => onLeave(connect)}>{attendance === 'waitlist' ? myConnectsPageCopy.leaveWaitlist : myConnectsPageCopy.withdrawRequest}</Button>
      </>}
      {tab === myConnectsPageCopy.past && <>
        {canRate && <Button variant="primary" onClick={() => onRate(connect.id)}>{rating ? myConnectsPageCopy.yourRating5Edit(String(rating)) : myConnectsPageCopy.rateTheHost}</Button>}
        <PageLink to={`/connect/${connect.id}`}>{myConnectsPageCopy.viewConnect}</PageLink>
        {(attendance === 'joined' || isHost) && <Link className={styles.textButton} to={`/chats/${connect.id}`}>{myConnectsPageCopy.viewChatHistory}</Link>}
      </>}
    </div>
  </article>
}

function MineEmpty({ tab }: { tab: MineTab }) {
  const title = tab === myConnectsPageCopy.hosting ? myConnectsPageCopy.youHavenTHostedOneYet : tab === myConnectsPageCopy.joined ? myConnectsPageCopy.youHavenTJoinedAnythingYet : tab === myConnectsPageCopy.invites ? myConnectsPageCopy.noInvitesRightNow : myConnectsPageCopy.nothingInYourHistoryYet
  return <EmptyState title={title} action={<div className={styles.emptyActions}><PageLink to={tab === 'Hosting' ? '/host' : '/discover'} primary>{tab === myConnectsPageCopy.hosting ? myConnectsPageCopy.hostAConnect : myConnectsPageCopy.browseConnects}</PageLink>{tab === myConnectsPageCopy.hosting && <PageLink to="/discover">{myConnectsPageCopy.browseNearby}</PageLink>}</div>}>
    {tab === myConnectsPageCopy.hosting ? myConnectsPageCopy.pickATimeAndAPlaceThenBringPeople : tab === myConnectsPageCopy.invites ? myConnectsPageCopy.pendingRequestsAndWaitlistedConnectsAppearHereOpenA : tab === myConnectsPageCopy.past ? myConnectsPageCopy.completedAndCancelledConnectsYouTookPartInWill : myConnectsPageCopy.browseWhatIsOnNearbyOrPostTheThing}
  </EmptyState>
}

export function MyConnectsPage() {
  const profile = useAppStore(applicationState => applicationState.profile)
  const connects = useAppStore(applicationState => applicationState.connects)
  const [tab, setTab] = useState<MineTab>(myConnectsPageCopy.hosting)
  const [preview, setPreview] = useState<PreviewState>(myConnectsPageCopy.loaded)
  const [leaving, setLeaving] = useState<Connect | null>(null)
  const [leaveError, setLeaveError] = useState('')
  const [ratingId, setRatingId] = useState<string | null>(null)
  const panelId = useId()
  const related = connects.filter(connect => profile && (connect.hostId === profile.id || getAttendance(connect, profile)))
  const groups: Record<MineTab, Connect[]> = {
    Hosting: related.filter(connect => connect.hostId === profile?.id && connect.status === 'published' && !isEnded(connect)),
    Joined: related.filter(connect => connect.hostId !== profile?.id && getAttendance(connect, profile) === 'joined' && connect.status === 'published' && !isEnded(connect)),
    Invites: related.filter(connect => ['pending', 'waitlist'].includes(getAttendance(connect, profile) ?? '') && connect.status === 'published' && !isEnded(connect)),
    Past: related.filter(connect => connect.status === 'cancelled' || isEnded(connect)),
  }
  for (const name of tabs) groups[name].sort((firstConnect, secondConnect) => name === myConnectsPageCopy.past ? Date.parse(secondConnect.startsAt) - Date.parse(firstConnect.startsAt) : Date.parse(firstConnect.startsAt) - Date.parse(secondConnect.startsAt))
  const eligibleRatings = groups.Past.filter(connect => connect.status === 'published' && isEnded(connect) && connect.hostId !== profile?.id && getAttendance(connect, profile) === 'joined')
  const ratingConnect = eligibleRatings.find(connect => connect.id === ratingId) ?? eligibleRatings[0]
  const leave = () => {
    if (!leaving) return
    const result = useAppStore.getState().leaveConnect(leaving.id)
    if (result.success) setLeaving(null)
    else setLeaveError(result.message)
  }
  if (!profile) return <div className="page"><EmptyState title={myConnectsPageCopy.yourConnectsStartHere} action={<PageLink to="/signup" primary>{myConnectsPageCopy.createAProfile}</PageLink>}>{myConnectsPageCopy.createAProfileToHostJoinAndKeepTrack}</EmptyState></div>
  return <div className={`page ${styles.minePage}`}>
    <h1 className={styles.visuallyHidden}>{myConnectsPageCopy.myConnects}</h1>
    <div className={styles.mineToolbar}>
      <Tabs label={myConnectsPageCopy.myConnects} tabs={tabs.map(value => ({ value, label: value, count: groups[value].length }))} value={tab} onChange={setTab} panelId={panelId} />
      <button type="button" className={styles.stateButton} onClick={() => setPreview(previewStates[(previewStates.indexOf(preview) + 1) % previewStates.length])} title={myConnectsPageCopy.changeDisplayState}>{myConnectsPageCopy.state}{preview}</button>
    </div>
    {preview !== myConnectsPageCopy.loaded && <div className={styles.stateReset}><button type="button" className={styles.textButton} onClick={() => setPreview(myConnectsPageCopy.loaded)}>{myConnectsPageCopy.showMyConnects}</button></div>}
    <section id={panelId} role="tabpanel" aria-label={myConnectsPageCopy.connects(String(tab))} className={styles.minePanel}>
      {preview === myConnectsPageCopy.loading && <div className={styles.skeletonList} role="status" aria-label={myConnectsPageCopy.loadingConnects}><span className={styles.visuallyHidden}>{myConnectsPageCopy.loadingConnects}</span>{[0, 1, 2, 3].map(index => <div key={index} className={styles.skeletonCard} aria-hidden="true"><span /><span /><span /></div>)}</div>}
      {preview === myConnectsPageCopy.error && <div className={styles.errorPanel} role="alert"><h2>{myConnectsPageCopy.weCouldnTLoadYourConnects}</h2><p>{myConnectsPageCopy.tryAgainToLoadYourConnects}</p><Button variant="danger" onClick={() => setPreview(myConnectsPageCopy.loaded)}>{myConnectsPageCopy.tryAgain}</Button></div>}
      {(preview === myConnectsPageCopy.empty || preview === myConnectsPageCopy.loaded && groups[tab].length === 0) && <MineEmpty tab={tab} />}
      {preview === myConnectsPageCopy.loaded && groups[tab].length > 0 && <>
        <div className={styles.mineRows}>{groups[tab].map(connect => <MineCard key={connect.id} connect={connect} tab={tab} profile={profile} onLeave={item => { setLeaving(item); setLeaveError('') }} onRate={id => { setRatingId(id); window.setTimeout(() => document.getElementById('community-rating')?.scrollIntoView({ block: 'center' }), 0) }} />)}</div>
        {tab === myConnectsPageCopy.past && ratingConnect && <div id="community-rating"><RatingForm key={`${profile.id}:${ratingConnect.id}`} connect={ratingConnect} profile={profile} /></div>}
      </>}
    </section>
    {leaving && <Modal title={getAttendance(leaving, profile) === myConnectsPageCopy.pending ? myConnectsPageCopy.withdrawYourRequest : getAttendance(leaving, profile) === myConnectsPageCopy.waitlist2 ? myConnectsPageCopy.leaveTheWaitlist : myConnectsPageCopy.leaveThisConnect} onClose={() => setLeaving(null)}>
      <p><strong>{leaving.title}</strong></p>
      <p className="muted">{myConnectsPageCopy.yourPlaceOrRequestWillBeRemovedYouCan}</p>
      {leaveError && <p className={styles.formError} role="alert">{leaveError}</p>}
      <div className="row"><Button onClick={() => setLeaving(null)}>{myConnectsPageCopy.keepMyPlace}</Button><Button variant="danger" onClick={leave}>{myConnectsPageCopy.confirmLeave}</Button></div>
    </Modal>}
  </div>
}
