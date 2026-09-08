import { managePageCopy } from '../../copies/index'
import { useId, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Link, useParams } from 'react-router'
import { Avatar, Badge, Button, CategoryLabel, EmptyState, Field, Modal, Panel, Toggle } from '../../components/UI'
import { dayLabel, isEnded, timeLabel } from '../../lib/format'
import { useAppStore } from '../../lib/store'
import type { Connect, Person } from '../../lib/types'
import { ChoiceGroup, ShareInvite } from './HostingUI'
import { joiningExplanation } from './hostSchema'
import { removeConfirmedAttendee } from './hostingActions'
import styles from './Hosting.module.css'

type RosterTab = 'going' | 'pending' | 'waitlist'
const ROSTER_TABS: { value: RosterTab; label: string }[] = [
  { value: managePageCopy.going, label: managePageCopy.going2 }, { value: 'pending', label: managePageCopy.pending }, { value: 'waitlist', label: managePageCopy.waitlist },
]

export function ManagePage() {
  const { id } = useParams()
  const profile = useAppStore(applicationState => applicationState.profile)
  const connect = useAppStore(applicationState => applicationState.connects.find(currentConnect => currentConnect.id === id))
  if (!profile) return <div className="pageNarrow"><EmptyState title={managePageCopy.signInToManageYourConnect} action={<Link to="/signup">{managePageCopy.createAProfile}</Link>}>{managePageCopy.onlyTheHostCanManageThisConnect}</EmptyState></div>
  if (!connect) return <div className="pageNarrow"><EmptyState title={managePageCopy.thisConnectCouldNotBeFound} action={<Link to="/mine">{managePageCopy.backToMyConnects}</Link>}>{managePageCopy.theLinkMayBeOutOfDate}</EmptyState></div>
  if (connect.hostId !== profile.id) return <div className="pageNarrow"><EmptyState title={managePageCopy.thisIsTheHostSSpace} action={<Link to={`/connect/${connect.id}`}>{managePageCopy.viewTheConnect}</Link>}>{managePageCopy.onlyTheHostCanSeeRequestsEditDetailsOr}</EmptyState></div>
  return <ManageContent key={connect.id} connect={connect} />
}

function ManageContent({ connect }: { connect: Connect }) {
  const updateConnect = useAppStore(applicationState => applicationState.updateConnect), decideRequest = useAppStore(applicationState => applicationState.decideRequest)
  const [tab, setTab] = useState<RosterTab>(connect.joinRequests.length ? 'pending' : managePageCopy.going)
  const [cancelOpen, setCancelOpen] = useState(false), [shareOpen, setShareOpen] = useState(false)
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [removing, setRemoving] = useState<Person | null>(null), [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]), tabsId = useId()
  const cancelled = connect.status === 'cancelled', ended = isEnded(connect), inactive = cancelled || ended
  const privateLocation = connect.locationVisibility === 'private'
  const physical = !connect.locationType || connect.locationType === 'physical'
  const full = connect.capacity !== null && connect.attendees.length >= connect.capacity
  const counts: Record<RosterTab, number> = { going: connect.attendees.length, pending: connect.joinRequests.length, waitlist: connect.waitlist.length }
  const people = tab === managePageCopy.going ? connect.attendees : tab === 'pending' ? connect.joinRequests : connect.waitlist
  function update(changes: Partial<Connect>) { setFeedback(updateConnect(connect.id, changes)) }
  function changePrivacy(checked: boolean) {
    if (checked && physical) {
      setPrivacyOpen(true)
      return
    }
    update({
      locationVisibility: checked ? 'private' : 'public',
      ...(checked ? { joinPolicy: 'approval' as const } : {}),
      ...(physical ? { publicAreaLabel: connect.venueName } : {}),
    })
  }
  function decide(person: Person, approve: boolean) {
    setFeedback(decideRequest(connect.id, person.id, approve))
  }
  function remove() {
    if (!removing) return
    const result = removeConfirmedAttendee(connect.id, removing.id)
    setFeedback(result)
    if (result.success) setRemoving(null)
  }

  return <div className={styles.managePage}>
    <div className={styles.manageToolbar}><Link className={styles.outlineLink} to="/mine">{managePageCopy.backArrow}{managePageCopy.myConnects}</Link><div className={styles.inline}><Badge active>{managePageCopy.youAreTheHost}</Badge><Link className={styles.outlineLink} to={`/connect/${connect.id}`}>{managePageCopy.viewPublicPage}</Link></div></div>
    <div className={styles.manageGrid}>
      <div className={styles.manageMain}>
        {cancelled && <div className={styles.cancelledBanner} role="status"><strong>{managePageCopy.cancelled}</strong><div>{managePageCopy.thisConnectIsNoLongerInDiscoverAndIs}{connect.cancellationReason && <p className={styles.multiline}>{managePageCopy.reason}{connect.cancellationReason}</p>}</div></div>}
        {!cancelled && ended && <p className="notice">{managePageCopy.thisConnectHasEndedItsGuestListIsA}</p>}
        <div className={styles.manageCategory}><CategoryLabel category={connect.categoryKey} subcategoryName={connect.subcategoryNames.join(' / ')} /></div>
        <h1>{connect.title}</h1>
        <p className={styles.manageMetadata}>{dayLabel(connect.startsAt, connect.timeZone)}{managePageCopy.commaSeparatorWithSpace}{timeLabel(connect.startsAt, connect.timeZone)}{managePageCopy.textSeparator}{dayLabel(connect.endsAt, connect.timeZone)}{managePageCopy.commaSeparatorWithSpace}{timeLabel(connect.endsAt, connect.timeZone)}{managePageCopy.textSeparator2}{connect.timeZone}{managePageCopy.textSeparator3}<br />{connect.venueName}{managePageCopy.textSeparator4}{connect.attendees.length}{managePageCopy.going3}{connect.capacity === null ? managePageCopy.noCapacityLimit : managePageCopy.totalSpots(String(connect.capacity))}</p>
        <div className={styles.manageSummary}>
          <div><strong>{connect.attendees.length}</strong><span>{managePageCopy.goingIncludingYou}</span></div><div><strong>{connect.joinRequests.length}</strong><span>{managePageCopy.requestsWaiting}</span></div><div><strong>{connect.waitlist.length}</strong><span>{managePageCopy.onTheWaitlist}</span></div>
        </div>
        {feedback && <p className={feedback.success ? styles.feedback : styles.error} role={feedback.success ? 'status' : 'alert'}>{feedback.message}</p>}
        {full && !inactive && <p className="notice">{managePageCopy.allSpotsAreFilledIncreaseCapacityIn}<Link className={styles.textLink} to={`/connect/${connect.id}/edit`}>{managePageCopy.editTheDetails}</Link>{managePageCopy.orRemoveAConfirmedGuestBeforeApprovingSomeoneElse}</p>}
        <div className={styles.rosterTabs} role="tablist" aria-label={managePageCopy.guestLists}>{ROSTER_TABS.map((item, index) => <button type="button" key={item.value} id={`${tabsId}-${item.value}`} role="tab" ref={element => { tabRefs.current[index] = element }} aria-controls={`${tabsId}-panel`} aria-selected={tab === item.value} tabIndex={tab === item.value ? 0 : -1} className={tab === item.value ? styles.activeTab : ''} onClick={() => setTab(item.value)} onKeyDown={event => {
          let next = index
          if (event.key === 'ArrowRight') next = (index + 1) % ROSTER_TABS.length
          else if (event.key === 'ArrowLeft') next = (index - 1 + ROSTER_TABS.length) % ROSTER_TABS.length
          else if (event.key === 'Home') next = 0
          else if (event.key === 'End') next = ROSTER_TABS.length - 1
          else return
          event.preventDefault(); setTab(ROSTER_TABS[next].value); tabRefs.current[next]?.focus()
        }}>{item.label}<span>{counts[item.value]}</span></button>)}</div>
        <section id={`${tabsId}-panel`} role="tabpanel" aria-labelledby={`${tabsId}-${tab}`} tabIndex={0} className={styles.rosterPanel}>
          <h2>{tab === 'pending' ? managePageCopy.requestsWaiting : tab === managePageCopy.going ? (cancelled ? managePageCopy.previouslyGoing : managePageCopy.thePeopleMakingItHappen) : managePageCopy.nextInLine}</h2>
          {tab === 'waitlist' && connect.waitlist.length > 0 && <p className={styles.help}>{managePageCopy.whenASpotOpensUpApproveSomeoneToMove}</p>}
          {!people.length ? <div className={styles.rosterEmpty}><h3>{tab === 'pending' ? managePageCopy.nothingWaitingOnYou : tab === 'waitlist' ? managePageCopy.noOneOnTheWaitlist : managePageCopy.noConfirmedAttendees}</h3><p>{inactive ? managePageCopy.thisConnectIsClosedSoNewRequestsAreNot : tab === 'pending' ? managePageCopy.newRequestsLandHereYouCanApproveOrDecline : tab === 'waitlist' ? managePageCopy.ifALimitedCapacityConnectFillsUpNewPeople : managePageCopy.theConfirmedGuestListWillAppearHere}</p></div>
            : <ul className={tab === 'going' ? styles.goingGrid : styles.requestList}>{people.map(person => <li key={person.id} className={tab === 'going' ? styles.goingPerson : styles.requestPerson}>
              <Avatar name={person.name} color={person.color} size={tab === managePageCopy.going ? 34 : 44} />
              <div className={styles.personInfo}><Link className={styles.personName} to={`/profile/${person.id}`}>{person.name}</Link><small>{person.id === connect.hostId ? managePageCopy.hostYou : tab === managePageCopy.going ? managePageCopy.confirmed : tab === 'pending' ? managePageCopy.wouldLikeToJoin : managePageCopy.waitingForASpot}</small>
                {tab === 'pending' && 'note' in person && typeof person.note === 'string' && person.note && <p className={styles.requestNote}>{person.note}</p>}
              </div>
              {tab === managePageCopy.going ? person.id !== connect.hostId && !inactive && <Button variant="ghost" onClick={() => setRemoving(person)} aria-label={managePageCopy.remove(String(person.name))}>{managePageCopy.remove2}</Button> : !inactive && <div className={styles.requestActions}><Button onClick={() => decide(person, false)} aria-label={managePageCopy.decline(String(person.name))}>{managePageCopy.decline2}</Button><Button variant="primary" onClick={() => decide(person, true)} aria-label={managePageCopy.approve(String(person.name))}>{tab === 'waitlist' ? managePageCopy.offerSpot : managePageCopy.approve2}</Button></div>}
            </li>)}</ul>}
        </section>
        <p className={styles.rosterPrivacy}>{connect.isGuestListPrivate ? managePageCopy.onlyYouCanSeeTheNamesEveryoneElseSees : managePageCopy.theConfirmedGuestListIsPublicPendingRequestsAnd}</p>
      </div>
      <aside className={styles.manageSidebar} aria-label={managePageCopy.hostControls}>
        <Panel className={styles.controlPanel}><h2>{managePageCopy.hostControls}</h2><div className={styles.controlLinks}>
          {!inactive ? <Link className={styles.outlineLink} to={`/connect/${connect.id}/edit`}>{managePageCopy.editTheDetails}</Link> : <p className={styles.help}>{managePageCopy.detailsAreReadOnlyFor}{cancelled ? 'cancelled' : 'ended'}{managePageCopy.connects}</p>}
          <Link className={styles.outlineLink} to={`/chats/${connect.id}`}>{inactive ? managePageCopy.viewGroupConversation : managePageCopy.messageEveryone}</Link><Button onClick={() => setShareOpen(true)}>{managePageCopy.shareLink}</Button>
        </div></Panel>
        <Panel className={styles.controlPanel}><div className={styles.panelHeading}><h2>{managePageCopy.capacity}</h2><Badge>{connect.capacity === null ? managePageCopy.noLimit : full ? managePageCopy.full : managePageCopy.spotsLeft(String(Math.max(0, connect.capacity - connect.attendees.length)))}</Badge></div>
          <p>{connect.attendees.length}{managePageCopy.going3}{connect.capacity !== null && managePageCopy.outOf(String(connect.capacity))}{managePageCopy.includingYou}</p>
          {connect.capacity !== null && <meter className={styles.capacityMeter} min={0} max={Math.max(1, connect.capacity)} value={connect.attendees.length} aria-label={managePageCopy.ofSpotsFilled(String(connect.attendees.length), String(connect.capacity))} />}
          {!inactive && <Link className={styles.textLink} to={`/connect/${connect.id}/edit`}>{managePageCopy.changeCapacity}</Link>}
        </Panel>
        <Panel className={styles.controlPanel}><ChoiceGroup label={managePageCopy.whoCanJoin} value={connect.joinPolicy} disabled={inactive} options={[{ value: 'instant', label: managePageCopy.instantly, disabled: privateLocation }, { value: 'approval', label: managePageCopy.approveRequests }]} onChange={value => update({ joinPolicy: value })} hint={joiningExplanation(privateLocation, connect.joinPolicy === managePageCopy.approval, connect.locationType)} />
          <hr /><Toggle checked={privateLocation || privacyOpen} disabled={inactive} onChange={changePrivacy} label={physical ? managePageCopy.hideTheExactAddress : managePageCopy.keepMeetingDetailsPrivate} hint={privateLocation ? managePageCopy.onlyConfirmedAttendeesCanSeeTheMeetingDetailsTurning : connect.locationType === managePageCopy.online ? managePageCopy.joiningDetailsAreAvailableToConfirmedAttendees : managePageCopy.meetingDetailsAreVisibleToEveryoneWhoCanOpen} />
          <hr /><Toggle checked={connect.isGuestListPrivate} disabled={inactive} onChange={checked => update({ isGuestListPrivate: checked })} label={managePageCopy.privateGuestList} hint={managePageCopy.onlyYouCanSeeTheNamesEveryoneElseSees} />
          <hr /><ChoiceGroup label={managePageCopy.whoCanSeeIt} value={connect.visibility} disabled={inactive} options={[{ value: managePageCopy.everyone, label: managePageCopy.everyone }, { value: managePageCopy.linkOnly, label: managePageCopy.linkOnly }]} onChange={value => update({ visibility: value })} hint={connect.visibility === managePageCopy.linkOnly ? managePageCopy.hiddenFromDiscoverAnyoneWithTheLinkCanOpen : managePageCopy.listedInDiscoverWhileItIsActive} />
        </Panel>
        <Panel className={`${styles.controlPanel} ${styles.dangerPanel}`}><h2>{managePageCopy.cancelThisConnect}</h2><p>{cancelled ? managePageCopy.thisConnectIsCancelled : ended ? managePageCopy.thisConnectHasAlreadyEnded : managePageCopy.itWillNoLongerAppearInDiscoverOrAccept}</p><Button variant="danger" disabled={inactive} onClick={() => setCancelOpen(true)}>{cancelled ? managePageCopy.cancelled : ended ? managePageCopy.alreadyEnded : managePageCopy.cancelThisConnect}</Button></Panel>
      </aside>
    </div>
    {shareOpen && <Modal title={managePageCopy.shareYourConnect} onClose={() => setShareOpen(false)}><ShareInvite id={connect.id} title={connect.title} /><Button onClick={() => setShareOpen(false)}>{managePageCopy.done}</Button></Modal>}
    {privacyOpen && <LocationPrivacyDialog connect={connect} onClose={() => setPrivacyOpen(false)} onSuccess={message => { setFeedback({ success: true, message }); setPrivacyOpen(false) }} />}
    {cancelOpen && <CancelDialog connect={connect} onClose={() => setCancelOpen(false)} onSuccess={message => { setFeedback({ success: true, message }); setCancelOpen(false) }} />}
    {removing && <Modal title={managePageCopy.remove3(String(removing.name))} onClose={() => setRemoving(null)}><p>{managePageCopy.theyWillLoseTheirConfirmedSpotAndAccessTo}</p>{feedback && !feedback.success && <p role="alert" className={styles.error}>{feedback.message}</p>}<div className={styles.actions}><Button onClick={() => setRemoving(null)}>{managePageCopy.keepOnTheList}</Button><Button variant="danger" onClick={remove}>{managePageCopy.removeGuest}</Button></div></Modal>}
  </div>
}

const cancelSchema = z.object({ reason: z.string().trim().max(500, managePageCopy.keepTheReasonTo500CharactersOrFewer) })
const locationPrivacySchema = z.object({ publicAreaLabel: z.string().trim().min(2, managePageCopy.enterANeighbourhoodOrArea).max(100, managePageCopy.keepTheAreaTo100CharactersOrFewer) })

function LocationPrivacyDialog({ connect, onClose, onSuccess }: { connect: Connect; onClose: () => void; onSuccess: (message: string) => void }) {
  const updateConnect = useAppStore(applicationState => applicationState.updateConnect)
  const areaId = useId()
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(locationPrivacySchema), defaultValues: { publicAreaLabel: '' },
  })
  return <Modal title={managePageCopy.hideTheExactAddress} onClose={onClose}>
    <p>{managePageCopy.chooseTheNeighbourhoodPeopleCanSeeBeforeYouApprove}</p>
    <form noValidate onSubmit={handleSubmit(({ publicAreaLabel }) => {
      const result = updateConnect(connect.id, { locationVisibility: 'private', joinPolicy: 'approval', publicAreaLabel })
      if (result.success) onSuccess(result.message)
      else setError('root', { message: result.message })
    })}>
      <Field label={managePageCopy.publicNeighbourhoodOrArea} htmlFor={areaId} error={errors.publicAreaLabel?.message} hint={managePageCopy.useANeighbourhoodNotAStreetAddress}><input id={areaId} maxLength={100} autoComplete="off" {...register('publicAreaLabel')} /></Field>
      {errors.root && <p className={styles.error} role="alert">{errors.root.message}</p>}
      <div className={styles.actions}><Button onClick={onClose}>{managePageCopy.keepCurrentVisibility}</Button><Button type="submit" variant="dark" disabled={isSubmitting}>{managePageCopy.hideExactAddress}</Button></div>
    </form>
  </Modal>
}

function CancelDialog({ connect, onClose, onSuccess }: { connect: Connect; onClose: () => void; onSuccess: (message: string) => void }) {
  const cancelConnect = useAppStore(applicationState => applicationState.cancelConnect)
  const reasonId = useId()
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({
    resolver: zodResolver(cancelSchema), defaultValues: { reason: '' },
  })
  return <Modal title={managePageCopy.cancelThisConnect2} onClose={onClose}>
    <p><strong>{Math.max(0, connect.attendees.length - 1)} {connect.attendees.length === 2 ? managePageCopy.guestIs : managePageCopy.guestsAre}{managePageCopy.countingOnThis}</strong>{managePageCopy.thisConnectWillNoLongerAppearInDiscoverOr}</p>
    <form noValidate onSubmit={handleSubmit(({ reason }) => { const result = cancelConnect(connect.id, reason); if (result.success) onSuccess(result.message); else setError('root', { message: result.message }) })}>
      <Field label={managePageCopy.reasonOptional} htmlFor={reasonId} error={errors.reason?.message} hint={managePageCopy.addAReasonPeopleCanReadOnTheConnect}><textarea id={reasonId} rows={3} placeholder={managePageCopy.whyAreYouCancelling} maxLength={500} {...register('reason')} /></Field>
      {errors.root && <p className={styles.error} role="alert">{errors.root.message}</p>}
      <div className={styles.actions}><Button onClick={onClose}>{managePageCopy.keepThisConnect}</Button><Button variant="danger" type="submit" disabled={isSubmitting}>{isSubmitting ? managePageCopy.cancelling : managePageCopy.yesCancelIt}</Button></div>
    </form>
  </Modal>
}
