import { calendarCopy } from '../../copies/index'
import type { ActionResult, Connect, Profile } from '../../lib/types'
import { placeDetails, placeLabel } from './place'

const calendarText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r?\n|\r/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,')
const calendarDate = (value: string) => new Date(value).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')

function foldLine(line: string) {
  const encoder = new TextEncoder()
  let result = ''
  let width = 0
  for (const character of line) {
    const bytes = encoder.encode(character).length
    if (width + bytes > 75) {
      result += '\r\n '
      width = 1
    }
    result += character
    width += bytes
  }
  return result
}

export function connectCalendar(connect: Connect, profile: Profile | null) {
  const location = [placeDetails(connect, profile), placeLabel(connect)].filter(Boolean).join(' - ')
  const description = [connect.description, connect.whatToBring ? calendarCopy.bring(String(connect.whatToBring)) : ''].filter(Boolean).join('\n\n')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    calendarCopy.pRODIDConnectCalendarEN,
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${calendarText(connect.id)}@connect`,
    `DTSTAMP:${calendarDate(new Date().toISOString())}`,
    `DTSTART:${calendarDate(connect.startsAt)}`,
    `DTEND:${calendarDate(connect.endsAt)}`,
    `SUMMARY:${calendarText(connect.title)}`,
    `DESCRIPTION:${calendarText(description)}`,
    `LOCATION:${calendarText(location)}`,
    `STATUS:${connect.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].map(foldLine).join('\r\n') + '\r\n'
}

export function downloadConnectCalendar(connect: Connect, profile: Profile | null): ActionResult {
  if (!Number.isFinite(Date.parse(connect.startsAt)) || !Number.isFinite(Date.parse(connect.endsAt))) {
    return { success: false, message: calendarCopy.thisConnectHasAnInvalidTimeAndCannotBe }
  }
  const blob = new Blob([connectCalendar(connect, profile)], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${connect.title.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 80) || 'connect'}.ics`
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  return { success: true, message: calendarCopy.calendarFileDownloaded }
}
