import { distanceLabel } from '../../lib/format'
import { getAttendance } from '../../lib/store'
import type { Connect, Profile } from '../../lib/types'

export const placeLabel = (connect: Connect) => connect.locationType && connect.locationType !== 'physical' ? distanceLabel(connect) : connect.publicAreaLabel

export function placeDetails(connect: Connect, profile: Profile | null) {
  const confirmed = profile?.id === connect.hostId || getAttendance(connect, profile) === 'joined'
  if (!confirmed && connect.locationVisibility === 'private') return null
  const details = connect.locationType && connect.locationType !== 'physical'
    ? [connect.meetingNotes]
    : [connect.venueName, connect.meetingInstructions, connect.meetingNotes]
  return details.filter(detail => detail?.trim()).join(' - ') || null
}
