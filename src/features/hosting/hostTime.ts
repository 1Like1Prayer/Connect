import { hostTimeCopy } from '../../copies/index'
export type Occurrence = '' | 'first' | 'second'

type TimeError = { success: false; kind: 'invalid' | 'nonexistent' | 'ambiguous'; message: string }
export type TimeResult = { success: true; iso: string } | TimeError
export type TimeCandidates = { success: true; instants: readonly string[] } | TimeError

const formatters = new Map<string, Intl.DateTimeFormat>()
const candidatesCache = new Map<string, TimeCandidates>()

function remember<T>(cache: Map<string, T>, key: string, value: T, limit: number) {
  if (cache.size >= limit) {
    const oldest = cache.keys().next().value
    if (oldest !== undefined) cache.delete(oldest)
  }
  cache.set(key, value)
  return value
}

function formatterFor(timeZone: string) {
  const cached = formatters.get(timeZone)
  if (cached) return cached
  return remember(formatters, timeZone, new Intl.DateTimeFormat('en-CA', {
    timeZone: timeZone, calendar: 'iso8601', numberingSystem: 'latn',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }), 16)
}

export function validTimezone(timeZone: string) {
  if (!timeZone.trim()) return false
  try {
    formatterFor(timeZone)
    return true
  } catch (error) {
    if (error instanceof RangeError) return false
    throw error
  }
}

function zonedParts(instant: number, formatter: Intl.DateTimeFormat) {
  const parts = formatter.formatToParts(instant)
  const part = (name: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === name)!.value
  return {
    date: `${part('year').padStart(4, '0')}-${part('month')}-${part('day')}`,
    time: `${part('hour')}:${part('minute')}`,
    second: part('second'),
  }
}

export function localTimeCandidates(date: string, time: string, timeZone: string): TimeCandidates {
  const key = JSON.stringify([date, time, timeZone])
  const cached = candidatesCache.get(key)
  if (cached) return cached
  if (!validTimezone(timeZone)) return { success: false, kind: 'invalid', message: hostTimeCopy.chooseAValidTimezone }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return { success: false, kind: 'invalid', message: hostTimeCopy.chooseACompleteDateAndTime }
  }
  const local = `${date}T${time}:00`
  const localAsUtc = Date.parse(`${local}Z`)
  if (!Number.isFinite(localAsUtc) || new Date(localAsUtc).toISOString().slice(0, 19) !== local) {
    return { success: false, kind: 'invalid', message: hostTimeCopy.chooseAValidCalendarDate }
  }
  const formatter = formatterFor(timeZone), offsets = new Set<number>()
  // Find offsets on both sides of nearby clock changes, then round-trip every candidate.
  for (let hours = -36; hours <= 36; hours++) {
    const probe = localAsUtc + hours * 3600000
    const parts = zonedParts(probe, formatter)
    const displayed = Date.parse(`${parts.date}T${parts.time}:${parts.second}Z`)
    if (Number.isFinite(displayed)) offsets.add(displayed - probe)
  }
  const matches = new Set<number>()
  for (const offset of offsets) {
    const candidate = localAsUtc - offset
    const parts = zonedParts(candidate, formatter)
    if (parts.date === date && parts.time === time && parts.second === '00') matches.add(candidate)
  }
  const instants = [...matches].sort((firstValue, secondValue) => firstValue - secondValue).map(instant => new Date(instant).toISOString())
  if (!instants.length) return remember<TimeCandidates>(candidatesCache, key, {
    success: false, kind: 'nonexistent', message: hostTimeCopy.thisTimeDoesNotExistInBecauseTheClocks(String(timeZone)),
  }, 128)
  if (instants.length > 2) return { success: false, kind: 'invalid', message: hostTimeCopy.thisLocalTimeCouldNotBeResolvedChooseAnother }
  return remember<TimeCandidates>(candidatesCache, key, { success: true, instants }, 128)
}

export function localToInstant(date: string, time: string, timeZone: string, occurrence: Occurrence = ''): TimeResult {
  const candidates = localTimeCandidates(date, time, timeZone)
  if (!candidates.success) return candidates
  if (candidates.instants.length > 1 && !occurrence) {
    return { success: false, kind: 'ambiguous', message: hostTimeCopy.thisTimeHappensTwiceChooseTheFirstOrSecond }
  }
  return { success: true, iso: candidates.instants[candidates.instants.length > 1 && occurrence === 'second' ? 1 : 0] }
}

export function zonedFields(instant: Date, timeZone: string): { date: string; time: string; occurrence: Occurrence } {
  const { date, time } = zonedParts(instant.getTime(), formatterFor(timeZone))
  const candidates = localTimeCandidates(date, time, timeZone)
  const minute = Math.floor(instant.getTime() / 60000) * 60000
  const occurrence = candidates.success && candidates.instants.length > 1
    ? Date.parse(candidates.instants[1]) === minute ? 'second' : 'first'
    : ''
  return { date, time, occurrence }
}
