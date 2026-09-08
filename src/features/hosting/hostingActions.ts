import { hostingActionsCopy } from '../../copies/index'
import { isEnded } from '../../lib/format'
import { useAppStore } from '../../lib/store'
import type { ActionResult } from '../../lib/types'

export function removeConfirmedAttendee(id: string, userId: string): ActionResult {
  const state = useAppStore.getState()
  const connect = state.connects.find(item => item.id === id)
  const finish = (success: boolean, message: string) => {
    state.notify(message)
    return { success, message }
  }
  if (!connect || state.profile?.id !== connect.hostId) return finish(false, hostingActionsCopy.onlyTheHostCanRemoveSomeoneFromThisConnect)
  if (connect.status !== 'published' || isEnded(connect)) return finish(false, hostingActionsCopy.attendanceCannotBeChangedAfterCancellationOrTheEnd)
  if (userId === connect.hostId) return finish(false, hostingActionsCopy.theHostCannotBeRemovedCancelThisConnectInstead)
  const person = connect.attendees.find(item => item.id === userId)
  if (!person) return finish(false, hostingActionsCopy.thisPersonIsNoLongerOnTheConfirmedList)
  useAppStore.setState({
    connects: state.connects.map(item => item.id === id ? { ...item, attendees: item.attendees.filter(attendee => attendee.id !== userId) } : item),
  })
  return finish(true, hostingActionsCopy.wasRemovedFromTheGuestList(String(person.name)))
}
