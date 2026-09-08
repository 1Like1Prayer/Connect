import { detailPageCopy } from '../../copies/index'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Avatar, Badge, Button, EmptyState, Field, ImagePlaceholder, Input, Modal, Panel } from '../../components/UI'
import { MapView } from '../../components/MapView'
import { getCategory } from '../../lib/catalog'
import { costLabel, dayLabel, distanceLabel, durationLabel, hasMapPoint, isEnded, spotsLabel, timeLabel } from '../../lib/format'
import { eligibilityError, getAttendance, useAppStore } from '../../lib/store'
import styles from './DetailPage.module.css'

const reportSchema = z.object({ reason: z.string().trim().min(5, detailPageCopy.pleaseDescribeTheProblemInAtLeast5Characters).max(1000) })
const requestSchema = z.object({ note: z.string().trim().max(500, detailPageCopy.keepYourNoteUnder500Characters) })
export function DetailPage() {
  const { id } = useParams(), navigate = useNavigate()
  const state = useAppStore(), connect = state.connects.find(item => item.id === id)
  const [dialog, setDialog] = useState<'guest' | 'request' | 'leave' | 'report' | 'block' | 'invite' | null>(null)
  const [hideRoster, setHideRoster] = useState(false)
  const reportForm = useForm({ resolver: zodResolver(reportSchema), defaultValues: { reason: '' } })
  const requestForm = useForm({ resolver: zodResolver(requestSchema), defaultValues: { note: '' } })
  if (!connect || state.blockedUserIds.includes(connect.hostId)) return <EmptyState title={detailPageCopy.thisConnectIsNotAvailable} action={<Button onClick={() => navigate('/discover')}>{detailPageCopy.backToDiscover}</Button>}>{detailPageCopy.itMayHaveBeenRemovedOrYouMayHave}</EmptyState>
  const attendance = getAttendance(connect, state.profile), isHost = state.profile?.id === connect.hostId
  const revealPlace = connect.locationVisibility === 'public' || isHost || attendance === 'joined'
  const ended = isEnded(connect), cancelled = connect.status === 'cancelled'
  const full = connect.capacity !== null && connect.attendees.length >= connect.capacity
  const eligibility = state.profile ? eligibilityError(connect, state.profile) : null
  const category = getCategory(connect.categoryKey)
  const shareUrl = `${window.location.origin}/connect/${connect.id}`
  const joinLabel = isHost ? detailPageCopy.manageYourConnect : cancelled ? detailPageCopy.thisConnectWasCancelled : ended ? detailPageCopy.thisConnectHasEnded : attendance === 'joined' ? detailPageCopy.youAreGoing : attendance === 'pending' ? detailPageCopy.withdrawRequest : attendance === 'waitlist' ? detailPageCopy.leaveWaitlist : eligibility ? detailPageCopy.checkYourProfileToJoin : full ? detailPageCopy.joinWaitlist : connect.joinPolicy === 'approval' ? detailPageCopy.requestToJoin : detailPageCopy.joinThisConnect
  const doJoin = () => {
    if (isHost) { navigate(`/connect/${connect.id}/manage`); return }
    if (!state.profile) { setDialog('guest'); return }
    if (eligibility) { state.notify(eligibility); navigate('/profile'); return }
    if (attendance) { setDialog('leave'); return }
    if (connect.joinPolicy === 'approval' && !full) { setDialog('request'); return }
    state.joinConnect(connect.id)
  }
  const share = async () => {
    if (!navigator.clipboard) { setDialog('invite'); return }
    try { await navigator.clipboard.writeText(shareUrl); state.notify(detailPageCopy.connectLinkCopied) }
    catch { setDialog('invite') }
  }
  return <>
    <div className={styles.subheader}><Button variant="ghost" onClick={() => navigate('/discover')}>{detailPageCopy.backArrow}{detailPageCopy.backToDiscover2}</Button><span className="grow" /><Button variant="ghost" onClick={() => setHideRoster(!hideRoster)}>{detailPageCopy.roster}{hideRoster || connect.isGuestListPrivate ? detailPageCopy.hidden : detailPageCopy.public}</Button><Badge>{cancelled ? detailPageCopy.cancelled : ended ? detailPageCopy.ended : full ? detailPageCopy.full : attendance === 'pending' ? detailPageCopy.requestPending : detailPageCopy.open}</Badge></div>
    <div className={styles.layout}>
      <div className={styles.content}>
        {cancelled && <div className={styles.cancelled} role="status"><b>{detailPageCopy.cancelledByTheHost}</b><p>{connect.cancellationReason || detailPageCopy.calledItOff(String(connect.hostName))}</p></div>}
        {ended && !cancelled && <div className="notice">{detailPageCopy.thisConnectHasEndedItRemainsInParticipantsHistory}</div>}
        <div className={styles.cover}><ImagePlaceholder label={detailPageCopy.coverPhoto(String(revealPlace ? connect.venueName : connect.publicAreaLabel))} /><span style={{ background: category.primaryColor }}>{category.glyph} {connect.subcategoryNames.join(' / ')}</span></div>
        <h1>{connect.title}</h1>
        <div className={styles.chips}><Badge>{dayLabel(connect.startsAt, connect.timeZone)}{detailPageCopy.commaSeparatorWithSpace}{timeLabel(connect.startsAt, connect.timeZone)}{detailPageCopy.textSeparator}{timeLabel(connect.endsAt, connect.timeZone)}</Badge><Badge>{connect.publicAreaLabel}{detailPageCopy.spacedMiddleDotSeparator}{distanceLabel(connect)} {connect.locationVisibility === 'private' && hasMapPoint(connect) && detailPageCopy.approx}</Badge><Badge>{connect.joinPolicy === 'approval' ? detailPageCopy.hostApproves : detailPageCopy.openToEveryone}</Badge><Badge>{connect.skillLevel}</Badge><Badge>{connect.ageRestriction}</Badge><Badge>{costLabel(connect)}</Badge></div>
        <p className={styles.description}>{connect.description}</p>
        {connect.otherDescription && <Panel><h3>{detailPageCopy.aboutThisActivity}</h3><p className={styles.body}>{connect.otherDescription}</p></Panel>}
        <div className="twoColumns"><Panel><h3>{detailPageCopy.whatToBring}</h3><p className={styles.body}>{connect.whatToBring || detailPageCopy.justYourselfCheckTheGroupChatForAnyUpdates}</p></Panel><Panel><h3>{detailPageCopy.cost}</h3><p className={styles.body}>{connect.costType === 'free' ? detailPageCopy.freeNothingToPayNothingToSortOutAfterwards : connect.costType === 'own' ? detailPageCopy.everyonePaysTheirOwnWayNoKittyNoSplitting : connect.costType === 'split' ? detailPageCopy.totalSplitBetweenWhoeverTurnsUpCurrentlyAboutEach(String(connect.costAmount), String(Math.ceil(connect.costAmount / Math.max(1, connect.attendees.length)))) : detailPageCopy.ticketedAtPerPersonPaidAtTheVenue(String(connect.costAmount))}</p></Panel></div>
        <section className={styles.location}>{hasMapPoint(connect) && <MapView compact connects={[connect]} center={{ latitude: connect.latitude, longitude: connect.longitude }} />}<div><h3>{connect.locationType === 'online' ? detailPageCopy.meetOnline : connect.locationType === 'undecided' ? detailPageCopy.meetingPlaceToBeDecided : revealPlace ? connect.venueName : detailPageCopy.approximateArea(String(connect.publicAreaLabel))}</h3><p>{revealPlace ? [connect.meetingNotes, connect.meetingInstructions].filter(Boolean).join('\n') : detailPageCopy.meetingDetailsAreSharedOnlyAfterTheHostApproves}</p><small className="muted">{detailPageCopy.timesAreShownIn}{connect.timeZone}{detailPageCopy.sentenceEnding}</small></div></section>
        <Panel><div className="pageHeading"><h3>{detailPageCopy.whoSComing}</h3><small className="muted">{spotsLabel(connect)}</small></div>{hideRoster || (connect.isGuestListPrivate && !isHost) ? <div className="notice"><strong>{connect.attendees.length}{detailPageCopy.peopleAreComing}</strong><p>{connect.hostName}{detailPageCopy.keepsThisListPrivateOnlyTheHostCanSee}</p></div> : <div className={styles.roster}>{connect.attendees.map(person => <Link key={person.id} to={`/profile/${person.id}`}><Avatar name={person.name} color={person.color} size={30} /><span><b>{person.name}</b><small>{person.id === connect.hostId ? detailPageCopy.host : detailPageCopy.going}</small></span></Link>)}</div>}</Panel>
        <div className={styles.safetyActions}><Button variant="ghost" onClick={() => setDialog(state.profile ? 'report' : 'guest')}>{detailPageCopy.reportThisConnect}</Button>{!isHost && <Button variant="ghost" onClick={() => setDialog(state.profile ? 'block' : 'guest')}>{detailPageCopy.blockTheHost}</Button>}</div>
      </div>
      <aside className={styles.sidebar}><div className={styles.sticky}>
        <Panel className={styles.joinPanel}><div className={styles.date}><strong>{dayLabel(connect.startsAt, connect.timeZone)}{detailPageCopy.commaSeparatorWithSpace}{timeLabel(connect.startsAt, connect.timeZone)}</strong><span>{durationLabel(connect)}</span></div><p className={styles.summary}>{detailPageCopy.ends}{timeLabel(connect.endsAt, connect.timeZone)}{detailPageCopy.spacedMiddleDotSeparator}{connect.publicAreaLabel}{detailPageCopy.spacedMiddleDotSeparator}{distanceLabel(connect)}</p><hr /><div className={styles.spots}><b>{spotsLabel(connect)}</b><div>{connect.attendees.slice(0, 3).map(person => <Avatar key={person.id} name={person.name} color={person.color} size={25} />)}</div></div><div className={styles.capacity} aria-label={detailPageCopy.ofSpotsFilled(String(connect.attendees.length), String(connect.capacity ?? detailPageCopy.unlimited))}><span style={{ width: `${connect.capacity ? Math.min(100, connect.attendees.length / connect.capacity * 100) : 62}%`, background: category.primaryColor }} /></div>
          {attendance === 'pending' && <div className="notice"><b>{detailPageCopy.requestSent}</b><p>{connect.hostName}{detailPageCopy.approvesEachRequestYouCanWithdrawWhileYouWait}</p></div>}
          {attendance === 'waitlist' && <div className="notice">{detailPageCopy.youAreOnTheWaitlistTheHostCanOffer}</div>}
          <Button className={styles.joinButton} variant={attendance === 'joined' || isHost ? 'primary' : 'dark'} disabled={!isHost && (cancelled || ended)} onClick={doJoin}>{joinLabel}</Button>
          <p className={styles.joinNote}>{eligibility || (isHost ? detailPageCopy.youAreTheHostManageAttendanceEditOrCancel : attendance === 'joined' ? detailPageCopy.theHostCanSeeYouAreComingYouCan : connect.joinPolicy === 'approval' ? detailPageCopy.theHostApprovesEachRequestBeforeTheExactPrivate : detailPageCopy.joiningIsInstantYouCanLeaveIfYourPlans)}</p>
          <div className={styles.joinActions}><Button onClick={() => navigate(`/chats/${connect.id}`)}>{detailPageCopy.groupChat}</Button><Button onClick={() => setDialog('invite')}>{detailPageCopy.inviteFriends}</Button></div><Button variant="ghost" className={styles.share} onClick={share}>{detailPageCopy.shareLink}</Button>
        </Panel>
        <Panel><div className="row"><Avatar name={connect.hostName} size={46} /><div><Link className={styles.hostName} to={`/profile/${connect.hostId}`}>{connect.hostName}</Link>{connect.isHostVerified && <div className={styles.verified}>{detailPageCopy.checkmarkSymbol}{detailPageCopy.verified}</div>}<small className="muted">{detailPageCopy.hostingSince2023}{connect.publicAreaLabel}</small></div></div><div className={styles.stats}><div><b>{detailPageCopy.starSymbol} {connect.hostRating}</b><span>{detailPageCopy.hostRating}</span></div><div><b>{connect.hostedConnectCount}</b><span>{detailPageCopy.hosted}</span></div><div><b>{connect.hostAttendanceRate}{detailPageCopy.textSeparator2}</b><span>{detailPageCopy.showUp}</span></div></div></Panel>
      </div></aside>
    </div>
    {dialog === 'guest' && <Modal title={detailPageCopy.saveYourSpot} onClose={() => setDialog(null)}><p>{detailPageCopy.signUpToLetTheHostKnowWhoTo}</p><Button variant="primary" onClick={() => navigate(`/signup?returnTo=${encodeURIComponent(`/connect/${connect.id}`)}`)}>{detailPageCopy.signUpAndJoin}</Button></Modal>}
    {dialog === 'request' && <Modal title={detailPageCopy.requestToJoin} onClose={() => setDialog(null)}><p>{detailPageCopy.aShortIntroductionHelps}{connect.hostName.split(' ')[0]}{detailPageCopy.putANameToTheRequest}</p><form onSubmit={requestForm.handleSubmit(values => { if (state.joinConnect(connect.id, values.note).success) { requestForm.reset(); setDialog(null) } })}><Field label={detailPageCopy.aNoteToTheHostOptional} htmlFor="join-note" error={requestForm.formState.errors.note?.message}><textarea id="join-note" {...requestForm.register('note')} placeholder={detailPageCopy.happyToBringABall} /></Field><Button type="submit" variant="primary">{detailPageCopy.sendRequest}</Button></form></Modal>}
    {dialog === 'leave' && <Modal title={attendance === detailPageCopy.pending ? detailPageCopy.withdrawYourRequest : attendance === detailPageCopy.waitlist ? detailPageCopy.leaveTheWaitlist : detailPageCopy.leaveThisConnect} onClose={() => setDialog(null)}><p>{detailPageCopy.yourSpotOrRequestWillBeRemovedYouCan}</p><div className="row"><Button variant="danger" onClick={() => { state.leaveConnect(connect.id); setDialog(null) }}>{detailPageCopy.yesLeave}</Button><Button onClick={() => setDialog(null)}>{detailPageCopy.stayOnTheList}</Button></div></Modal>}
    {dialog === 'report' && <Modal title={detailPageCopy.reportThisConnect} onClose={() => setDialog(null)}><form onSubmit={reportForm.handleSubmit(values => { state.report(connect.id, values.reason); reportForm.reset(); setDialog(null) })}><Field label={detailPageCopy.whatHappened} htmlFor="report-reason" error={reportForm.formState.errors.reason?.message}><textarea id="report-reason" {...reportForm.register('reason')} /></Field><Button variant="danger" type="submit">{detailPageCopy.saveReport}</Button></form></Modal>}
    {dialog === 'block' && <Modal title={detailPageCopy.block(String(connect.hostName))} onClose={() => setDialog(null)}><p>{detailPageCopy.youWonTSeeTheirConnectsAndYourAttendance}</p><div className="row"><Button variant="danger" onClick={() => { if (state.blockUser(connect.hostId).success) navigate('/discover') }}>{detailPageCopy.blockHost}</Button><Button onClick={() => setDialog(null)}>{detailPageCopy.keepConnected}</Button></div></Modal>}
    {dialog === 'invite' && <Modal title={detailPageCopy.inviteYourPeople} onClose={() => setDialog(null)}><p>{detailPageCopy.shareThisConnectWithAFriend}</p><Field label={detailPageCopy.connectLink} htmlFor="share-url"><Input id="share-url" value={shareUrl} readOnly onFocus={focusEvent => focusEvent.target.select()} /></Field><Button variant="primary" onClick={share}>{detailPageCopy.copyLink}</Button></Modal>}
  </>
}
