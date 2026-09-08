import { connectContent, fixturesCopy } from '../copies'
import { AVATAR_COLORS, CATEGORIES } from './catalog'
import type { Alert, Connect, Message, Person, Profile } from './types'

export const SAMPLE_PROFILE: Profile = {
  id: 'noa', name: fixturesCopy.noaBerkovich, username: fixturesCopy.noab, email: fixturesCopy.noaExampleCom,
  phoneNumber: fixturesCopy.text972542184409, gender: fixturesCopy.woman, birthDate: fixturesCopy.text19970418,
  biography: fixturesCopy.mostlyFootballSometimesCatanUsuallyTheOneWithThe,
  location: fixturesCopy.florentinTelAviv, interests: ['sports', 'gaming'],
  shareEmail: false, sharePhone: false, shareGender: false, shareAge: false,
  isVerified: true, rating: 4.9, hostedConnectCount: 24, attendanceRate: 97,
}
export const PERSONS: Person[] = connectContent.attendeeRoster.map((person, index) => ({
  id: index === 0 ? 'noa' : `person-${index}`, name: person.name, color: person.avatarBackgroundColor,
}))

export function createConnects(): Connect[] {
  const currentTime = Date.now()
  const connects: Connect[] = connectContent.connects.map((sourceConnect, index) => {
    const details = Object.entries(connectContent.detailsByConnectId).find(([connectId]) => connectId === String(sourceConnect.id))![1]
    const categoryKey = CATEGORIES.find(category => category.key === sourceConnect.categoryKey)!.key
    const startTime = new Date(currentTime + (index < 4 ? [120, 180, 40, 240][index] : (index - 2) * 24 * 60) * 60000)
    const durationHours = Number(sourceConnect.durationLabel.match(/(\d+)\s*h/)?.[1] ?? 0)
    const durationMinutes = Number(sourceConnect.durationLabel.match(/(\d+)\s*m/)?.[1] ?? 0)
    const hostId = index === 0 ? 'noa' : `host-${sourceConnect.id}`
    const host: Person = { id: hostId, name: sourceConnect.hostName, color: AVATAR_COLORS[index % AVATAR_COLORS.length] }
    const attendees = [host, ...Array.from({ length: sourceConnect.attendeeCount - 1 }, (_, attendeeIndex) => ({
      ...PERSONS[(attendeeIndex + 1) % PERSONS.length], id: `attendee-${sourceConnect.id}-${attendeeIndex}`,
    }))]
    const isLocationPrivate = !!sourceConnect.isLocationPrivate
    const subcategoryName = sourceConnect.subcategoryName === fixturesCopy.football ? fixturesCopy.footballSoccer
      : sourceConnect.subcategoryName === fixturesCopy.codingNight ? fixturesCopy.codingHackNight
      : sourceConnect.subcategoryName === fixturesCopy.playground ? fixturesCopy.playgroundMeetup
      : sourceConnect.subcategoryName
    return {
      id: String(sourceConnect.id), categoryKey, subcategoryNames: [subcategoryName],
      title: sourceConnect.title, description: details.description, whatToBring: details.whatToBring,
      startsAt: startTime.toISOString(),
      endsAt: new Date(startTime.getTime() + (durationHours * 60 + durationMinutes) * 60000).toISOString(),
      timeZone: fixturesCopy.asiaJerusalem, publicAreaLabel: sourceConnect.publicAreaLabel,
      // Private meetings expose only a generalized point in discovery.
      latitude: isLocationPrivate ? Math.round(sourceConnect.latitude * 100) / 100 : sourceConnect.latitude,
      longitude: isLocationPrivate ? Math.round(sourceConnect.longitude * 100) / 100 : sourceConnect.longitude,
      distanceKilometers: sourceConnect.distanceKilometers, venueName: details.venueName,
      meetingInstructions: details.meetingInstructions, capacity: sourceConnect.capacity, attendees,
      joinRequests: index === 0 ? connectContent.pendingRequests.map((request, requestIndex) => ({
        id: `request-${requestIndex}`, name: request.name, color: request.avatarBackgroundColor, note: request.note,
      })) : [],
      waitlist: [], hostId, hostName: sourceConnect.hostName, hostRating: sourceConnect.rating,
      hostAttendanceRate: sourceConnect.attendanceRate ?? 94,
      isHostVerified: !!sourceConnect.isVerified, hostedConnectCount: sourceConnect.hostedConnectCount,
      locationVisibility: isLocationPrivate ? 'private' : 'public', isGuestListPrivate: false,
      joinPolicy: sourceConnect.requiresApproval || isLocationPrivate ? 'approval' : 'instant', visibility: 'Everyone',
      skillLevel: sourceConnect.skillLevel ?? fixturesCopy.openToEveryone,
      ageRestriction: sourceConnect.participationRestriction ?? fixturesCopy.everyoneWelcome,
      costType: sourceConnect.costLabel.startsWith(fixturesCopy.split) ? 'split'
        : sourceConnect.costLabel.startsWith(fixturesCopy.ticketed) ? 'ticketed'
        : sourceConnect.costLabel.startsWith(fixturesCopy.pay) ? 'own' : 'free',
      costAmount: Number(sourceConnect.costLabel.match(/\d+/)?.[0] ?? 0)
        * (sourceConnect.costLabel.startsWith(fixturesCopy.split) ? (sourceConnect.capacity ?? sourceConnect.attendeeCount) : 1),
      status: 'published', creationMode: 'later',
    }
  })
  const currentPerson = { id: SAMPLE_PROFILE.id, name: SAMPLE_PROFILE.name, color: '#d9c7f0' }
  connects[4].attendees[1] = currentPerson
  connects[1].joinRequests.push({ ...currentPerson, note: fixturesCopy.happyToLearnTheRulesIsThereStillRoom })
  const pastConnect: Connect = {
    ...connects[4], id: 'past-1', title: fixturesCopy.sundayMorningRunAlongTheBeach,
    startsAt: new Date(currentTime - 3 * 86400000).toISOString(),
    endsAt: new Date(currentTime - 3 * 86400000 + 3600000).toISOString(),
    attendees: [connects[4].attendees[0], currentPerson], joinRequests: [], waitlist: [],
  }
  const cancelledConnect: Connect = {
    ...connects[0], id: 'cancelled-1', title: fixturesCopy.fiveASideRainedOff,
    startsAt: new Date(currentTime - 86400000).toISOString(),
    endsAt: new Date(currentTime - 86400000 + 5400000).toISOString(),
    status: 'cancelled', cancellationReason: fixturesCopy.thePitchFloodedWeWillTryAnotherDay,
    joinRequests: [], waitlist: [],
  }
  return [...connects, pastConnect, cancelledConnect]
}

export function createMessages(): Message[] {
  return [
    { id: 'message-1', connectId: '1', authorId: 'noa', authorName: fixturesCopy.noaBerkovich, text: fixturesCopy.meetingPointGateBesideTheTennisCourtsLookFor, isPinned: true },
    { id: 'message-2', connectId: '1', authorId: 'person-2', authorName: fixturesCopy.mayaAdler, text: fixturesCopy.iCanBringABallIfWeNeedAnother },
    { id: 'message-3', connectId: '1', authorId: 'person-3', authorName: fixturesCopy.talRavid, text: fixturesCopy.perfectSeeYouThereTenMinutesEarly },
    { id: 'message-4', connectId: '2', authorId: 'host-2', authorName: fixturesCopy.yonatanShalev, text: fixturesCopy.standardCatanTonightNewPlayersWelcome },
  ].map((message, index) => ({ ...message, sentAt: new Date(Date.now() - (30 - index * 5) * 60000).toISOString() }))
}

export function createAlerts(): Alert[] {
  const alerts: Pick<Alert, 'id' | 'kind' | 'title' | 'body' | 'connectId'>[] = [
    { id: 'alert-1', kind: 'request', title: fixturesCopy.threePeopleWantToJoin, body: fixturesCopy.ariRoniAndOmriRequestedASpotInYour, connectId: '1' },
    { id: 'alert-2', kind: 'reminder', title: fixturesCopy.yourConnectIsComingUp, body: fixturesCopy.fiveASideShortTwoPlayersBringADark, connectId: '1' },
    { id: 'alert-3', kind: 'message', title: fixturesCopy.mayaSentAMessage, body: fixturesCopy.iCanBringABallIfWeNeedAnother, connectId: '1' },
  ]
  return alerts.map((alert, index) => ({
    ...alert, isRead: false, createdAt: new Date(Date.now() - index * 3600000).toISOString(),
  }))
}
