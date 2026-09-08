import { alertsPageCopy } from '../../copies/index'
import { useId, useState } from 'react'
import { Link } from 'react-router'
import { Button, EmptyState, Panel, Toggle } from '../../components/UI'
import { getCategory } from '../../lib/catalog'
import { getAttendance, useAppStore } from '../../lib/store'
import type { Alert, Connect, Profile } from '../../lib/types'
import { PageLink, relativeTime, Tabs, useCategoryColor } from './shared'
import styles from './Community.module.css'

function alertDestination(alert: Alert, connect: Connect | undefined, profile: Profile | null) {
  if (!connect) return null
  if (alert.kind === 'request' && connect.hostId === profile?.id) return { to: `/connect/${connect.id}/manage`, label: alertsPageCopy.reviewRequests }
  if (alert.kind === 'message' && getAttendance(connect, profile) === 'joined') return { to: `/chats/${connect.id}`, label: alertsPageCopy.openChat }
  return { to: `/connect/${connect.id}`, label: alert.kind === 'request' ? alertsPageCopy.viewRequest : alertsPageCopy.openConnect }
}

function AlertCard({ alert, connect, profile }: { alert: Alert; connect?: Connect; profile: Profile | null }) {
  const color = useCategoryColor(connect?.categoryKey ?? 'other')
  const markRead = useAppStore(applicationState => applicationState.markAlertRead)
  const destination = alertDestination(alert, connect, profile)
  const glyph = alert.kind === 'cancel' ? alertsPageCopy.closeSymbol : alert.kind === 'reminder' ? alertsPageCopy.textSeparator : alert.kind === 'join' ? alertsPageCopy.checkmarkSymbol : getCategory(connect?.categoryKey ?? 'other').glyph
  const canReadMessage = alert.kind !== 'message' || !!connect && getAttendance(connect, profile) === 'joined'
  return <article className={`${styles.alertCard} ${alert.isRead ? styles.readAlert : styles.unreadAlert}`}>
    <span className={styles.alertGlyph} style={{ background: color }} aria-hidden="true">{glyph}</span>
    <div className={styles.alertContent}>
      <h2>{!alert.isRead && <span className={styles.unreadDot} aria-label={alertsPageCopy.unread} />}{destination ? <Link to={destination.to} onClick={() => markRead(alert.id)}>{alert.title}</Link> : alert.title}</h2>
      <p>{canReadMessage ? alert.body : alertsPageCopy.groupMessagesAreOnlyVisibleToConfirmedAttendees}</p>
      <div className={styles.alertMeta}><time dateTime={alert.createdAt} title={new Date(alert.createdAt).toLocaleString()}>{relativeTime(alert.createdAt)}</time>{connect && <><span aria-hidden="true">{alertsPageCopy.middleDotSeparator}</span><span>{connect.title}</span></>}</div>
    </div>
    <div className={styles.alertActions}>
      {destination ? <PageLink to={destination.to} primary={!alert.isRead} onClick={() => markRead(alert.id)}>{destination.label}</PageLink> : alert.connectId && <span className={styles.unavailable}>{alertsPageCopy.connectNoLongerAvailable}</span>}
      {!alert.isRead && <button type="button" className={styles.textButton} aria-label={alertsPageCopy.markAsRead(String(alert.title))} onClick={() => markRead(alert.id)}>{alertsPageCopy.markAsRead2}</button>}
      {alert.isRead && <span className={styles.readLabel}>{alertsPageCopy.read}</span>}
    </div>
  </article>
}

export function AlertsPage() {
  const alerts = useAppStore(applicationState => applicationState.alerts)
  const connects = useAppStore(applicationState => applicationState.connects)
  const profile = useAppStore(applicationState => applicationState.profile)
  const preferences = useAppStore(applicationState => applicationState.notificationPreferences)
  const setPreferences = useAppStore(applicationState => applicationState.setNotificationPreferences)
  const markAll = useAppStore(applicationState => applicationState.markAllRead)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [savedPreference, setSavedPreference] = useState(false)
  const panelId = useId()
  const unread = alerts.filter(alert => !alert.isRead).length
  const visible = alerts.filter(alert => filter === 'all' || !alert.isRead).sort((firstNotification, secondNotification) => Date.parse(secondNotification.createdAt) - Date.parse(firstNotification.createdAt))
  const updatePreference = (changes: Partial<typeof preferences>) => {
    setPreferences(changes)
    setSavedPreference(true)
  }
  return <div className={`page ${styles.alertsPage}`}>
    <div className={styles.alertsHeading}><h1>{alertsPageCopy.notifications}</h1><Button variant="ghost" onClick={markAll} disabled={unread === 0}>{alertsPageCopy.markAllAsRead}</Button></div>
    <Tabs label={alertsPageCopy.notificationFilter} tabs={[{ value: 'all', label: alertsPageCopy.all, count: alerts.length }, { value: 'unread', label: alertsPageCopy.unread, count: unread }]} value={filter} onChange={setFilter} panelId={panelId} />
    <section id={panelId} role="tabpanel" aria-label={filter === alertsPageCopy.all2 ? alertsPageCopy.allNotifications : alertsPageCopy.unreadNotifications} className={styles.alertList}>
      {visible.map(alert => <AlertCard key={alert.id} alert={alert} connect={connects.find(connect => connect.id === alert.connectId)} profile={profile} />)}
      {visible.length === 0 && <EmptyState title={filter === alertsPageCopy.unread2 ? alertsPageCopy.youReAllCaughtUp : alertsPageCopy.nothingToReportYet} action={<PageLink to="/discover">{alertsPageCopy.browseConnects}</PageLink>}>{filter === 'unread' ? alertsPageCopy.youHaveNoUnreadNotificationsYourReadNotificationsAre : alertsPageCopy.updatesAboutYourConnectsWillAppearHere}</EmptyState>}
    </section>
    <Panel className={styles.preferences}>
      <h2>{alertsPageCopy.notificationPreferences}</h2>
      <p>{alertsPageCopy.chooseTheUpdatesThatMatterToYou}</p>
      <Toggle checked={preferences.email} onChange={email => updatePreference({ email })} label={alertsPageCopy.emailUpdates} hint={alertsPageCopy.emailVisibilityIsManagedInYourProfile} />
      <Toggle checked={preferences.reminders} onChange={reminders => updatePreference({ reminders })} label={alertsPageCopy.connectReminders} hint={alertsPageCopy.keepTrackOfUpcomingPlans} />
      <Toggle checked={preferences.messages} onChange={messages => updatePreference({ messages })} label={alertsPageCopy.groupChatUpdates} hint={alertsPageCopy.updatesAboutMessagesInConnectsYouHaveJoined} />
      {savedPreference && <p role="status" className={styles.savedMessage}>{alertsPageCopy.preferencesSaved}</p>}
    </Panel>
  </div>
}
