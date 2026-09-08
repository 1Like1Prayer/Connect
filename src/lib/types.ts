export type CategoryKey = 'sports' | 'gaming' | 'social' | 'outdoors' | 'arts' | 'learn' | 'wellness' | 'family' | 'other'
export interface Category {
  key: CategoryKey
  name: string
  glyph: string
  primaryColor: string
  alternateColor: string
}
export interface Profile {
  id: string
  name: string
  username: string
  email: string
  phoneNumber: string
  gender: string
  birthDate: string
  birthDateWithheld?: boolean
  biography: string
  location: string
  interests: CategoryKey[]
  shareEmail: boolean
  sharePhone: boolean
  shareGender: boolean
  shareAge: boolean
  avatarDataUrl?: string
  isVerified: boolean
  rating: number
  hostedConnectCount: number
  attendanceRate: number
}
export interface Person {
  id: string
  name: string
  color: string
}
export interface JoinRequest extends Person {
  note: string
}
export type Attendance = 'joined' | 'pending' | 'waitlist' | 'declined'
export type CostType = 'free' | 'split' | 'own' | 'ticketed'
export interface Connect {
  id: string
  categoryKey: CategoryKey
  subcategoryNames: string[]
  title: string
  description: string
  otherDescription?: string
  whatToBring: string
  startsAt: string
  endsAt: string
  timeZone: string
  publicAreaLabel: string
  latitude: number | null
  longitude: number | null
  distanceKilometers: number | null
  locationType?: 'physical' | 'online' | 'undecided'
  meetingNotes?: string
  venueName: string
  meetingInstructions: string
  capacity: number | null
  attendees: Person[]
  joinRequests: JoinRequest[]
  waitlist: Person[]
  hostId: string
  hostName: string
  hostRating: number
  hostAttendanceRate: number
  isHostVerified: boolean
  hostedConnectCount: number
  locationVisibility: 'public' | 'private'
  isGuestListPrivate: boolean
  joinPolicy: 'instant' | 'approval'
  visibility: 'Everyone' | 'Link only'
  skillLevel: string
  ageRestriction: string
  costType: CostType
  costAmount: number
  status: 'published' | 'cancelled'
  cancellationReason?: string
  creationMode: 'now' | 'later'
}
export interface Message {
  id: string
  connectId: string
  authorId: string
  authorName: string
  text: string
  sentAt: string
  isPinned?: boolean
}
export interface Alert {
  id: string
  title: string
  body: string
  connectId?: string
  isRead: boolean
  createdAt: string
  kind: 'join' | 'request' | 'reminder' | 'cancel' | 'message'
}
export interface ActionResult {
  success: boolean
  message: string
}
