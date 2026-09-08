import { storeCopy } from '../copies/index'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { getAgeFromBirthDate } from './catalog'
import { createAlerts, createConnects, createMessages, DEMO_PROFILE } from './fixtures'
import { getDistanceKilometers, hasMapPoint, isEnded } from './format'
import type { ActionResult, Alert, Attendance, Connect, Message, Profile } from './types'

export function getAttendance(connect: Connect, profile: Profile | null): Attendance | null {
  if (!profile) return null
  if (connect.attendees.some(person => person.id === profile.id)) return 'joined'
  if (connect.joinRequests.some(person => person.id === profile.id)) return 'pending'
  if (connect.waitlist.some(person => person.id === profile.id)) return 'waitlist'
  return null
}
export function eligibilityError(connect: Connect, profile: Profile): string | null {
  const age = profile.birthDateWithheld ? null : getAgeFromBirthDate(profile.birthDate)
  if (/\d/.test(connect.ageRestriction)) {
    const limits = connect.ageRestriction.match(/\d+/g)!.map(Number)
    if (age === null) return storeCopy.addYourBirthDateInYourProfileToJoin
    if (age < limits[0] || (limits.length > 1 && age > limits[1])) return storeCopy.yourAgeIsOutsideThisConnectSAgeRange
  }
  if (connect.ageRestriction === storeCopy.womenOnly && profile.gender !== storeCopy.woman) return storeCopy.thisConnectIsForWomenOnlyCheckYourProfile
  return null
}
interface AppState {
  profile: Profile | null
  connects: Connect[]
  messages: Message[]
  alerts: Alert[]
  blockedUserIds: string[]
  reports: { id: string; targetId: string; reason: string }[]
  ratingsByConnectId: Record<string, number>
  theme: 'light' | 'dark'
  layout: 'split' | 'board'
  cardStyle: 'row' | 'tile'
  palette: 'ink' | 'riso'
  defaultRadiusKilometers: number
  notificationPreferences: { email: boolean; reminders: boolean; messages: boolean }
  toast: { id: number; message: string } | null
  notify: (message: string) => void
  clearToast: () => void
  setTheme: (theme: 'light' | 'dark') => void
  setLayout: (layout: 'split' | 'board') => void
  setCardStyle: (style: 'row' | 'tile') => void
  setPalette: (palette: 'ink' | 'riso') => void
  setDefaultRadiusKilometers: (radiusKilometers: number) => void
  demoLogin: () => void
  completeSignup: (profile: Profile) => void
  updateProfile: (changes: Partial<Profile>) => void
  logout: () => void
  joinConnect: (id: string, note?: string) => ActionResult
  leaveConnect: (id: string) => ActionResult
  publishConnect: (connect: Connect) => ActionResult
  updateConnect: (id: string, changes: Partial<Connect>) => ActionResult
  cancelConnect: (id: string, reason: string) => ActionResult
  decideRequest: (id: string, userId: string, approve: boolean) => ActionResult
  sendMessage: (id: string, text: string) => ActionResult
  markAlertRead: (id: string) => void
  markAllRead: () => void
  setNotificationPreferences: (changes: Partial<AppState['notificationPreferences']>) => void
  blockUser: (id: string) => ActionResult
  unblockUser: (id: string) => void
  report: (targetId: string, reason: string) => void
  rateConnect: (id: string, rating: number) => void
}
const alertFor = (connect: Connect, kind: Alert['kind'], title: string, body: string): Alert => ({
  id: crypto.randomUUID(), connectId: connect.id, kind, title, body, isRead: false, createdAt: new Date().toISOString(),
})
function withPublicLocation(connect: Connect): Connect {
  if (!hasMapPoint(connect) || connect.locationVisibility !== 'private') return connect
  const latitude = Math.round(connect.latitude * 100) / 100, longitude = Math.round(connect.longitude * 100) / 100
  return { ...connect, latitude, longitude, distanceKilometers: getDistanceKilometers(32.0653, 34.7737, latitude, longitude) }
}
export const useAppStore = create<AppState>()(persist((set, get) => {
  const result = (success: boolean, message: string): ActionResult => {
    set({ toast: { id: Date.now(), message } })
    return { success, message }
  }
  const replace = (connect: Connect) => set(applicationState => ({ connects: applicationState.connects.map(item => item.id === connect.id ? connect : item) }))
  return {
    profile: null, connects: createConnects(), messages: createMessages(), alerts: createAlerts(),
    blockedUserIds: [], reports: [], ratingsByConnectId: {}, theme: 'light', layout: 'split', cardStyle: 'row', palette: 'ink', defaultRadiusKilometers: 5,
    notificationPreferences: { email: true, reminders: true, messages: true }, toast: null,
    notify: message => set({ toast: { id: Date.now(), message } }), clearToast: () => set({ toast: null }),
    setTheme: theme => set({ theme }), setLayout: layout => set({ layout }),
    setCardStyle: cardStyle => set({ cardStyle }), setPalette: palette => set({ palette }),
    setDefaultRadiusKilometers: radiusKilometers => {
      if (!Number.isFinite(radiusKilometers) || radiusKilometers < 1 || radiusKilometers > 100) { result(false, storeCopy.chooseADefaultRadiusFrom1To100Km); return }
      set({ defaultRadiusKilometers: radiusKilometers })
    },
    demoLogin: () => set({ profile: { ...DEMO_PROFILE } }),
    completeSignup: profile => set({ profile, blockedUserIds: [], reports: [], ratingsByConnectId: {}, alerts: [] }),
    updateProfile: changes => {
      const profile = get().profile
      if (!profile) { result(false, storeCopy.signInToEditYourProfile); return }
      const next = { ...profile, ...changes }
      if (changes.email !== undefined && changes.email !== profile.email) next.shareEmail = false
      if (changes.phoneNumber !== undefined && changes.phoneNumber !== profile.phoneNumber) next.sharePhone = false
      if (!next.phoneNumber) next.sharePhone = false
      if (!next.birthDate || next.birthDateWithheld) next.shareAge = false
      set(applicationState => ({ profile: next, connects: applicationState.connects.map(connect => ({
        ...connect, hostName: connect.hostId === next.id ? next.name : connect.hostName,
        attendees: connect.attendees.map(person => person.id === next.id ? { ...person, name: next.name } : person),
      })) }))
      result(true, storeCopy.profileSaved)
    },
    logout: () => set({ profile: null, alerts: [], blockedUserIds: [], reports: [], ratingsByConnectId: {}, toast: null }),
    joinConnect: (id, note = '') => {
      const { profile, connects, blockedUserIds } = get()
      const connect = connects.find(item => item.id === id)
      if (!profile) return result(false, storeCopy.signInToSaveYourSpot)
      if (!connect) return result(false, storeCopy.thisConnectIsNoLongerAvailable)
      if (connect.status !== 'published' || isEnded(connect)) return result(false, storeCopy.thisConnectIsNoLongerAcceptingPeople)
      if (blockedUserIds.includes(connect.hostId)) return result(false, storeCopy.unblockThisHostBeforeJoining)
      const error = eligibilityError(connect, profile)
      if (error) return result(false, error)
      if (getAttendance(connect, profile)) return result(true, storeCopy.youAreAlreadyOnTheList)
      const person = { id: profile.id, name: profile.name, color: '#d9c7f0' }
      const full = connect.capacity !== null && connect.attendees.length >= connect.capacity
      const state: Attendance = full ? 'waitlist' : connect.joinPolicy === 'approval' ? 'pending' : 'joined'
      replace({
        ...connect,
        attendees: state === 'joined' ? [...connect.attendees, person] : connect.attendees,
        joinRequests: state === 'pending' ? [...connect.joinRequests, { ...person, note }] : connect.joinRequests,
        waitlist: state === 'waitlist' ? [...connect.waitlist, person] : connect.waitlist,
      })
      set(applicationState => ({ alerts: [alertFor(connect, state === 'pending' ? 'request' : 'join', state === 'joined' ? storeCopy.youAreGoing : state === 'pending' ? storeCopy.requestSent : storeCopy.addedToTheWaitlist, connect.title), ...applicationState.alerts] }))
      return result(true, state === 'joined' ? storeCopy.youAreInFindThisConnectInMyConnects : state === 'pending' ? storeCopy.requestSentTheHostWillNeedToApproveYou : storeCopy.youAreOnTheWaitlistTheHostCanOffer)
    },
    leaveConnect: id => {
      const { profile, connects } = get(), connect = connects.find(item => item.id === id)
      if (!profile || !connect) return result(false, storeCopy.signInAndOpenAnExistingConnect)
      if (connect.hostId === profile.id) return result(false, storeCopy.hostsMustCancelTheirConnectInsteadOfLeaving)
      replace({ ...connect, attendees: connect.attendees.filter(person => person.id !== profile.id), joinRequests: connect.joinRequests.filter(person => person.id !== profile.id), waitlist: connect.waitlist.filter(person => person.id !== profile.id) })
      return result(true, storeCopy.youHaveLeftThisConnect)
    },
    publishConnect: connect => {
      const profile = get().profile
      if (!profile) return result(false, storeCopy.signInToHostAConnect)
      if (connect.hostId !== profile.id) return result(false, storeCopy.youCanOnlyPublishAsYourself)
      if (get().connects.some(currentConnect => currentConnect.id === connect.id)) return result(false, storeCopy.thisConnectHasAlreadyBeenPublished)
      if (!connect.attendees.some(person => person.id === profile.id)) return result(false, storeCopy.theHostMustBeIncludedInConfirmedAttendance)
      if (connect.capacity !== null && connect.capacity < connect.attendees.length) return result(false, storeCopy.capacityCannotBeLowerThanConfirmedAttendance)
      if (!Number.isFinite(Date.parse(connect.startsAt)) || !Number.isFinite(Date.parse(connect.endsAt)) || Date.parse(connect.endsAt) <= Date.parse(connect.startsAt)) return result(false, storeCopy.chooseAnEndTimeAfterTheStartTime)
      if (connect.locationVisibility === 'private' && connect.joinPolicy !== 'approval') return result(false, storeCopy.privateLocationsRequireHostApproval)
      set(applicationState => ({ connects: [withPublicLocation(connect), ...applicationState.connects] }))
      return result(true, storeCopy.yourConnectIsPublished)
    },
    updateConnect: (id, changes) => {
      const connect = get().connects.find(item => item.id === id)
      if (!connect || get().profile?.id !== connect.hostId) return result(false, storeCopy.onlyTheHostCanEditThisConnect)
      if (connect.status !== 'published' || isEnded(connect)) return result(false, storeCopy.thisConnectCanNoLongerBeEdited)
      if (changes.capacity != null && changes.capacity < connect.attendees.length) return result(false, storeCopy.capacityCannotBeLowerThanTheNumberOfConfirmed)
      const updated = { ...connect, ...changes, id: connect.id, hostId: connect.hostId, attendees: connect.attendees, joinRequests: connect.joinRequests, waitlist: connect.waitlist }
      if (Date.parse(updated.endsAt) <= Date.parse(updated.startsAt)) return result(false, storeCopy.chooseAnEndTimeAfterTheStartTime)
      if (updated.locationVisibility === 'private' && updated.joinPolicy !== 'approval') return result(false, storeCopy.privateLocationsRequireHostApproval)
      replace(withPublicLocation(updated))
      set(applicationState => ({ alerts: [alertFor(updated, 'reminder', storeCopy.connectUpdated, updated.title), ...applicationState.alerts] }))
      return result(true, storeCopy.changesSaved)
    },
    cancelConnect: (id, reason) => {
      const connect = get().connects.find(item => item.id === id)
      if (!connect || get().profile?.id !== connect.hostId) return result(false, storeCopy.onlyTheHostCanCancelThisConnect)
      if (connect.status === 'cancelled') return result(true, storeCopy.thisConnectIsAlreadyCancelled)
      replace({ ...connect, status: 'cancelled', cancellationReason: reason, joinRequests: [], waitlist: [] })
      set(applicationState => ({ alerts: [alertFor(connect, 'cancel', storeCopy.connectCancelled, reason || connect.title), ...applicationState.alerts] }))
      return result(true, storeCopy.connectCancelled2)
    },
    decideRequest: (id, userId, approve) => {
      const connect = get().connects.find(item => item.id === id)
      if (!connect || get().profile?.id !== connect.hostId) return result(false, storeCopy.onlyTheHostCanManageRequests)
      if (connect.status !== 'published' || isEnded(connect)) return result(false, storeCopy.thisConnectIsNoLongerAcceptingPeople)
      const person = [...connect.joinRequests, ...connect.waitlist].find(attendee => attendee.id === userId)
      if (!person) return result(false, storeCopy.thatRequestHasAlreadyBeenHandled)
      if (get().blockedUserIds.includes(userId)) return result(false, storeCopy.unblockThisMemberBeforeApprovingTheirRequest)
      if (approve && connect.capacity !== null && connect.attendees.length >= connect.capacity) return result(false, storeCopy.thisConnectIsFullIncreaseCapacityOrFreeA)
      replace({ ...connect, attendees: approve ? [...connect.attendees, person] : connect.attendees, joinRequests: connect.joinRequests.filter(attendee => attendee.id !== userId), waitlist: connect.waitlist.filter(attendee => attendee.id !== userId) })
      set(applicationState => ({ alerts: [alertFor(connect, 'join', approve ? storeCopy.requestApproved : storeCopy.requestDeclined, `${person.name}: ${connect.title}`), ...applicationState.alerts] }))
      return result(true, approve ? storeCopy.isOnTheList(String(person.name)) : storeCopy.requestDeclined2)
    },
    sendMessage: (id, text) => {
      const { profile, connects } = get(), connect = connects.find(item => item.id === id)
      if (!profile || !connect || getAttendance(connect, profile) !== 'joined') return result(false, storeCopy.joinThisConnectBeforeSendingAMessage)
      if (connect.status === 'cancelled' || isEnded(connect)) return result(false, storeCopy.thisChatIsReadOnlyBecauseTheConnectHas)
      if (!text.trim() || text.length > 2000) return result(false, storeCopy.writeAMessageBetween1And2000Characters)
      set(applicationState => ({ messages: [...applicationState.messages, { id: crypto.randomUUID(), connectId: id, authorId: profile.id, authorName: profile.name, text: text.trim(), sentAt: new Date().toISOString() }] }))
      return { success: true, message: storeCopy.messageSaved }
    },
    markAlertRead: id => set(applicationState => ({ alerts: applicationState.alerts.map(notification => notification.id === id ? { ...notification, isRead: true } : notification) })),
    markAllRead: () => set(applicationState => ({ alerts: applicationState.alerts.map(notification => ({ ...notification, isRead: true })) })),
    setNotificationPreferences: changes => set(applicationState => ({ notificationPreferences: { ...applicationState.notificationPreferences, ...changes } })),
    blockUser: id => {
      const profile = get().profile
      if (!profile || profile.id === id) return result(false, storeCopy.youCannotBlockThisProfile)
      set(applicationState => ({
        blockedUserIds: [...new Set([...applicationState.blockedUserIds, id])],
        connects: applicationState.connects.map(connect => connect.hostId === id ? { ...connect, attendees: connect.attendees.filter(person => person.id !== profile.id), joinRequests: connect.joinRequests.filter(person => person.id !== profile.id), waitlist: connect.waitlist.filter(person => person.id !== profile.id) } : connect.hostId === profile.id ? { ...connect, attendees: connect.attendees.filter(person => person.id !== id), joinRequests: connect.joinRequests.filter(person => person.id !== id), waitlist: connect.waitlist.filter(person => person.id !== id) } : connect),
      }))
      return result(true, storeCopy.userBlockedSharedAttendanceAndPrivateLocationAccessHave)
    },
    unblockUser: id => set(applicationState => ({ blockedUserIds: applicationState.blockedUserIds.filter(item => item !== id) })),
    report: (targetId, reason) => {
      if (!get().profile || !reason.trim()) { result(false, storeCopy.signInAndProvideAReportReason); return }
      set(applicationState => ({ reports: [...applicationState.reports, { id: crypto.randomUUID(), targetId, reason }] }))
      result(true, storeCopy.reportSaved)
    },
    rateConnect: (id, rating) => {
      const { profile, connects } = get(), connect = connects.find(item => item.id === id)
      if (!connect || connect.status !== 'published' || connect.hostId === profile?.id || !isEnded(connect) || getAttendance(connect, profile) !== 'joined' || !Number.isInteger(rating) || rating < 1 || rating > 5) { result(false, storeCopy.onlyAttendeesCanRateACompletedConnectHostedBy); return }
      set(applicationState => ({ ratingsByConnectId: { ...applicationState.ratingsByConnectId, [id]: rating } }))
      result(true, storeCopy.yourRatingHasBeenSaved)
    },
  }
}, {
  name: 'connect-state-v2', version: 2, storage: createJSONStorage(() => sessionStorage),
  partialize: ({ toast: _toast, ...state }) => state,
}))
